import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  const expected = process.env.CRON_SECRET || process.env.ADMIN_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Find failed/cancelled orders in the last 24 hours due to Service ID issues
    const failedOrders = await prisma.order.findMany({
      where: {
        status: { in: ["FAILED", "CANCELLED"] },
        failReason: "Incorrect service ID",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      include: { user: true }
    });

    const results = [];

    for (const o of failedOrders) {
      // Find the refund audit log for this order
      const refundLog = await prisma.auditLog.findFirst({
        where: {
          action: "ORDER_MIDWAY_REFUND",
          metadata: {
            path: ["orderId"],
            equals: o.id
          }
        }
      });

      const refundedAmount = refundLog ? (refundLog.metadata as any).refundAmount || 0 : 0;

      // 2. Perform database transaction to revert refund (if refunded) and resume order
      await prisma.$transaction(async (tx) => {
        // Re-charge user the refunded amount
        if (refundedAmount > 0 && o.user.walletMode) {
          await tx.user.update({
            where: { id: o.userId },
            data: { balance: { decrement: refundedAmount } }
          });
          
          await tx.auditLog.create({
            data: {
              userId: o.userId,
              action: "ORDER_RESUME_CHARGE",
              metadata: {
                orderId: o.id,
                chargeAmount: refundedAmount,
                originalRefundAmount: refundedAmount
              }
            }
          });
        }

        // Reset all failed delivery events for this order to SCHEDULED and set their time to NOW
        await tx.deliveryEvent.updateMany({
          where: {
            orderId: o.id,
            status: "FAILED"
          },
          data: {
            status: "SCHEDULED",
            scheduledAt: new Date(),
            errorMessage: null
          }
        });

        // Set order back to DELIVERING
        await tx.order.update({
          where: { id: o.id },
          data: {
            status: "DELIVERING",
            failReason: null
          }
        });
      });

      results.push({
        orderId: o.id,
        user: o.user.email,
        refundedAmountRecharged: refundedAmount,
        status: "RESUMED_DELIVERING"
      });
    }

    return NextResponse.json({ success: true, resumedCount: results.length, resumed: results });
  } catch (error) {
    console.error("Resume Failures Error:", error);
    return NextResponse.json({ success: true, error: String(error) }, { status: 500 });
  }
}
