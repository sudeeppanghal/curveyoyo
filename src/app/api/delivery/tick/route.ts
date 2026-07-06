import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { placeOrderWithFallback } from "@/lib/delivery/panel-client";
import { cachePanelStatus } from "@/lib/redis";
import { calculateEngagementDue, applyJitter } from "@/lib/delivery/curve";
import { checkAndRefillOrder } from "@/lib/delivery/refill";
import { triggerMidwayRefund } from "@/lib/delivery/refund";
import { sendTelegramAlert } from "@/lib/telegram";

// Force dynamic so Next.js never tries to statically analyse this route
export const dynamic = "force-dynamic";

interface TickPayload {
  eventId: string;
  orderId: string;
  panelId: string | null;
  viewsBatch: number;
  reelUrl: string;
  platform?: string;
  // Legacy fields kept for backward compat:
  likesBatch?: number;
  savesBatch?: number;
  sharesBatch?: number;
  commentsBatch?: number;
  repostsBatch?: number;
}

type ServiceIds = Record<string, Record<string, string>>;

function getServiceId(serviceIds: ServiceIds | null, platform: string, type: string): string | null {
  if (!serviceIds) return null;
  return serviceIds[platform.toLowerCase()]?.[type] ?? null;
}

/**
 * POST /api/delivery/tick
 *
 * Hybrid Self-Healing Delivery System:
 * ─────────────────────────────────────────────────────────────
 * For every delivery tick this system:
 *   1. Loads the primary service ID + fallback list from AdminService
 *   2. Tries primary. On failure, classifies the error:
 *      - "Amount doesn't match" → rounds qty to minQty multiple, retries
 *      - "Incorrect service ID" → auto-tries fallback IDs in order
 *      - Panel down → shifts to a different panel entirely
 *      - User error → pauses order, surfaces error
 *   3. Running orders NEVER stop due to a single service ID changing.
 *
 * Engagement Accumulation System:
 * ─────────────────────────────────────────────────────────────
 * Uses "owed vs delivered" accumulation:
 *   1. After views delivered, compute fraction of campaign complete
 *   2. Calculate how many likes/saves/shares/comments are NOW owed
 *   3. Subtract already-delivered → get "due" amount
 *   4. Only place engagement order if due ≥ minQuantity for that type
 *   5. On final tick (99%+), flush all remaining engagement
 * ─────────────────────────────────────────────────────────────
 */

