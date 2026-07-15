import { prisma } from "@/lib/prisma";
import { placePanelOrder, placeOrderWithFallback, classifyError, getPanelServices, getPanelBalance } from "@/lib/delivery/panel-client";
import { isGhostEmail } from "@/lib/ghost";
import { calculateEngagementDue, applyJitter } from "@/lib/delivery/curve";
import { checkAndRefillOrder } from "@/lib/delivery/refill";
import { triggerMidwayRefund } from "@/lib/delivery/refund";

type ServiceIds = Record<string, Record<string, string>>;



function getSvcId(ids: ServiceIds | null, platform: string, type: string): string | null {
  if (!ids) return null;
  return ids[platform.toLowerCase()]?.[type] ?? null;
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

  const isWallet = event.order.user?.walletMode;
  const isSpecialUser = event.order.user?.email?.toLowerCase() === "arpitasumanekka@gmail.com";
  
  const isGhost = isGhostEmail(event.order.user?.email ?? "");
  
  // 1. Fetch all available panels to allow true load balancing and failover
  let availablePanels = await prisma.panel.findMany({
    where: {
      userId: (isWallet && !isSpecialUser && !isGhost) ? null : event.order.userId,
      isActive: true,
      status: { not: "OFFLINE" }
    },
    orderBy: { priority: "asc" }
  });

  // Apply ghost SMM preference
  if (isGhost && (event.order.user as any)?.ghostSmmPreference) {
    const preferred = availablePanels.find(p => p.id === (event.order.user as any).ghostSmmPreference) ||
      await prisma.panel.findFirst({ where: { id: (event.order.user as any).ghostSmmPreference, isActive: true, status: { not: "OFFLINE" } } });
    if (preferred) {
      availablePanels = [preferred];
    }
  }

  if ((isSpecialUser || isGhost) && availablePanels.length === 0) {
    availablePanels = await prisma.panel.findMany({
      where: {
        userId: null,
        isActive: true,
        status: { not: "OFFLINE" }
      },
      orderBy: { priority: "asc" }
    });
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
    return { ok: false, error: "No active panel available" };
  }

  // 2. Identify the target API URL (usually from the event's panel, or fallback to top priority)
  let targetApiUrl = event.panel?.apiUrl;
  if (!targetApiUrl) {
    targetApiUrl = availablePanels[0].apiUrl;
  }

  // 3. Find all sibling panels that share this exact API URL (Yoyo Media 1, Yoyo Media 2, etc.)
  const siblingPanels = availablePanels.filter(p => p.apiUrl === targetApiUrl);

  // 4. Determine Service IDs by finding the first sibling that actually has them mapped
  const platform = event.order.reel.platform?.toLowerCase() ?? "instagram";
  let inheritedServiceIds: ServiceIds | null = null;
  for (const p of siblingPanels) {
    if (p.serviceIds && (p.serviceIds as any)[platform]) {
      inheritedServiceIds = JSON.parse(JSON.stringify(p.serviceIds)) as ServiceIds;
      break;
    }
  }

  // Intercept with ghost custom service overrides
  const ghostOverrideStr = (event.order as any).ghostCustomServices || (event.order.user as any).ghostCustomServices;
  if (isGhostEmail(event.order.user.email) && ghostOverrideStr) {
    try {
      const overrides = JSON.parse(ghostOverrideStr);
      if (overrides && overrides[platform]) {
        if (!inheritedServiceIds) {
          inheritedServiceIds = {} as any;
        }
        if (!(inheritedServiceIds as any)[platform]) {
          (inheritedServiceIds as any)[platform] = {};
        }
        for (const [type, serviceId] of Object.entries(overrides[platform])) {
          if (serviceId) {
            (inheritedServiceIds as any)[platform][type] = String(serviceId);
          }
        }
      }
    } catch (err) {
      console.error("[Ghost Override] Failed to parse ghostCustomServices:", err);
    }
  }

  const viewsServiceId = getSvcId(inheritedServiceIds, platform, "views") ?? event.order.panelServiceId ?? "1";

  // 5. Query and sort sibling panels by their available balance (highest balance tried first)
  let sortedPanels = [...siblingPanels];
  if (siblingPanels.length > 1) {
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

  // Guard: skip if already processed (race condition between parallel workers)
  if (event.status !== "SCHEDULED") return { ok: false, error: `Skipped: status=${event.status}` };

  // Atomic status update — prevents double-processing if two cron calls overlap
  const claimed = await prisma.deliveryEvent.updateMany({
    where: { id: eventId, status: "SCHEDULED" },
    data: { status: "EXECUTING", executedAt: new Date(), panelId: sortedPanels[0].id },
  });
  if (claimed.count === 0) return { ok: false, error: "Already claimed by another worker" };

  const { order } = event;
  const resData = event.responseData as any;
  const jitteredViews = Math.max(100, applyJitter(event.viewsBatch, 0.15));
  const startMs = Date.now();

  // ── Place views order (Multi-Key Fallback Loop) ──────────
  let result = { ok: false, error: "No panels available" } as any;
  let activePanel = sortedPanels[0];
  
  for (const panel of sortedPanels) {
    let viewsMinQty = 100;
    let viewsFallbackIds: string[] = [];
    try {
      const activeSvc = await prisma.adminService.findFirst({
        where: { panelId: panel.id, platform: order.reel.platform as any, type: "views" }
      });
      if (activeSvc) {
        if (activeSvc.minQuantity > 0) viewsMinQty = activeSvc.minQuantity;
        if (activeSvc.fallbackServiceIds && Array.isArray(activeSvc.fallbackServiceIds)) {
          viewsFallbackIds = (activeSvc.fallbackServiceIds as any[]).map(f => {
            if (typeof f === "object" && f !== null) return f.serviceId ? String(f.serviceId) : "";
            return f ? String(f) : "";
          }).filter(Boolean);
        }
      }
    } catch {}

    result = await placeOrderWithFallback({
      apiUrl: panel.apiUrl,
      apiKeyEncrypted: panel.apiKeyEncrypted,
      primaryServiceId: viewsServiceId,
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

    // Auto-Resume / Retry logic:
    const attempts = (resData?.attempts ?? 0) + 1;
    if (attempts < 3) {
      // Reschedule the failed batch 5 minutes in the future, and increment attempts
      const newScheduledAt = new Date(Date.now() + 5 * 60 * 1000);
      await prisma.deliveryEvent.update({
        where: { id: eventId },
        data: {
          status: "SCHEDULED",
          scheduledAt: newScheduledAt,
          errorMessage: `Retry #${attempts}: ${result.error}`,
          panelId: null, // Clear preferred panel to trigger fallback load balancing/failover!
          responseData: {
            ...(resData || {}),
            attempts,
          }
        }
      });
      return { ok: false, error: `Rescheduled for retry #${attempts}: ${result.error}` };
    }

    await prisma.deliveryEvent.update({
      where: { id: eventId },
      data: { status: "FAILED", errorMessage: result.error },
    });
    await prisma.deliveryEvent.updateMany({
      where: { orderId: order.id, status: "SCHEDULED" },
      data: { status: "FAILED", errorMessage: "Order failed midway" },
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "FAILED", failReason: result.error },
    });
    await triggerMidwayRefund(order.id);
    return { ok: false, error: result.error };
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

    const isGhost = isGhostEmail(order.user.email);
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
        
        if (!isGhost) {
          try {
            const activeSvc = await prisma.adminService.findFirst({
              where: { panelId: activePanel.id, platform: platform.toUpperCase() as any, type: t.type }
            });
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
          minQty
        };
      })
    );

    const filteredTasks = tasks.filter(t => t.qty > 0 && t.svcId);

    await Promise.allSettled(
      filteredTasks.map(async ({ type, qty, svcId, fallbackServiceIds, minQty }) => {
        try {
          const actualQty = Math.max(minQty, qty);
          
          // Distribute engagement orders according to available balance
          const engPanels = sortedPanels;
          
          for (const p of engPanels) {
            let r = await placeOrderWithFallback({
              apiUrl: p.apiUrl,
              apiKeyEncrypted: p.apiKeyEncrypted,
              primaryServiceId: svcId!,
              fallbackServiceIds: isGhost ? [] : fallbackServiceIds,
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
