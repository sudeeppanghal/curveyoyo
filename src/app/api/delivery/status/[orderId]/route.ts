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
  const totalViews = order.viewsTarget || 1;
  const chartData = order.deliveryEvents.map((e) => {
    const firstEventTime = order.deliveryEvents[0]?.scheduledAt.getTime() ?? new Date().getTime();
    const hourOffset = Math.round((e.scheduledAt.getTime() - firstEventTime) / (1000 * 60 * 60));
    
    const isExecuted = e.status === "DONE" || e.status === "FAILED";
    const resData = e.responseData as any;
    const fired = resData?.engagementFired;
    const custom = resData?.customEngagement;

    // Planned engagement = proportional share of total targets for this batch
    const batchFraction = e.viewsBatch / totalViews;
    const plannedLikes    = order.likesTarget    > 0 ? Math.round(order.likesTarget    * batchFraction) : null;
    const plannedSaves    = order.savesTarget    > 0 ? Math.round(order.savesTarget    * batchFraction) : null;
    const plannedShares   = order.sharesTarget   > 0 ? Math.round(order.sharesTarget   * batchFraction) : null;
    const plannedComments = order.commentsTarget > 0 ? Math.round(order.commentsTarget * batchFraction) : null;
    const plannedReposts  = (order as any).repostsTarget > 0 ? Math.round((order as any).repostsTarget * batchFraction) : null;

    return {
      hour: hourOffset,
      planned: e.viewsBatch,
      actual: e.status === "DONE" ? e.viewsBatch : 0,
      // Actual fired values for completed batches, planned estimate for future
      likes:    isExecuted ? (fired?.likes    ?? custom?.likes    ?? 0) : plannedLikes,
      saves:    isExecuted ? (fired?.saves    ?? custom?.saves    ?? 0) : plannedSaves,
      shares:   isExecuted ? (fired?.shares   ?? custom?.shares   ?? 0) : plannedShares,
      comments: isExecuted ? (fired?.comments ?? custom?.comments ?? 0) : plannedComments,
      reposts:  isExecuted ? (fired?.reposts  ?? custom?.reposts  ?? 0) : plannedReposts,
      isPlanned: !isExecuted, // flag so UI can show "~" prefix for estimates
      status: e.status,
      scheduledAt: e.scheduledAt,
      responseData: e.responseData,
    };
  });

  // Load verification queue items mapping
  const videoOrder = await prisma.videoOrder.findFirst({
    where: {
      video: { url: order.reel.url },
      userId: dbUser.id,
    },
    include: {
      queueItems: {
        orderBy: { partNumber: "asc" }
      }
    }
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
    email: dbUser.email,
    totalBatches: order.deliveryEvents.length,
    completedBatches: order.deliveryEvents.filter((e) => e.status === "DONE").length,
    failedBatches: order.deliveryEvents.filter((e) => e.status === "FAILED").length,
    verificationQueueItems: videoOrder ? videoOrder.queueItems : [],
    verificationOrderStatus: videoOrder ? videoOrder.status : "PENDING",
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
  const { action } = await request.json() as { action: "pause" | "cancel" | "resume" };

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { isGhostEmail } = await import("@/lib/ghost");
  if (action === "cancel" && !isGhostEmail(dbUser.email)) {
    return NextResponse.json({ error: "Cancellation is disabled for your account." }, { status: 403 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== dbUser.id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (action === "resume") {
    // Calculate net refunds for this order
    const refunds = await prisma.auditLog.findMany({
      where: { userId: dbUser.id, action: "ORDER_MIDWAY_REFUND" }
    });
    const charges = await prisma.auditLog.findMany({
      where: { userId: dbUser.id, action: "ORDER_RESUME_CHARGE" }
    });
    
    let totalRefunded = 0;
    refunds.forEach(r => {
      const meta = r.metadata as any;
      if (meta && meta.orderId === orderId && meta.refundAmount) {
        totalRefunded += meta.refundAmount;
      }
    });
    
    let totalCharged = 0;
    charges.forEach(c => {
      const meta = c.metadata as any;
      if (meta && meta.orderId === orderId && meta.chargeAmount) {
        totalCharged += meta.chargeAmount;
      }
    });

    const netRefund = totalRefunded - totalCharged;

    if (netRefund > 0) {
      if (dbUser.balance < netRefund) {
        return NextResponse.json({ error: `Insufficient balance. Need ₹${netRefund.toFixed(2)} to resume.` }, { status: 400 });
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: dbUser.id },
          data: { balance: { decrement: netRefund } }
        }),
        prisma.auditLog.create({
          data: {
            userId: dbUser.id,
            action: "ORDER_RESUME_CHARGE",
            metadata: {
              orderId,
              chargeAmount: netRefund,
              reason: "Resumed previously refunded order"
            }
          }
        }),
        prisma.order.update({
          where: { id: orderId },
          data: { status: "QUEUED" } // Set back to QUEUED so tick processes it
        })
      ]);
    } else {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "QUEUED" }
      });
    }

    return NextResponse.json({ ok: true, status: "QUEUED" });
  }

  const newStatus = action === "cancel" ? "CANCELLED" : "PAUSED";
  await prisma.order.update({ where: { id: orderId }, data: { status: newStatus } });

  // Cancel pending delivery events
  await prisma.deliveryEvent.updateMany({
    where: { orderId, status: "SCHEDULED" },
    data: { status: "FAILED", errorMessage: `Order ${newStatus.toLowerCase()} by user` },
  });

  if (action === "cancel") {
    await triggerMidwayRefund(orderId, true);
  }

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId: order.userId,
      action: `USER_${action.toUpperCase()}_ORDER`,
      metadata: { orderId },
    },
  });

  return NextResponse.json({ ok: true, status: newStatus });
}
