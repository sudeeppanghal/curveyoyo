import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { triggerMidwayRefund } from "@/lib/delivery/refund";

/**
 * GET /api/delivery/status/[orderId]
 * Returns live delivery status, progress %, and per-hour event data for charting.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await params;
  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      reel: { select: { url: true, platform: true } },
      panel: { select: { name: true, status: true } },
      deliveryEvents: {
        orderBy: { scheduledAt: "asc" },
        select: {
          id: true,
          viewsBatch: true,
          scheduledAt: true,
          executedAt: true,
          status: true,
          errorMessage: true,
          responseData: true,
        },
      },
    },
  });

  if (!order || order.userId !== dbUser.id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const progressPct = order.viewsTarget > 0
    ? Math.min(100, Math.round((order.viewsDelivered / order.viewsTarget) * 100))
    : 0;

  // Build chart data: planned vs actual per hour
  const chartData = order.deliveryEvents.map((e) => {
    const firstEventTime = order.deliveryEvents[0]?.scheduledAt.getTime() ?? new Date().getTime();
    const hourOffset = Math.round((e.scheduledAt.getTime() - firstEventTime) / (1000 * 60 * 60));
    return {
      hour: hourOffset,
      planned: e.viewsBatch,
      actual: e.status === "DONE" ? e.viewsBatch : 0,
      status: e.status,
      scheduledAt: e.scheduledAt,
      responseData: e.responseData,
    };
  });

  return NextResponse.json({
    order: {
      id: order.id,
      status: order.status,
      viewsTarget: order.viewsTarget,
      viewsDelivered: order.viewsDelivered,
      viewsRemaining: order.viewsRemaining,
      progressPct,
      curveStyle: order.curveStyle,
      durationHours: order.durationHours,
      startedAt: order.startedAt,
      completedAt: order.completedAt,
      reel: order.reel,
      panel: order.panel,
      // Engagement fields
      engagementEnabled: order.engagementEnabled,
      likesTarget: order.likesTarget,       likesDelivered: order.likesDelivered,
      savesTarget: order.savesTarget,       savesDelivered: order.savesDelivered,
      sharesTarget: order.sharesTarget,     sharesDelivered: order.sharesDelivered,
      commentsTarget: order.commentsTarget, commentsDelivered: order.commentsDelivered,
    },
    chartData,
    totalBatches: order.deliveryEvents.length,
    completedBatches: order.deliveryEvents.filter((e) => e.status === "DONE").length,
    failedBatches: order.deliveryEvents.filter((e) => e.status === "FAILED").length,
  });
}

/**
 * PATCH /api/delivery/status/[orderId]
 * Pause or cancel an order.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId } = await params;
  const { action } = await request.json() as { action: "pause" | "cancel" };

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== dbUser?.id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const newStatus = action === "cancel" ? "CANCELLED" : "PAUSED";
  await prisma.order.update({ where: { id: orderId }, data: { status: newStatus } });

  // Cancel pending delivery events
  await prisma.deliveryEvent.updateMany({
    where: { orderId, status: "SCHEDULED" },
    data: { status: "FAILED", errorMessage: `Order ${newStatus.toLowerCase()} by user` },
  });

  if (action === "cancel") {
    await triggerMidwayRefund(orderId);
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
