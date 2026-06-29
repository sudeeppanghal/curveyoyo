import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { placePanelOrder } from "@/lib/delivery/panel-client";
import { cachePanelStatus } from "@/lib/redis";
import { calculateEngagementDue, applyJitter } from "@/lib/delivery/curve";
import { checkAndRefillOrder } from "@/lib/delivery/refill";

// Force dynamic so Next.js never tries to statically analyse this route
// (prevents build-time crash when QSTASH env vars are not present during build)
export const dynamic = "force-dynamic";

interface TickPayload {
  eventId: string;
  orderId: string;
  panelId: string;
  viewsBatch: number;
  reelUrl: string;
  platform?: string; // "instagram" | "tiktok" | "youtube"
  // Engagement quantities are NO LONGER passed in the payload.
  // Instead we compute them fresh from the order state using the
  // "owed vs delivered" accumulation algorithm.
  // Legacy fields kept for backward compat:
  likesBatch?: number;
  savesBatch?: number;
  sharesBatch?: number;
  commentsBatch?: number;
}

type ServiceIds = Record<string, Record<string, string>>;

function getServiceId(serviceIds: ServiceIds | null, platform: string, type: string): string | null {
  if (!serviceIds) return null;
  return serviceIds[platform.toLowerCase()]?.[type] ?? null;
}

/**
 * POST /api/delivery/tick
 * Called by QStash for each delivery batch.
 *
 * Engagement Accumulation System:
 * ─────────────────────────────────────────────────────────────
 * Instead of pre-calculating engagement per-batch (which fails for small
 * campaigns because 0.55 likes/tick is below panel minimums), we use the
 * "owed vs delivered" algorithm:
 *
 *   1. After views are delivered, calculate fraction of campaign complete
 *   2. Compute how many likes/saves/shares/comments are NOW owed (fraction × target)
 *   3. Subtract already-delivered counts → get "due" amount
 *   4. Only place an engagement order if due ≥ MIN_ENGAGEMENT_BATCH (default 10)
 *   5. On final tick (99%+ views delivered), flush all remaining engagement
 *
 * This means:
 *   - 10K views / 30 days / 4% likes = 400 likes → fires every ~2 hours (not every hour)
 *   - 1L views / 30 days / 4% likes = 4,000 likes → fires every tick naturally
 *   - All remaining engagement is always flushed on the last batch
 * ─────────────────────────────────────────────────────────────
 */

// Minimum engagement quantity before placing a panel order.
// Most SMM panels have minimum order quantities of 10–50.
// Set to 10 as a safe default; operators can tune via admin panel (future).
const MIN_ENGAGEMENT_BATCH = 10;

