import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAndRefillOrder } from "@/lib/delivery/refill";
import { OrderStatus } from "@prisma/client";
import { triggerMidwayRefund } from "@/lib/delivery/refund";

const ADMIN_SECRET = process.env.ADMIN_SECRET!;

function isAdmin(request: NextRequest) {
  return request.headers.get("x-admin-secret") === ADMIN_SECRET;
}

// GET all campaigns (orders) on the platform
export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true, name: true } },
      reel: { select: { url: true, platform: true } },
      panel: { select: { name: true } },
    },
    take: 500, // Limit to recent 500
  });

  return NextResponse.json({ orders });
}

// PATCH admin-override campaign actions (pause/cancel/refill/resume)
export async function PATCH(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { orderId, action } = body as { orderId: string; action: "pause" | "cancel" | "refill" | "resume" };

  if (!orderId || !action) {
    return NextResponse.json({ error: "orderId and action are required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (action === "refill") {
    try {
      const refillRes = await checkAndRefillOrder(orderId);
      return NextResponse.json({ message: "Manual refill check completed", ...refillRes });
    } catch (err: any) {
      return NextResponse.json({ error: `Refill failed: ${err.message}` }, { status: 500 });
    }
  }

  let newStatus: OrderStatus;
  if (action === "pause") {
    newStatus = "PAUSED";
  } else if (action === "cancel") {
    newStatus = "CANCELLED";
  } else if (action === "resume") {
    newStatus = "DELIVERING";
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus },
  });

  if (action === "pause" || action === "cancel") {
    // Cancel scheduled events
    await prisma.deliveryEvent.updateMany({
      where: { orderId, status: "SCHEDULED" },
      data: { status: "FAILED", errorMessage: `Order ${action}d by administrator` },
    });
    if (action === "cancel") {
      await triggerMidwayRefund(orderId);
    }
  } else if (action === "resume") {
    // Re-schedule failed/paused events that are scheduled for the future
    await prisma.deliveryEvent.updateMany({
      where: { orderId, status: "FAILED", errorMessage: { contains: "administrator" } },
      data: { status: "SCHEDULED", errorMessage: null },
    });
  }

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId: order.userId,
      action: `ADMIN_${action.toUpperCase()}_ORDER`,
      metadata: { orderId },
    },
  });

  return NextResponse.json({ ok: true, status: newStatus });
}
