import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { placePanelOrder } from "@/lib/delivery/panel-client";
import { calculateEngagementDue, applyJitter } from "@/lib/delivery/curve";
import { checkAndRefillOrder } from "@/lib/delivery/refill";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron?secret=CRON_SECRET
 *
 * Called by cron-job.org every 1 minute.
 * Processes delivery events that are SCHEDULED and due (scheduledAt <= now).
 *
 * ──────────────────────────────────────────────────────────────
 * LIMITS REALITY CHECK:
 *
 * cron-job.org free:
 *   ✅ Runs every 1 min, unlimited daily, no job count limit
 *   ✅ 30-second response timeout
 *
 * Vercel free (Hobby):
 *   ⚠️  10-second function timeout per invocation
 *   → We process max PARALLEL_LIMIT events simultaneously
 *   → Each panel API call ≈ 300–2000ms
 *   → 5 parallel events = safe within 10s
 *
 * Vercel Pro:
 *   ✅ 60-second timeout → increase PARALLEL_LIMIT to 20
 *
 * For typical campaigns (e.g. 10K views over 7 days = ~30 batches total):
 *   → ~4 batches/day → 1 batch per 6 hours → 1 event per cron call
 *   → Most cron calls find 0 due events → responds in <100ms
 *
 * Setup on cron-job.org:
 *   URL:      https://yoyosmm.online/api/cron?secret=YOUR_CRON_SECRET
 *   Schedule: Every 1 minute
 *   Method:   GET
 *   Timeout:  30 seconds
 * ──────────────────────────────────────────────────────────────
 */

// Tune this based on your Vercel plan:
// Free (Hobby) = 5  →  safe within 10s timeout
// Pro          = 20 →  safe within 60s timeout
const PARALLEL_LIMIT = 5;

const MIN_ENGAGEMENT_BATCH = 10;

type ServiceIds = Record<string, Record<string, string>>;
function getSvcId(ids: ServiceIds | null, platform: string, type: string): string | null {
  if (!ids) return null;
  return ids[platform.toLowerCase()]?.[type] ?? null;
}

async function processEvent(eventId: string): Promise<{ ok: boolean; views?: number; error?: string }> {
  // Load event with all relations in one query
  const event = await prisma.deliveryEvent.findUnique({
    where: { id: eventId },
    include: {
      order: { include: { reel: true } },
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
  const platform = order.reel.platform?.toLowerCase() ?? "instagram";
  const svcIds = panel.serviceIds as ServiceIds | null;
  const viewsServiceId = getSvcId(svcIds, platform, "views") ?? order.panelServiceId ?? "1";
  const jitteredViews = applyJitter(event.viewsBatch, 0.15);
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

    const failover = await prisma.panel.findFirst({
      where: { userId: order.userId, isActive: true, id: { not: panel.id }, status: { not: "OFFLINE" } },
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
        quantity: event.viewsBatch,
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
    const viewsDeliveredNow = order.viewsDelivered + jitteredViews;
    const due = calculateEngagementDue(
      order.viewsTarget,
      viewsDeliveredNow,
      { likes: order.likesTarget, saves: order.savesTarget, shares: order.sharesTarget, comments: order.commentsTarget },
      { likes: order.likesDelivered, saves: order.savesDelivered, shares: order.sharesDelivered, comments: order.commentsDelivered },
      MIN_ENGAGEMENT_BATCH,
    );

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
        panelOrderId: result.orderId,
        engagementFired: engagementDelivered,
        ...result.rawResponse as object,
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

// ── Process a batch in parallel chunks ────────────────────────
async function parallelBatch<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<unknown>,
) {
  const results = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    const chunkResults = await Promise.allSettled(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

export async function GET(req: NextRequest) {
  const secret   = req.nextUrl.searchParams.get("secret");
  const expected = process.env.CRON_SECRET || process.env.ADMIN_SECRET;

  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET or ADMIN_SECRET env var not set" }, { status: 500 });
  }
  if (secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find ALL due SCHEDULED events
  const dueEvents = await prisma.deliveryEvent.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
      order: { status: "DELIVERING" },
    },
    orderBy: { scheduledAt: "asc" },
    // Cap at PARALLEL_LIMIT × 4 so we don't overload the DB query
    // Any extras are picked up in subsequent cron calls
    take: PARALLEL_LIMIT * 4,
    select: { id: true },
  });

  if (dueEvents.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: "No events due", timestamp: now.toISOString() });
  }

  // Process PARALLEL_LIMIT events simultaneously (not sequential!)
  // This is the key fix — panel API calls run in parallel → much faster
  const allResults = await parallelBatch(
    dueEvents.map(e => e.id),
    PARALLEL_LIMIT,
    processEvent
  );

  const succeeded = allResults.filter(r => r.status === "fulfilled" && (r.value as { ok: boolean }).ok).length;
  const failed    = allResults.filter(r => r.status === "rejected" || !(r as PromiseFulfilledResult<{ ok: boolean }>).value?.ok).length;

  return NextResponse.json({
    ok:        true,
    processed: dueEvents.length,
    succeeded,
    failed,
    parallelLimit: PARALLEL_LIMIT,
    timestamp: now.toISOString(),
  });
}
