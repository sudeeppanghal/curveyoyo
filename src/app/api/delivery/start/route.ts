import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { scheduleOrderDelivery } from "@/lib/delivery/schedule";
import { scheduleDeliveryTick } from "@/lib/qstash";

/**
 * POST /api/delivery/start
 * Called after order creation to schedule all delivery batches via QStash.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await request.json();
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  // Verify the order belongs to this user
  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== dbUser.id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // 1. Generate S-curve schedule and persist delivery events to DB
  const scheduleResult = await scheduleOrderDelivery(orderId);
  if (!scheduleResult.ok) {
    return NextResponse.json({ error: scheduleResult.error }, { status: 400 });
  }

  // 2. Enqueue each delivery event as a QStash message
  const events = await prisma.deliveryEvent.findMany({
    where: { orderId },
    include: { panel: true, order: { include: { reel: true } } },
    orderBy: { scheduledAt: "asc" },
  });

  const now = Date.now();
  const enqueueResults = await Promise.allSettled(
    events.map(async (event) => {
      const delaySeconds = Math.max(
        0,
        Math.floor((event.scheduledAt.getTime() - now) / 1000)
      );
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
      // Store message ID on the event for tracing
      await prisma.deliveryEvent.update({
        where: { id: event.id },
        data: { responseData: { qstashMessageId: result.messageId } },
      });
      return result;
    })
  );

  const succeeded = enqueueResults.filter((r) => r.status === "fulfilled").length;
  const failed = enqueueResults.filter((r) => r.status === "rejected").length;

  // Mark order as DELIVERING
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "DELIVERING" },
  });

  return NextResponse.json({
    ok: true,
    batchCount: scheduleResult.batchCount,
    totalViews: scheduleResult.totalViews,
    enqueued: succeeded,
    enqueueFailed: failed,
  });
}
