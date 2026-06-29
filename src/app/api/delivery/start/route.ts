import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { scheduleOrderDelivery } from "@/lib/delivery/schedule";

/**
 * POST /api/delivery/start
 *
 * Schedules all delivery batches for an order.
 * Events are saved to the DB with their scheduledAt times.
 *
 * Two delivery modes (automatic fallback):
 *  1. QStash mode: if QSTASH_TOKEN is set, enqueues each event as a delayed QStash message
 *  2. Cron mode:   if no QStash token, events stay in DB and are processed by
 *                  /api/cron (called every 1 min by cron-job.org)
 *
 * This means delivery works even without a paid QStash plan.
 */
export async function POST(request: NextRequest) {
  const internalKey = request.headers.get("x-internal-key");
  const expectedKey = process.env.NEXTAUTH_SECRET;
  const isInternal = expectedKey && internalKey === expectedKey;

  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { orderId } = body;
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (!isInternal) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || order.userId !== dbUser.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
  }

  // 1. Generate S-curve batches and save all delivery events to DB
  const scheduleResult = await scheduleOrderDelivery(orderId);
  if (!scheduleResult.ok) {
    return NextResponse.json({ error: scheduleResult.error }, { status: 400 });
  }

  // Mark order as DELIVERING immediately
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "DELIVERING" },
  });

  // Execute the first event instantly (so the campaign starts immediately without waiting for cron/QStash ticks)
  const firstEvent = await prisma.deliveryEvent.findFirst({
    where: { orderId, status: "SCHEDULED" },
    orderBy: { scheduledAt: "asc" },
  });
  if (firstEvent) {
    const { processEvent } = await import("@/lib/delivery/process");
    await processEvent(firstEvent.id).catch(console.error);
  }

  // 2. Try QStash if configured (faster, per-batch scheduling)
  const hasQStash = !!(process.env.QSTASH_TOKEN);
  let enqueued = 0;
  let enqueueFailed = 0;

  if (hasQStash) {
    const { scheduleDeliveryTick } = await import("@/lib/qstash");
    const events = await prisma.deliveryEvent.findMany({
      where: { orderId },
      include: { order: { include: { reel: true } } },
      orderBy: { scheduledAt: "asc" },
    });

    const now = Date.now();
    const results = await Promise.allSettled(
      events.map(async (event) => {
        const delaySeconds = Math.max(0, Math.floor((event.scheduledAt.getTime() - now) / 1000));
        const result = await scheduleDeliveryTick(
          {
            eventId: event.id,
            orderId: event.orderId,
            panelId: event.panelId,
            viewsBatch: event.viewsBatch,
            reelUrl: event.order.reel.url,
          },
          delaySeconds
        );
        await prisma.deliveryEvent.update({
          where: { id: event.id },
          data: { responseData: { qstashMessageId: result.messageId } },
        });
        return result;
      })
    );

    enqueued     = results.filter(r => r.status === "fulfilled").length;
    enqueueFailed = results.filter(r => r.status === "rejected").length;
  }

  return NextResponse.json({
    ok: true,
    mode: hasQStash ? "qstash" : "cron",
    batchCount: scheduleResult.batchCount,
    totalViews: scheduleResult.totalViews,
    enqueued:       hasQStash ? enqueued : 0,
    enqueueFailed:  hasQStash ? enqueueFailed : 0,
    message: hasQStash
      ? `Enqueued ${enqueued} batches via QStash`
      : `Saved ${scheduleResult.batchCount} batches to DB — cron-job.org will process them every minute`,
  });
}
