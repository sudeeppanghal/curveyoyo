import { prisma } from "@/lib/prisma";
import { generateDeliverySchedule } from "@/lib/delivery/curve";
import type { CurveParams } from "@/lib/delivery/curve";

/**
 * Schedules all delivery events for an order in the DB.
 * Then enqueues each batch as a QStash message with the correct delay.
 *
 * IMPORTANT: QStash scheduling is done via the /api/delivery/start route
 * which calls this after order creation so we have the order ID.
 */
export async function scheduleOrderDelivery(orderId: string): Promise<{
  ok: boolean;
  batchCount: number;
  totalViews: number;
  error?: string;
}> {
  // Load order + reel + first active panel
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      reel: true,
      user: {
        include: {
          panels: {
            where: { isActive: true },
            orderBy: { priority: "asc" },
          },
        },
      },
    },
  });

  if (!order) return { ok: false, batchCount: 0, totalViews: 0, error: "Order not found" };
  if (!order.user.panels.length) return { ok: false, batchCount: 0, totalViews: 0, error: "No active panels" };

  const primaryPanel = order.user.panels[0];

  // Generate the S-curve batches
  const params: CurveParams = {
    totalViews: order.viewsTarget,
    durationHours: order.durationHours,
    warmupHours: order.warmupHours,
    peakHours: order.peakHours,
    style: order.curveStyle,
  };
  const batches = generateDeliverySchedule(params);

  // Persist all delivery events to DB
  const now = new Date();
  await prisma.deliveryEvent.createMany({
    data: batches.map((batch) => ({
      orderId: order.id,
      panelId: primaryPanel.id,
      viewsBatch: batch.views,
      scheduledAt: new Date(now.getTime() + batch.scheduledDelayMs),
      status: "SCHEDULED",
    })),
  });

  // Mark order as QUEUED + record start time + assign panel
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "QUEUED",
      startedAt: now,
      panelId: primaryPanel.id,
    },
  });

  return {
    ok: true,
    batchCount: batches.length,
    totalViews: batches.reduce((a, b) => a + b.views, 0),
  };
}