async function handler(request: NextRequest) {
  const body = await request.json() as TickPayload;
  const { eventId, orderId, panelId, viewsBatch, reelUrl, platform = "instagram" } = body;

  if (!eventId || !orderId || !viewsBatch || !reelUrl) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Mark event as EXECUTING
  const event = await prisma.deliveryEvent.update({
    where: { id: eventId },
    data: { status: "EXECUTING", executedAt: new Date() },
  });

  // Load order with current delivery state
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { reel: true, user: true } });
  if (!order) {
    await prisma.deliveryEvent.update({ where: { id: eventId }, data: { status: "FAILED", errorMessage: "Order not found" } });
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }

  // ── Load panel (or find failover if panel missing) ────────────────────
  let panel = panelId ? await prisma.panel.findUnique({ where: { id: panelId } }) : null;
  if (!panel) {
    const isWallet = order.user.walletMode;
    panel = await prisma.panel.findFirst({
      where: { userId: isWallet ? null : order.userId, isActive: true, status: { not: "OFFLINE" } },
      orderBy: { priority: "asc" },
    });
    if (!panel) {
      await prisma.deliveryEvent.update({ where: { id: eventId }, data: { status: "FAILED", errorMessage: "No active panel available" } });
      return NextResponse.json({ ok: false, error: "No active panel available" }, { status: 404 });
    }
    await prisma.deliveryEvent.update({ where: { id: eventId }, data: { panelId: panel.id } });
  }

  // ── Load views service config (primary + fallbacks) ───────────────────
  const svcIds = panel.serviceIds as ServiceIds | null;
  const viewsServiceIdFromJson = getServiceId(svcIds, platform, "views") ?? order.panelServiceId ?? "1";

  let viewsMinQty = 100;
  let viewsFallbackIds: string[] = [];
  try {
    const activeSvc = await prisma.adminService.findFirst({
      where: { panelId: panel.id, platform: platform.toUpperCase() as any, type: "views" }
    });
    if (activeSvc) {
      if (activeSvc.minQuantity > 0) viewsMinQty = activeSvc.minQuantity;
      // Load fallback service IDs stored in DB
      if (activeSvc.fallbackServiceIds && Array.isArray(activeSvc.fallbackServiceIds)) {
        viewsFallbackIds = (activeSvc.fallbackServiceIds as string[]).filter(Boolean);
      }
    }
  } catch { /* use defaults */ }

  const startMs = Date.now();

  // ── 1. Place VIEWS order — hybrid fallback system ─────────────────────
  // Apply ±15% jitter for organic-looking delivery.
  // The accumulation algorithm corrects for drift — totals always match target.
  const jitteredViewsBatch = Math.max(viewsMinQty, applyJitter(viewsBatch, 0.15));

  let result = await placeOrderWithFallback({
    apiUrl: panel.apiUrl,
    apiKeyEncrypted: panel.apiKeyEncrypted,
    primaryServiceId: viewsServiceIdFromJson,
    fallbackServiceIds: viewsFallbackIds,
    link: reelUrl,
    quantity: jitteredViewsBatch,
    minQuantity: viewsMinQty,
  });

  const responseMs = Date.now() - startMs;

  // ── Panel-level failover: if entire panel is down, try another ────────
  let activePanel = panel;
  if (!result.ok && result.errorClass === "panel_down") {
    await cachePanelStatus(panel.id, "OFFLINE");
    await prisma.panel.update({
      where: { id: panel.id },
      data: { status: "OFFLINE", lastCheckedAt: new Date(), lastResponseMs: responseMs },
    });

    const isWallet = order.user.walletMode;
    const failoverPanel = await prisma.panel.findFirst({
      where: {
        userId: isWallet ? null : order.userId,
        isActive: true,
        id: { not: panel.id },
        status: { not: "OFFLINE" }
      },
      orderBy: { priority: "asc" },
    });

    if (failoverPanel) {
      // Load failover panel's service config
      const foSvcIds = failoverPanel.serviceIds as ServiceIds | null;
      const foViewsSvcId = getServiceId(foSvcIds, platform, "views") ?? order.panelServiceId ?? "1";
      let foViewsMinQty = viewsMinQty;
      let foViewsFallbacks: string[] = [];
      try {
        const foSvc = await prisma.adminService.findFirst({
          where: { panelId: failoverPanel.id, platform: platform.toUpperCase() as any, type: "views" }
        });
        if (foSvc) {
          if (foSvc.minQuantity > 0) foViewsMinQty = foSvc.minQuantity;
          if (foSvc.fallbackServiceIds && Array.isArray(foSvc.fallbackServiceIds)) {
            foViewsFallbacks = (foSvc.fallbackServiceIds as string[]).filter(Boolean);
          }
        }
      } catch { /* use defaults */ }

      result = await placeOrderWithFallback({
        apiUrl: failoverPanel.apiUrl,
        apiKeyEncrypted: failoverPanel.apiKeyEncrypted,
        primaryServiceId: foViewsSvcId,
        fallbackServiceIds: foViewsFallbacks,
        link: reelUrl,
        quantity: Math.max(foViewsMinQty, viewsBatch),
        minQuantity: foViewsMinQty,
      });
      activePanel = failoverPanel;
      await prisma.deliveryEvent.update({ where: { id: eventId }, data: { panelId: failoverPanel.id } });
    }
  }

  // ── Handle permanent failure ───────────────────────────────────────────
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
      await sendTelegramAlert(
        `⏳ *Batch Rescheduled*\nOrder ID: \`${orderId}\`\nReason: Concurrent active order block. Retrying in 20 minutes.`
      ).catch(() => {});
      return NextResponse.json({ ok: false, error: `Rescheduled due to concurrent order block: ${result.error}` });
    }

    const failReason = result.error ?? "Unknown delivery failure";
    await prisma.deliveryEvent.update({ where: { id: eventId }, data: { status: "FAILED", errorMessage: failReason } });
    await prisma.deliveryEvent.updateMany({
      where: { orderId, status: "SCHEDULED" },
      data: { status: "FAILED", errorMessage: "Order failed midway" }
    });
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "FAILED", failReason },
    });
    await triggerMidwayRefund(orderId);
    // Telegram alert so admin knows immediately
    await sendTelegramAlert(
      `❌ *Order Failed*\nOrder ID: \`${orderId}\`\nPlatform: ${platform.toUpperCase()}\nError: ${failReason}\nAll fallbacks exhausted.`
    ).catch(() => {}); // non-fatal
    return NextResponse.json({ ok: false, error: failReason }, { status: 500 });
  }

  // ── 2. ENGAGEMENT ACCUMULATION ALGORITHM ─────────────────────────────
  const actualViewsDelivered = jitteredViewsBatch;
  const engagementDelivered = { likes: 0, saves: 0, shares: 0, comments: 0, reposts: 0 };

  if (order.engagementEnabled) {
    const resData = event.responseData as any;
    let due;
    let minBatchSizes = { likes: 10, saves: 10, shares: 10, comments: 5, reposts: 10 };

    // Load all engagement service configs for this panel+platform (with fallbacks)
    type EngSvcMap = {
      svcId: string;
      fallbacks: string[];
      minQty: number;
    };
    const engServiceMap: Record<string, EngSvcMap> = {};
    try {
      const uppercasePlatform = String(order.reel.platform || "INSTAGRAM").toUpperCase() as any;
      const mappedServices = await prisma.adminService.findMany({
        where: { panelId: activePanel.id, platform: uppercasePlatform }
      });
      mappedServices.forEach(s => {
        const engSvcIds = activePanel.serviceIds as ServiceIds | null;
        const svcId = getServiceId(engSvcIds, platform, s.type) ?? s.serviceId;
        const fallbacks = (s.fallbackServiceIds && Array.isArray(s.fallbackServiceIds))
          ? (s.fallbackServiceIds as string[]).filter(Boolean)
          : [];
        engServiceMap[s.type] = { svcId, fallbacks, minQty: s.minQuantity || 10 };
        if (s.type === "likes" && s.minQuantity > 0) minBatchSizes.likes = s.minQuantity;
        if (s.type === "saves" && s.minQuantity > 0) minBatchSizes.saves = s.minQuantity;
        if (s.type === "shares" && s.minQuantity > 0) minBatchSizes.shares = s.minQuantity;
        if (s.type === "comments" && s.minQuantity > 0) minBatchSizes.comments = s.minQuantity;
        if (s.type === "reposts" && s.minQuantity > 0) minBatchSizes.reposts = s.minQuantity;
      });
    } catch { /* fallback to defaults */ }

    if (resData && resData.customEngagement) {
      due = {
        likes: resData.customEngagement.likes ?? 0,
        saves: resData.customEngagement.saves ?? 0,
        shares: resData.customEngagement.shares ?? 0,
        comments: resData.customEngagement.comments ?? 0,
        reposts: resData.customEngagement.reposts ?? 0,
      };
    } else {
      const viewsDeliveredNow = order.viewsDelivered + actualViewsDelivered;
      due = calculateEngagementDue(
        order.viewsTarget,
        viewsDeliveredNow,
        {
          likes:    order.likesTarget,
          saves:    order.savesTarget,
          shares:   order.sharesTarget,
          comments: order.commentsTarget,
          reposts:  order.repostsTarget ?? 0,
        },
        {
          likes:    order.likesDelivered,
          saves:    order.savesDelivered,
          shares:   order.sharesDelivered,
          comments: order.commentsDelivered,
          reposts:  order.repostsDelivered ?? 0,
        },
        minBatchSizes,
      );
    }

    const engagementPanelOrderIds: Record<string, string> = {};

    // Build engagement tasks — each type uses its own primary + fallback service IDs
    const engTasks = (
      [
        { type: "likes",    qty: due.likes },
        { type: "saves",    qty: due.saves },
        { type: "shares",   qty: due.shares },
        { type: "comments", qty: due.comments },
        { type: "reposts",  qty: due.reposts },
      ] as { type: keyof typeof engagementDelivered; qty: number }[]
    ).filter(({ qty, type }) => qty > 0 && engServiceMap[type]);

    // Fire all in parallel — zero impact on views delivery timing
    await Promise.allSettled(
      engTasks.map(async ({ type, qty }) => {
        const cfg = engServiceMap[type];
        if (!cfg) return;
        try {
          const actualQty = Math.max(cfg.minQty, qty);
          const r = await placeOrderWithFallback({
            apiUrl: activePanel.apiUrl,
            apiKeyEncrypted: activePanel.apiKeyEncrypted,
            primaryServiceId: cfg.svcId,
            fallbackServiceIds: cfg.fallbacks,
            link: reelUrl,
            quantity: actualQty,
            minQuantity: cfg.minQty,
          });
          if (r.ok) {
            engagementDelivered[type] = actualQty;
            if (r.orderId) engagementPanelOrderIds[type] = r.orderId;
          }
          // Engagement failures are non-fatal — views already succeeded,
          // engagement will catch up on next tick via accumulation algorithm
        } catch {
          // silently skip — never let engagement kill a views delivery
        }
      })
    );

    Object.assign(engagementDelivered, { engagementPanelOrderIds });
  }

  // ── 3. Record success in DB ───────────────────────────────────────────
  await cachePanelStatus(panel.id, responseMs > 5000 ? "SLOW" : "ONLINE");

  const engPanelOrderIds = (engagementDelivered as any).engagementPanelOrderIds || {};
  const cleanedEngagementFired = {
    likes:    engagementDelivered.likes,
    saves:    engagementDelivered.saves,
    shares:   engagementDelivered.shares,
    comments: engagementDelivered.comments,
    reposts:  engagementDelivered.reposts,
  };

  const resData = event.responseData as any;
  await prisma.deliveryEvent.update({
    where: { id: eventId },
    data: {
      status: "DONE",
      responseData: {
        customEngagement: resData?.customEngagement,
        panelOrderId: result.orderId,
        usedServiceId: result.usedServiceId,
        engagementFired: cleanedEngagementFired,
        engagementPanelOrderIds: engPanelOrderIds,
        ...result.rawResponse as object,
      },
    },
  });

  // Update order progress
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      viewsDelivered:  { increment: actualViewsDelivered },
      viewsRemaining:  { decrement: actualViewsDelivered },
      ...(cleanedEngagementFired.likes    > 0 ? { likesDelivered:    { increment: cleanedEngagementFired.likes    } } : {}),
      ...(cleanedEngagementFired.saves    > 0 ? { savesDelivered:    { increment: cleanedEngagementFired.saves    } } : {}),
      ...(cleanedEngagementFired.shares   > 0 ? { sharesDelivered:   { increment: cleanedEngagementFired.shares   } } : {}),
      ...(cleanedEngagementFired.comments > 0 ? { commentsDelivered: { increment: cleanedEngagementFired.comments } } : {}),
      ...(cleanedEngagementFired.reposts  > 0 ? { repostsDelivered:  { increment: cleanedEngagementFired.reposts  } } : {}),
    },
  });

  const prevProgress = order.viewsDelivered / order.viewsTarget;
  const newProgress  = updated.viewsDelivered / updated.viewsTarget;
  const isMidCampaign = prevProgress < 0.5 && newProgress >= 0.5;
  const isCompleted   = updated.viewsRemaining <= 0 || newProgress >= 1.0;

  if (isCompleted) {
    await prisma.order.update({ where: { id: orderId }, data: { status: "COMPLETED", completedAt: new Date() } });
    await triggerMidwayRefund(orderId);
  }

  if (isMidCampaign || isCompleted) {
    try {
      await checkAndRefillOrder(orderId);
    } catch (err) {
      console.error("[TICK WEBHOOK] Refill check failed:", err);
    }
  }

  await prisma.panel.update({
    where: { id: panel.id },
    data: { status: responseMs > 5000 ? "SLOW" : "ONLINE", lastCheckedAt: new Date(), lastResponseMs: responseMs },
  });

  return NextResponse.json({
    ok: true,
    panelOrderId: result.orderId,
    usedServiceId: result.usedServiceId,
    viewsDelivered: actualViewsDelivered,
    engagementFired: cleanedEngagementFired,
  });
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextKey    = process.env.QSTASH_NEXT_SIGNING_KEY;
    if (!currentKey || !nextKey) {
      return NextResponse.json({ error: "QStash signing keys not configured" }, { status: 500 });
    }
    const { verifySignatureAppRouter } = await import("@upstash/qstash/nextjs");
    return verifySignatureAppRouter(handler)(req);
  }
  return handler(req);
}
