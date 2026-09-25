import { prisma } from "@/lib/prisma";
import { placePanelOrder, placeOrderWithFallback, classifyError, getPanelServices, getPanelBalance } from "@/lib/delivery/panel-client";
import { calculateEngagementDue, applyJitter } from "@/lib/delivery/curve";
import { checkAndRefillOrder } from "@/lib/delivery/refill";
import { triggerMidwayRefund } from "@/lib/delivery/refund";

type ServiceIds = Record<string, Record<string, string>>;



function getSvcId(ids: ServiceIds | null, platform: string, type: string): string | null {
  if (!ids) return null;
  return ids[platform.toLowerCase()]?.[type] ?? null;
}

function getBaseDomain(urlStr: string): string {
  try {
    const cleanStr = urlStr.trim().replace(/^https?:\/\//i, "").split("/")[0];
    const parts = cleanStr.toLowerCase().split(".");
    if (parts.length >= 2) {
      return parts.slice(-2).join(".");
    }
    return cleanStr.toLowerCase();
  } catch {
    return urlStr.toLowerCase();
  }
}

const MIN_ENGAGEMENT_BATCH = 10;

export async function processEvent(eventId: string): Promise<{ ok: boolean; views?: number; error?: string }> {
  // Load event with all relations in one query
  const event = await prisma.deliveryEvent.findUnique({
    where: { id: eventId },
    include: {
      order: { include: { reel: true, user: true } },
      panel: true,
    },
  });

  if (!event || !event.order) return { ok: false, error: "Event not found" };

  // Guard against non-DELIVERING orders — update status to FAILED so orphan events never clog cron
  if (event.order.status !== "DELIVERING" && event.order.status !== "QUEUED") {
    await prisma.deliveryEvent.update({
      where: { id: eventId },
      data: { status: "FAILED", errorMessage: `Skipped: Order status is ${event.order.status}` }
    });
    return { ok: false, error: `Skipped: Order status is ${event.order.status}` };
  }

  const nowTime = Date.now();
  if (event.scheduledAt.getTime() > nowTime + 10000) {
    return { ok: false, error: `Skipped: Event scheduled in the future at ${event.scheduledAt.toISOString()}` };
  }

  const isWallet = event.order.user?.walletMode;
  const isSpecialUser = event.order.user?.email?.toLowerCase() === "arpitasumanekka@gmail.com";
  const platform = event.order.reel.platform?.toLowerCase() ?? "instagram";
  
  // 1. Fetch all available panels (Wallet and Admin orders use global admin panels userId: null)
  let availablePanels = await prisma.panel.findMany({
    where: {
      userId: (isWallet || isSpecialUser || !event.order.userId) ? null : event.order.userId,
      isActive: true,
      status: { not: "OFFLINE" }
    },
    orderBy: { priority: "asc" }
  });

  // Filter out panels that do not support this platform
  availablePanels = availablePanels.filter(p => {
    if (p.userId) return true;
    if (!p.serviceIds) return false;
    const sids = p.serviceIds as any;
    return !!sids[platform];
  });

  // Automatic fallback to global admin panels if 0 custom/matching panels returned
  if (availablePanels.length === 0) {
    availablePanels = await prisma.panel.findMany({
      where: {
        userId: null,
        isActive: true,
        status: { not: "OFFLINE" }
      },
      orderBy: { priority: "asc" }
    });
    availablePanels = availablePanels.filter(p => {
      if (!p.serviceIds) return false;
      const sids = p.serviceIds as any;
      return !!sids[platform];
    });
  }

  // Lock available panels strictly by platform:
  // - Instagram -> YoyoMedia domain ONLY
  // - YouTube, Facebook, TikTok -> MoreThanPanel domain ONLY
  if (platform === "instagram") {
    availablePanels = availablePanels.filter(p => getBaseDomain(p.apiUrl) === "yoyomedia.in");
  } else if (platform === "youtube" || platform === "facebook" || platform === "tiktok") {
    availablePanels = availablePanels.filter(p => getBaseDomain(p.apiUrl) === "morethanpanel.com");
  }

  if (availablePanels.length === 0) {
    const resData = event.responseData as any;
    const attempts = (resData?.attempts ?? 0) + 1;
    
    if (attempts < 3) {
      const newScheduledAt = new Date(Date.now() + 5 * 60 * 1000);
      await prisma.deliveryEvent.update({
        where: { id: eventId },
        data: {
          status: "SCHEDULED",
          scheduledAt: newScheduledAt,
          errorMessage: `Retry #${attempts}: No active panel available`,
          responseData: {
            ...(resData || {}),
            attempts,
          }
        }
      });
      return { ok: false, error: `Rescheduled for retry #${attempts}: No active panel available` };
    }

    // Mark as FAILED to remove from the cron queue so it doesn't block other events only after exhausting retries
    await prisma.deliveryEvent.updateMany({
      where: { id: eventId, status: "SCHEDULED" },
      data: { status: "FAILED", errorMessage: "No active panel available" }
    });

    // Auto-refund the user for this failed batch
    try {
      const order = event.order;
      if (order && order.viewsTarget > 0 && order.priceCharged > 0) {
        const refundAmount = parseFloat(((event.viewsBatch / order.viewsTarget) * order.priceCharged).toFixed(2));
        if (refundAmount > 0) {
          await prisma.$transaction([
            prisma.user.update({
              where: { id: order.userId },
              data: { balance: { increment: refundAmount } }
            }),
            prisma.auditLog.create({
              data: {
                userId: order.userId,
                action: "BATCH_FAILED_REFUND",
                metadata: {
                  eventId,
                  orderId: order.id,
                  refundAmount,
                  viewsBatch: event.viewsBatch,
                  reason: "No active panel available"
                }
              }
            })
          ]);
          console.log(`[Batch Refund] Refunded ₹${refundAmount} to user for failed batch ${eventId}`);
        }
      }
    } catch (err) {
      console.error("[Batch Refund] Failed to process auto-refund:", err);
    }

    return { ok: false, error: "No active panel available" };
  }

  // 2. Identify the target API URL (usually from the event's panel, or fallback to top priority)
  let targetApiUrl = event.panel?.apiUrl;
  if (!targetApiUrl) {
    targetApiUrl = availablePanels[0].apiUrl;
  }

  // 3. Find all sibling panels that share this exact API URL (Yoyo Media 1, Yoyo Media 2, etc.)
  let siblingPanels = availablePanels.filter(p => p.apiUrl === targetApiUrl);
  if (siblingPanels.length === 0 && availablePanels.length > 0) {
    siblingPanels = [availablePanels[0]];
  }

  // 4. Query and sort sibling panels by their available balance (highest balance tried first)
  let sortedPanels = [...siblingPanels];
  if (sortedPanels.length > 1) {
    try {
      const panelBalances = await Promise.all(
        siblingPanels.map(async (panel) => {
          try {
            const balanceResult = await getPanelBalance(panel.apiUrl, panel.apiKeyEncrypted);
            return {
              panel,
              balance: balanceResult.ok ? (balanceResult.balance ?? 0) : -1,
            };
          } catch (err) {
            return { panel, balance: -1 };
          }
        })
      );
      panelBalances.sort((a, b) => b.balance - a.balance);
      sortedPanels = panelBalances.map(pb => pb.panel);
    } catch (err) {
      console.error("[Process Event] Failed to sort sibling panels by balance:", err);
    }
  }

  if (sortedPanels.length === 0) {
    return { ok: false, error: "No active panels found to process this event" };
  }

  // 5. Determine Service IDs by finding the first sibling that actually has them mapped
  let inheritedServiceIds: ServiceIds | null = null;
  for (const p of sortedPanels) {
    if (p.serviceIds && (p.serviceIds as any)[platform]) {
      inheritedServiceIds = JSON.parse(JSON.stringify(p.serviceIds)) as ServiceIds;
      break;
    }
  }

  const viewsServiceId = getSvcId(inheritedServiceIds, platform, "views") ?? event.order.panelServiceId ?? "1";

  // Guard: skip if already processed (race condition between parallel workers)
  if (event.status !== "SCHEDULED") return { ok: false, error: `Skipped: status=${event.status}` };

  // Check if we should wait for previous batch to complete
  try {
    const allEvents = await prisma.deliveryEvent.findMany({
      where: { orderId: event.orderId },
      orderBy: { scheduledAt: "asc" },
    });
    
    const currentIndex = allEvents.findIndex(e => e.id === event.id);
    if (currentIndex > 0) {
      const prevEvent = allEvents[currentIndex - 1];
      const prevResData = prevEvent.responseData as any;
      const prevPanelOrderId = prevResData?.panelOrderId;
      
      if (prevPanelOrderId && prevEvent.panelId) {
        const prevPanel = await prisma.panel.findUnique({
          where: { id: prevEvent.panelId }
        });
        
        if (prevPanel) {
          const { checkPanelOrderStatus } = await import("@/lib/delivery/panel-client");
          const statusResult = await checkPanelOrderStatus(prevPanel.apiUrl, prevPanel.apiKeyEncrypted, String(prevPanelOrderId));
          
          if (statusResult.status !== "error") {
            const s = statusResult.status.toLowerCase();
            const isFinished = s === "completed" || s === "partial" || s === "canceled" || s === "cancelled" || s === "failed";
            
            if (!isFinished) {
              const timeSincePrevMs = prevEvent.executedAt ? (Date.now() - prevEvent.executedAt.getTime()) : (Date.now() - prevEvent.scheduledAt.getTime());
              const timeSincePrevMins = timeSincePrevMs / (1000 * 60);

              if (timeSincePrevMins < 20) {
                console.log(`[Pacing Engine] Previous SMM order ${prevPanelOrderId} for event ${prevEvent.id} is not completed yet (status: ${statusResult.status}, elapsed: ${Math.round(timeSincePrevMins)}m). Delaying current and subsequent batches...`);
                
                // Postpone current and all remaining scheduled events by 15 minutes
                const shiftMs = 15 * 60 * 1000;
                const eventsToShift = allEvents.slice(currentIndex);
                
                for (const e of eventsToShift) {
                  if (e.status === "SCHEDULED" || e.id === event.id) {
                    const newScheduledAt = new Date(e.scheduledAt.getTime() + shiftMs);
                    
                    await prisma.deliveryEvent.update({
                      where: { id: e.id },
                      data: {
                        scheduledAt: newScheduledAt,
                        status: "SCHEDULED",
                      }
                    });
                  }
                }
                
                return { ok: false, error: `Waiting for previous batch order ${prevPanelOrderId} to complete (current status: ${statusResult.status}). Shipped remaining timeline forward by 15m.` };
              } else {
                console.log(`[Pacing Engine] Previous SMM order ${prevPanelOrderId} status is ${statusResult.status}, but ${Math.round(timeSincePrevMins)}m elapsed. Proceeding with batch execution.`);
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("[Pacing Check Error]", err);
  }

  // Atomic status update — prevents double-processing if two cron calls overlap
  const claimed = await prisma.deliveryEvent.updateMany({
    where: { id: eventId, status: "SCHEDULED" },
    data: { status: "EXECUTING", executedAt: new Date(), panelId: sortedPanels[0].id },
  });
  if (claimed.count === 0) return { ok: false, error: "Already claimed by another worker" };

  const { order } = event;
  const resData = event.responseData as any;
  
  // Guard against over-delivery: Cap batch views to viewsRemaining
  const remainingViews = Math.max(0, order.viewsRemaining);
  if (remainingViews <= 0) {
    await prisma.deliveryEvent.update({
      where: { id: eventId },
      data: { status: "DONE", responseData: { skipped: "Views target already reached" } }
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "COMPLETED", completedAt: new Date() }
    });
    return { ok: true, views: 0 };
  }

  const targetBatch = Math.min(event.viewsBatch, remainingViews);
  const jitteredViews = Math.max(10, Math.min(remainingViews, applyJitter(targetBatch, 0.05)));
  const startMs = Date.now();

  // ── Place views order (Multi-Key Fallback Loop) ──────────
  let result = { ok: false, error: "No panels available" } as any;
  let activePanel = sortedPanels[0];
  
  for (const panel of sortedPanels) {
    let panelViewsServiceId = getSvcId(panel.serviceIds as any, platform, "views") || viewsServiceId;
    let viewsMinQty = 100;
    let viewsFallbackIds: string[] = [];
    try {
      const activeSvc = await prisma.adminService.findFirst({
        where: { panelId: panel.id, platform: order.reel.platform as any, type: "views" }
      });
      if (activeSvc) {
        if (activeSvc.serviceId) panelViewsServiceId = activeSvc.serviceId;
        if (activeSvc.minQuantity > 0) viewsMinQty = activeSvc.minQuantity;
        if (activeSvc.fallbackServiceIds && Array.isArray(activeSvc.fallbackServiceIds)) {
          viewsFallbackIds = (activeSvc.fallbackServiceIds as any[]).map(f => {
            if (typeof f === "object" && f !== null) return f.serviceId ? String(f.serviceId) : "";
            return f ? String(f) : "";
          }).filter(Boolean);
        }
      }
    } catch {}

    if (!panelViewsServiceId) {
      continue;
    }

    result = await placeOrderWithFallback({
      apiUrl: panel.apiUrl,
      apiKeyEncrypted: panel.apiKeyEncrypted,
      primaryServiceId: panelViewsServiceId,
      fallbackServiceIds: viewsFallbackIds,
      link: order.reel.url,
      quantity: Math.max(viewsMinQty, jitteredViews),
      minQuantity: viewsMinQty,
    });

    if (result.ok) {
      activePanel = panel;
      if (panel.id !== sortedPanels[0].id) {
         // Update the event to reflect which panel ACTUALLY succeeded during failover
         await prisma.deliveryEvent.update({ where: { id: eventId }, data: { panelId: panel.id } }).catch(()=>{});
      }
      break;
    } else {
      // ONLY mark failed panel as OFFLINE if the error class indicates entire panel is down (auth, connectivity, balance)
      if (result.errorClass === "panel_down") {
        prisma.panel.update({
          where: { id: panel.id },
          data: { status: "OFFLINE", lastCheckedAt: new Date(), lastResponseMs: Date.now() - startMs },
        }).catch(() => {});
      }
    }
  }

  const responseMs = Date.now() - startMs;

  if (!result.ok) {
    const isConcurrentOrderError = result.error && (
      result.error.toLowerCase().includes("active order") ||
      result.error.toLowerCase().includes("wait until order") ||
      result.error.toLowerCase().includes("duplicate") ||
      result.error.toLowerCase().includes("already exists") ||
      result.error.toLowerCase().includes("link has active")
    );

    if (isConcurrentOrderError) {
      // Temporary block. Reschedule this batch 20 minutes in the future.
      const newScheduledAt = new Date(Date.now() + 20 * 60 * 1000);
      await prisma.deliveryEvent.update({
        where: { id: eventId },
        data: {
          status: "SCHEDULED",
          scheduledAt: newScheduledAt,
          errorMessage: `Rescheduled: ${result.error}`,
        }
      });
      return { ok: false, error: `Rescheduled due to concurrent order block: ${result.error}` };
    }

    // Auto-Resume / Retry logic (100% Bulletproof — Never fail active orders on temporary provider errors)
    const attempts = (resData?.attempts ?? 0) + 1;
    if (attempts <= 20) {
      // Reschedule the failed batch 10 minutes in the future, clear panelId to test fresh panels, and increment attempts
      const newScheduledAt = new Date(Date.now() + 10 * 60 * 1000);
      await prisma.deliveryEvent.update({
        where: { id: eventId },
        data: {
          status: "SCHEDULED",
          scheduledAt: newScheduledAt,
          errorMessage: `Auto-Retrying (Attempt ${attempts}/20): ${result.error}`,
          panelId: null, // Clear preferred panel so failover picks up any online working panel!
          responseData: {
            ...(resData || {}),
            attempts,
            lastError: result.error
          }
        }
      });
      return { ok: false, error: `Rescheduled for retry #${attempts}: ${result.error}` };
    }

    // If max retries hit, auto-reschedule remaining views starting from NOW rather than failing the campaign
    const remaining = order.viewsTarget - order.viewsDelivered;
    if (remaining > 0) {
      const { generateDeliverySchedule } = await import("@/lib/delivery/curve");
      const batches = generateDeliverySchedule({
        totalViews: remaining,
        durationHours: order.durationHours || 24,
        warmupHours: 0,
        peakHours: 0,
        style: order.curveStyle || "ORGANIC"
      });
      const nowMs = Date.now();
      const freshEvents = batches.map(b => ({
        orderId: order.id,
        scheduledAt: new Date(nowMs + Math.max(0, b.scheduledDelayMs)),
        viewsBatch: b.views,
        status: "SCHEDULED" as const
      }));
      await prisma.deliveryEvent.deleteMany({ where: { orderId: order.id, status: "SCHEDULED" } });
      await prisma.deliveryEvent.createMany({ data: freshEvents });
      return { ok: false, error: `Auto-rescheduled remaining ${remaining} views for order ${order.id}` };
    }
  }

  // ── Engagement accumulation ────────────────────────────────
  const engagementDelivered = { likes: 0, saves: 0, shares: 0, comments: 0, reposts: 0 };

  if (order.engagementEnabled) {
    let minBatchSizes = { likes: 10, saves: 10, shares: 10, comments: 5, reposts: 10 };
    let due;
    if (resData && resData.customEngagement) {
      due = {
        likes: resData.customEngagement.likes ?? 0,
        saves: resData.customEngagement.saves ?? 0,
        shares: resData.customEngagement.shares ?? 0,
        comments: resData.customEngagement.comments ?? 0,
        reposts: resData.customEngagement.reposts ?? 0,
      };
    } else {
      const viewsDeliveredNow = order.viewsDelivered + jitteredViews;
      try {
        const uppercasePlatform = String(order.reel.platform || "INSTAGRAM").toUpperCase() as any;
        const mappedServices = await prisma.adminService.findMany({
          where: { panelId: activePanel.id, platform: uppercasePlatform }
        });
        mappedServices.forEach(s => {
          if (s.type === "likes" && s.minQuantity > 0) minBatchSizes.likes = s.minQuantity;
          if (s.type === "saves" && s.minQuantity > 0) minBatchSizes.saves = s.minQuantity;
          if (s.type === "shares" && s.minQuantity > 0) minBatchSizes.shares = s.minQuantity;
          if (s.type === "comments" && s.minQuantity > 0) minBatchSizes.comments = s.minQuantity;
          if (s.type === "reposts" && s.minQuantity > 0) minBatchSizes.reposts = s.minQuantity;
        });
      } catch { /* fallback */ }
      due = calculateEngagementDue(
        order.viewsTarget,
        viewsDeliveredNow,
        { likes: order.likesTarget, saves: order.savesTarget, shares: order.sharesTarget, comments: order.commentsTarget, reposts: order.repostsTarget },
        { likes: order.likesDelivered, saves: order.savesDelivered, shares: order.sharesDelivered, comments: order.commentsDelivered, reposts: order.repostsDelivered },
        minBatchSizes,
      );
    }

    const rawTasks = [
      { type: "likes" as const, qty: due.likes, defaultSvcId: getSvcId(inheritedServiceIds, platform, "likes") },
      { type: "saves" as const, qty: due.saves, defaultSvcId: getSvcId(inheritedServiceIds, platform, "saves") },
      { type: "shares" as const, qty: due.shares, defaultSvcId: getSvcId(inheritedServiceIds, platform, "shares") },
      { type: "comments" as const, qty: due.comments, defaultSvcId: getSvcId(inheritedServiceIds, platform, "comments") },
      { type: "reposts" as const, qty: due.reposts, defaultSvcId: getSvcId(inheritedServiceIds, platform, "reposts") },
    ].filter(t => t.qty > 0);

    const tasks = await Promise.all(
      rawTasks.map(async (t) => {
        let primarySvcId = t.defaultSvcId;
        let fallbackSvcIds: string[] = [];
        let minQty = (minBatchSizes as any)[t.type] || 10;
        let targetPanels = [...sortedPanels];
        
        if (true) {
          try {
            // First check if the service is mapped on activePanel
            let activeSvc = await prisma.adminService.findFirst({
              where: { panelId: activePanel.id, platform: platform.toUpperCase() as any, type: t.type }
            });
            
            // If not mapped on activePanel, try to find any active panel that has this service mapped
            if (!activeSvc) {
              const alternativeSvcs = await prisma.adminService.findMany({
                where: {
                  platform: platform.toUpperCase() as any,
                  type: t.type,
                  panel: { isActive: true, status: { not: "OFFLINE" } }
                },
                include: { panel: true },
                orderBy: { panel: { priority: "asc" } }
              });
              
              if (alternativeSvcs.length > 0) {
                // Apply SMM provider domain lock rules:
                // - Instagram -> Yoyomedia ONLY
                // - YouTube views/likes, Facebook likes, TikTok views -> MoreThanPanel ONLY
                // - Other services -> Yoyomedia preferred
                let filtered = alternativeSvcs;
                if (platform === "instagram") {
                  filtered = alternativeSvcs.filter(s => getBaseDomain(s.panel.apiUrl) === "yoyomedia.in");
                } else if (
                  (platform === "youtube" && ((t.type as string) === "views" || t.type === "likes")) ||
                  (platform === "facebook" && t.type === "likes") ||
                  (platform === "tiktok" && (t.type as string) === "views")
                ) {
                  filtered = alternativeSvcs.filter(s => getBaseDomain(s.panel.apiUrl) === "morethanpanel.com");
                } else {
                  // Prefer Yoyomedia panels for non-locked services if available
                  const yoyoFiltered = alternativeSvcs.filter(s => getBaseDomain(s.panel.apiUrl) === "yoyomedia.in");
                  if (yoyoFiltered.length > 0) filtered = yoyoFiltered;
                }
                
                if (filtered.length > 0) {
                  activeSvc = filtered[0];
                  // Restructure targetPanels to try the mapped panel(s) first
                  const matchedPanel = filtered[0].panel;
                  targetPanels = [matchedPanel, ...sortedPanels.filter(p => p.id !== matchedPanel.id)];
                }
              }
            }
            
            if (activeSvc) {
              if (activeSvc.serviceId) primarySvcId = activeSvc.serviceId;
              if (activeSvc.fallbackServiceIds && Array.isArray(activeSvc.fallbackServiceIds)) {
                fallbackSvcIds = (activeSvc.fallbackServiceIds as any[]).map(f => {
                  if (typeof f === "object" && f !== null) return f.serviceId ? String(f.serviceId) : "";
                  return f ? String(f) : "";
                }).filter(Boolean);
              }
              if (activeSvc.minQuantity > 0) minQty = activeSvc.minQuantity;
            }
          } catch {}
        }
        
        return {
          type: t.type,
          qty: t.qty,
          svcId: primarySvcId,
          fallbackServiceIds: fallbackSvcIds,
          minQty,
          panels: targetPanels
        };
      })
    );

    const filteredTasks = tasks.filter(t => t.qty > 0 && t.svcId);

    await Promise.allSettled(
      filteredTasks.map(async ({ type, qty, svcId, fallbackServiceIds, minQty, panels }) => {
        try {
          const target = (order as any)[`${type}Target`] || 0;
          const delivered = (order as any)[`${type}Delivered`] || 0;
          const remaining = Math.max(0, target - delivered);
          if (remaining <= 0 || target <= 0) return;

          const actualQty = Math.min(Math.max(minQty, qty), remaining);
          if (actualQty <= 0) return;
          
          for (const p of panels) {
            // STRICT DOMAIN LOCK GUARD
            if (platform === "instagram" && getBaseDomain(p.apiUrl) !== "yoyomedia.in") continue;
            if ((platform === "youtube" || platform === "facebook" || platform === "tiktok") && getBaseDomain(p.apiUrl) !== "morethanpanel.com") continue;
            let panelEngSvcId = getSvcId(p.serviceIds as any, platform, type) || svcId!;
            try {
              const pSvc = await prisma.adminService.findFirst({
                where: { panelId: p.id, platform: platform.toUpperCase() as any, type }
              });
              if (pSvc?.serviceId) panelEngSvcId = pSvc.serviceId;
            } catch {}

            if (!panelEngSvcId) continue;

            let r = await placeOrderWithFallback({
              apiUrl: p.apiUrl,
              apiKeyEncrypted: p.apiKeyEncrypted,
              primaryServiceId: panelEngSvcId,
              fallbackServiceIds,
              link: order.reel.url,
              quantity: actualQty,
              minQuantity: minQty,
            });
            
            if (r.ok) {
              engagementDelivered[type] = actualQty;
              break;
            } else {
              // ONLY mark failed panel as OFFLINE if the error class indicates entire panel is down (auth, connectivity, balance)
              if (r.errorClass === "panel_down") {
                prisma.panel.update({ where: { id: p.id }, data: { status: "OFFLINE", lastCheckedAt: new Date() } }).catch(()=>{});
              }
            }
          }
        } catch { /* non-fatal */ }
      })
    );
  }

  // ── Persist results ────────────────────────────────────────
  await prisma.deliveryEvent.update({
    where: { id: eventId },
    data: {
      status: "DONE",
      responseData: {
        customEngagement: resData?.customEngagement,
        panelOrderId: result.orderId,
        engagementFired: engagementDelivered,
        ...(result.rawResponse as object),
      },
    },
  });

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      viewsDelivered: { increment: jitteredViews },
      viewsRemaining: { decrement: jitteredViews },
      ...(engagementDelivered.likes    > 0 ? { likesDelivered:    { increment: engagementDelivered.likes    } } : {}),
      ...(engagementDelivered.saves    > 0 ? { savesDelivered:    { increment: engagementDelivered.saves    } } : {}),
      ...(engagementDelivered.shares   > 0 ? { sharesDelivered:   { increment: engagementDelivered.shares   } } : {}),
      ...(engagementDelivered.comments > 0 ? { commentsDelivered: { increment: engagementDelivered.comments } } : {}),
      ...(engagementDelivered.reposts  > 0 ? { repostsDelivered:  { increment: engagementDelivered.reposts  } } : {}),
    },
  });

  await prisma.panel.update({
    where: { id: activePanel.id },
    data: { status: responseMs > 5000 ? "SLOW" : "ONLINE", lastCheckedAt: new Date(), lastResponseMs: responseMs },
  });

  const prevProgress = order.viewsDelivered / order.viewsTarget;
  const newProgress  = updated.viewsDelivered / updated.viewsTarget;
  
  // Prevent campaigns from getting stuck if final jittered total falls slightly short
  const remainingEventsCount = await prisma.deliveryEvent.count({
    where: {
      orderId: order.id,
      status: { in: ["SCHEDULED", "EXECUTING", "RETRYING"] },
      id: { not: eventId }
    }
  });
  
  const isCompleted  = updated.viewsRemaining <= 0 || newProgress >= 1.0 || remainingEventsCount === 0;

  if (isCompleted) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await triggerMidwayRefund(order.id);

    // Dynamic import to avoid circular dependency and trigger SEO Case Study generation
    import("@/lib/delivery/auto-blog").then(({ generateOrderCaseStudy }) => {
      generateOrderCaseStudy(order.id).catch(err => console.error("[Process] AutoBlog trigger error:", err));
    }).catch(err => console.error("[Process] AutoBlog import error:", err));
  }

  const isMidCampaign = prevProgress < 0.5 && newProgress >= 0.5;
  if (isMidCampaign || isCompleted) {
    try { await checkAndRefillOrder(order.id); } catch { /* non-fatal */ }
  }

  return { ok: true, views: jitteredViews };
}
