import { prisma } from "@/lib/prisma";
import { placePanelOrder } from "@/lib/delivery/panel-client";
import { calculateEngagementDue, applyJitter } from "@/lib/delivery/curve";
import { checkAndRefillOrder } from "@/lib/delivery/refill";

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

  if (!event || !event.order || !event.panel) return { ok: false, error: "Event not found" };

  // Guard: skip if already processed (race condition between parallel workers)
  if (event.status !== "SCHEDULED") return { ok: false, error: `Skipped: status=${event.status}` };

  // Atomic status update — prevents double-processing if two cron calls overlap
  const claimed = await prisma.deliveryEvent.updateMany({
    where: { id: eventId, status: "SCHEDULED" },
    data: { status: "EXECUTING", executedAt: new Date() },
  });
  if (claimed.count === 0) return { ok: false, error: "Already claimed by another worker" };

  const { order, panel } = event;
  const resData = event.responseData as any;
  const platform = order.reel.platform?.toLowerCase() ?? "instagram";
  const svcIds = panel.serviceIds as ServiceIds | null;
  const viewsServiceId = getSvcId(svcIds, platform, "views") ?? order.panelServiceId ?? "1";
  const jitteredViews = Math.max(100, applyJitter(event.viewsBatch, 0.15));
  const startMs = Date.now();

  // ── Place views order ──────────────────────────────────────
  let result = await placePanelOrder({
    apiUrl: panel.apiUrl,
    apiKeyEncrypted: panel.apiKeyEncrypted,
    serviceId: viewsServiceId,
    link: order.reel.url,
    quantity: jitteredViews,
  });

  const responseMs = Date.now() - startMs;
  let activePanel = panel;

  // ── Failover if primary panel offline ─────────────────────
  if (!result.ok) {
    await prisma.panel.update({
      where: { id: panel.id },
      data: { status: "OFFLINE", lastCheckedAt: new Date(), lastResponseMs: responseMs },
    });

    const isWallet = order.user.walletMode;
    const failover = await prisma.panel.findFirst({
      where: {
        userId: isWallet ? null : order.userId,
        isActive: true,
        id: { not: panel.id },
        status: { not: "OFFLINE" }
      },
      orderBy: { priority: "asc" },
    });

    if (failover) {
      const foIds = failover.serviceIds as ServiceIds | null;
      const foSvcId = getSvcId(foIds, platform, "views") ?? order.panelServiceId ?? "1";
      result = await placePanelOrder({
        apiUrl: failover.apiUrl,
        apiKeyEncrypted: failover.apiKeyEncrypted,
        serviceId: foSvcId,
        link: order.reel.url,
        quantity: Math.max(100, event.viewsBatch),
      });
      activePanel = failover;
      await prisma.deliveryEvent.update({ where: { id: eventId }, data: { panelId: failover.id } });
    }
  }

  if (!result.ok) {
    await prisma.deliveryEvent.update({
      where: { id: eventId },
      data: { status: "FAILED", errorMessage: result.error },
    });
    return { ok: false, error: result.error };
  }

  // ── Engagement accumulation ────────────────────────────────
  const engagementDelivered = { likes: 0, saves: 0, shares: 0, comments: 0 };

  if (order.engagementEnabled) {
    let due;
    if (resData && resData.customEngagement) {
      due = {
        likes: resData.customEngagement.likes ?? 0,
        saves: resData.customEngagement.saves ?? 0,
        shares: resData.customEngagement.shares ?? 0,
        comments: resData.customEngagement.comments ?? 0,
      };
    } else {
      const viewsDeliveredNow = order.viewsDelivered + jitteredViews;
      due = calculateEngagementDue(
        order.viewsTarget,
        viewsDeliveredNow,
        { likes: order.likesTarget, saves: order.savesTarget, shares: order.sharesTarget, comments: order.commentsTarget },
        { likes: order.likesDelivered, saves: order.savesDelivered, shares: order.sharesDelivered, comments: order.commentsDelivered },
        MIN_ENGAGEMENT_BATCH,
      );
    }

    const engIds = activePanel.serviceIds as ServiceIds | null;
    const tasks = (
      [
        { type: "likes"    as const, qty: due.likes,    svcId: getSvcId(engIds, platform, "likes") },
        { type: "saves"    as const, qty: due.saves,    svcId: getSvcId(engIds, platform, "saves") },
        { type: "shares"   as const, qty: due.shares,   svcId: getSvcId(engIds, platform, "shares") },
        { type: "comments" as const, qty: due.comments, svcId: getSvcId(engIds, platform, "comments") },
      ]
    ).filter(t => t.qty > 0 && t.svcId !== null);

    await Promise.allSettled(
      tasks.map(async ({ type, qty, svcId }) => {
        try {
          const r = await placePanelOrder({
            apiUrl: activePanel.apiUrl,
            apiKeyEncrypted: activePanel.apiKeyEncrypted,
            serviceId: svcId!,
            link: order.reel.url,
            quantity: qty,
          });
          if (r.ok) engagementDelivered[type] = qty;
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
    },
  });

  await prisma.panel.update({
    where: { id: panel.id },
    data: { status: responseMs > 5000 ? "SLOW" : "ONLINE", lastCheckedAt: new Date(), lastResponseMs: responseMs },
  });

  const prevProgress = order.viewsDelivered / order.viewsTarget;
  const newProgress  = updated.viewsDelivered / updated.viewsTarget;
  const isCompleted  = updated.viewsRemaining <= 0 || newProgress >= 1.0;

  if (isCompleted) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }

  const isMidCampaign = prevProgress < 0.5 && newProgress >= 0.5;
  if (isMidCampaign || isCompleted) {
    try { await checkAndRefillOrder(order.id); } catch { /* non-fatal */ }
  }

  return { ok: true, views: jitteredViews };
}
