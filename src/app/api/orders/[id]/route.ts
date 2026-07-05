import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { triggerMidwayRefund } from "@/lib/delivery/refund";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id: orderId } = await params;
    const body = await req.json();
    const { action } = body as { action: "pause" | "cancel" | "resume" };

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.userId !== dbUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let newStatus: OrderStatus;
    if (action === "pause") {
      if (order.status !== "QUEUED" && order.status !== "DELIVERING") {
        return NextResponse.json({ error: "Order cannot be paused in its current state" }, { status: 400 });
      }
      newStatus = "PAUSED";
    } else if (action === "cancel") {
      if (order.status === "COMPLETED" || order.status === "CANCELLED") {
        return NextResponse.json({ error: "Order is already completed or cancelled" }, { status: 400 });
      }
      newStatus = "CANCELLED";
    } else if (action === "resume") {
      if (order.status !== "PAUSED") {
        return NextResponse.json({ error: "Order is not paused" }, { status: 400 });
      }
      newStatus = order.viewsDelivered === 0 ? "QUEUED" : "DELIVERING";
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
        data: { status: "FAILED", errorMessage: `Order ${action}d by user` },
      });
      if (action === "cancel") {
        await triggerMidwayRefund(orderId);
      }
    } else if (action === "resume") {
      // Re-schedule failed/paused events that were cancelled by user or admin
      await prisma.deliveryEvent.updateMany({
        where: { 
          orderId, 
          status: "FAILED", 
          OR: [
            { errorMessage: { contains: "user" } },
            { errorMessage: { contains: "administrator" } }
          ]
        },
        data: { status: "SCHEDULED", errorMessage: null },
      });
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
  } catch (error: any) {
    console.error("Order Action API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