async function handler(request: NextRequest) {
  const body = await request.json() as TickPayload;
  const { eventId, orderId, panelId, viewsBatch, reelUrl, platform = "instagram" } = body;

  if (!eventId || !orderId || !panelId || !viewsBatch || !reelUrl) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Mark event as EXECUTING
  const event = await prisma.deliveryEvent.update({
    where: { id: eventId },
    data: { status: "EXECUTING", executedAt: new Date() },
  });

  // Load panel
  const panel = await prisma.panel.findUnique({ where: { id: panelId } });
  if (!panel) {
    await prisma.deliveryEvent.update({ where: { id: eventId }, data: { status: "FAILED", errorMessage: "Panel not found" } });
    return NextResponse.json({ ok: false, error: "Panel not found" }, { status: 404 });
  }

  // Load order with current delivery state
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { reel: true } });
  if (!order) {
    await prisma.deliveryEvent.update({ where: { id: eventId }, data: { status: "FAILED", errorMessage: "Order not found" } });
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }

  const svcIds = panel.serviceIds as ServiceIds | null;
  const viewsServiceId = getServiceId(svcIds, platform, "views") ?? order.panelServiceId ?? "1";

  const startMs = Date.now();

  // ── 1. Place VIEWS order (with ±15% jitter for human-like variance) ────
  // CurvePioneer: "Real human traffic has variance. We add small random jitter
  // to each batch to prevent machine-flat delivery patterns."
  // The accumulation algorithm corrects for drift — totals always match target.
  const jitteredViewsBatch = Math.max(100, applyJitter(viewsBatch, 0.15));

  let result = await placePanelOrder({
    apiUrl: panel.apiUrl,
    apiKeyEncrypted: panel.apiKeyEncrypted,
    serviceId: viewsServiceId,
    link: reelUrl,
    quantity: jitteredViewsBatch,
  });

  const responseMs = Date.now() - startMs;

  // ── Failover if primary panel fails ──────────────────────────
  let activePanel = panel;
  if (!result.ok) {
    await cachePanelStatus(panelId, "OFFLINE");
    await prisma.panel.update({
      where: { id: panelId },
      data: { status: "OFFLINE", lastCheckedAt: new Date(), lastResponseMs: responseMs },
    });

    const failoverPanel = await prisma.panel.findFirst({
      where: { userId: order.userId, isActive: true, id: { not: panelId }, status: { not: "OFFLINE" } },
      orderBy: { priority: "asc" },
    });

    if (failoverPanel) {
      const foSvcIds = failoverPanel.serviceIds as ServiceIds | null;
      const foViewsSvcId = getServiceId(foSvcIds, platform, "views") ?? order.panelServiceId ?? "1";
      result = await placePanelOrder({
        apiUrl: failoverPanel.apiUrl,
        apiKeyEncrypted: failoverPanel.apiKeyEncrypted,
        serviceId: foViewsSvcId,
        link: reelUrl,
        quantity: Math.max(100, viewsBatch),
      });
      activePanel = failoverPanel;
      await prisma.deliveryEvent.update({ where: { id: eventId }, data: { panelId: failoverPanel.id } });
    }
  }

  if (!result.ok) {
    await prisma.deliveryEvent.update({ where: { id: eventId }, data: { status: "FAILED", errorMessage: result.error } });
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  // ── 2. ENGAGEMENT ACCUMULATION ALGORITHM ─────────────────────
  // Views succeeded. Compute engagement due based on ACTUAL jittered views delivered.
  const actualViewsDelivered = jitteredViewsBatch;
  const engagementDelivered = { likes: 0, saves: 0, shares: 0, comments: 0 };

  if (order.engagementEnabled) {
    const resData = event.responseData as any;
    let due;
    if (resData && resData.customEngagement) {
      due = {
        likes: resData.customEngagement.likes ?? 0,
        saves: resData.customEngagement.saves ?? 0,
        shares: resData.customEngagement.shares ?? 0,
        comments: resData.customEngagement.comments ?? 0,
      };
    } else {
      // viewsDeliveredNow = current delivered + this batch (use actual jittered amount)
      const viewsDeliveredNow = order.viewsDelivered + actualViewsDelivered;

      due = calculateEngagementDue(
        order.viewsTarget,
        viewsDeliveredNow,
        {
          likes:    order.likesTarget,
          saves:    order.savesTarget,
          shares:   order.sharesTarget,
          comments: order.commentsTarget,
        },
        {
          likes:    order.likesDelivered,
          saves:    order.savesDelivered,
          shares:   order.sharesDelivered,
          comments: order.commentsDelivered,
        },
        MIN_ENGAGEMENT_BATCH,
      );
    }

    const engSvcIds = activePanel.serviceIds as ServiceIds | null;
    const engagementPanelOrderIds: Record<string, string> = {};

    // Build parallel tasks only for types with due > 0 AND service ID configured
    const engTasks = (
      [
        { type: "likes",    qty: due.likes,    svcId: getServiceId(engSvcIds, platform, "likes") },
        { type: "saves",    qty: due.saves,    svcId: getServiceId(engSvcIds, platform, "saves") },
        { type: "shares",   qty: due.shares,   svcId: getServiceId(engSvcIds, platform, "shares") },
        { type: "comments", qty: due.comments, svcId: getServiceId(engSvcIds, platform, "comments") },
      ] as { type: keyof typeof engagementDelivered; qty: number; svcId: string | null }[]
    ).filter(({ qty, svcId }) => qty > 0 && svcId !== null);

    // Fire all in parallel — zero impact on views delivery timing
    await Promise.allSettled(
      engTasks.map(async ({ type, qty, svcId }) => {
        try {
          const r = await placePanelOrder({
            apiUrl: activePanel.apiUrl,
            apiKeyEncrypted: activePanel.apiKeyEncrypted,
            serviceId: svcId!,
            link: reelUrl,
            quantity: qty,
          });
          if (r.ok) {
            engagementDelivered[type] = qty;
            if (r.orderId) engagementPanelOrderIds[type] = r.orderId;
          }
        } catch {
          // Non-fatal — views already succeeded, engagement will catch up next tick
        }
      })
    );

    // Record engagement panel order IDs if any fired
    Object.assign(engagementDelivered, { engagementPanelOrderIds });
  }

  // ── 3. Record success in DB ───────────────────────────────────
  await cachePanelStatus(panelId, responseMs > 5000 ? "SLOW" : "ONLINE");

  const engPanelOrderIds = (engagementDelivered as any).engagementPanelOrderIds || {};
  const cleanedEngagementFired = {
    likes: engagementDelivered.likes,
    saves: engagementDelivered.saves,
    shares: engagementDelivered.shares,
    comments: engagementDelivered.comments,
  };

  const resData = event.responseData as any;
  await prisma.deliveryEvent.update({
    where: { id: eventId },
    data: {
      status: "DONE",
      responseData: {
        customEngagement: resData?.customEngagement,
        panelOrderId: result.orderId,
        engagementFired: cleanedEngagementFired,
        engagementPanelOrderIds: engPanelOrderIds,
        ...result.rawResponse as object,
      },
    },
  });

  // Update order progress — views + any engagement sent this tick
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      viewsDelivered:  { increment: actualViewsDelivered },
      viewsRemaining:  { decrement: actualViewsDelivered },
      // Only increment engagement counters for types that actually fired
      ...(cleanedEngagementFired.likes    > 0 ? { likesDelivered:    { increment: cleanedEngagementFired.likes    } } : {}),
      ...(cleanedEngagementFired.saves    > 0 ? { savesDelivered:    { increment: cleanedEngagementFired.saves    } } : {}),
      ...(cleanedEngagementFired.shares   > 0 ? { sharesDelivered:   { increment: cleanedEngagementFired.shares   } } : {}),
      ...(cleanedEngagementFired.comments > 0 ? { commentsDelivered: { increment: cleanedEngagementFired.comments } } : {}),
    },
  });

  const prevProgress = order.viewsDelivered / order.viewsTarget;
  const newProgress = updated.viewsDelivered / updated.viewsTarget;

  // Trigger Mid-Campaign and Completion Refill Checks
  const isMidCampaign = prevProgress < 0.5 && newProgress >= 0.5;
  const isCompleted = updated.viewsRemaining <= 0 || newProgress >= 1.0;

  if (isCompleted) {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }

  if (isMidCampaign || isCompleted) {
    try {
      console.log(`[TICK WEBHOOK] Triggering refill check for ${isMidCampaign ? '50% mark' : '100% completion'} of Order ID: ${orderId}`);
      await checkAndRefillOrder(orderId);
    } catch (err) {
      console.error("[TICK WEBHOOK] Refill check failed:", err);
    }
  }

  await prisma.panel.update({
    where: { id: panelId },
    data: { status: responseMs > 5000 ? "SLOW" : "ONLINE", lastCheckedAt: new Date(), lastResponseMs: responseMs },
  });

  return NextResponse.json({
    ok: true,
    panelOrderId: result.orderId,
    viewsDelivered: viewsBatch,
    engagementFired: cleanedEngagementFired,
  });
}

/**
 * Wrap with QStash signature verification lazily (at request time, not build time).
 * This prevents the Next.js static build from crashing when QSTASH env vars
 * are not present in the Vercel build environment.
 */
export async function POST(req: NextRequest) {
  // In production, always verify the QStash signature
  if (process.env.NODE_ENV === "production") {
    const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextKey    = process.env.QSTASH_NEXT_SIGNING_KEY;
    if (!currentKey || !nextKey) {
      return NextResponse.json({ error: "QStash signing keys not configured" }, { status: 500 });
    }
    const { verifySignatureAppRouter } = await import("@upstash/qstash/nextjs");
    return verifySignatureAppRouter(handler)(req);
  }
  // In development/staging: skip verification for easier local testing
  return handler(req);
}
