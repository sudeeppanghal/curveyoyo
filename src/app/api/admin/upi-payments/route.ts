import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processAffiliateCommission } from "@/lib/affiliate";
import { processProfitSplit } from "@/lib/profit-split";
import { notGhostWhere } from "@/lib/ghost";

const ADMIN_SECRET = process.env.ADMIN_SECRET!;

function verifyAdmin(request: NextRequest) {
  return request.headers.get("x-admin-secret") === ADMIN_SECRET;
}

// GET all UPI payments
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payments = await prisma.upiPayment.findMany({
    where: notGhostWhere(),
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    take: 1000,
  });

  return NextResponse.json({ payments });
}

// POST approve/reject a UPI payment
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { paymentId, action, rejectedReason } = body as { paymentId: string; action: "approve" | "reject"; rejectedReason?: string };

  if (!paymentId || !action) {
    return NextResponse.json({ error: "paymentId and action are required" }, { status: 400 });
  }

  const payment = await prisma.upiPayment.findUnique({
    where: { id: paymentId },
    include: { user: true },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
  }

  if (payment.status !== "PENDING") {
    return NextResponse.json({ error: `Payment is already ${payment.status}` }, { status: 400 });
  }

  if (action === "approve") {
    // Check if there is an active deposit bonus
    const now = new Date();
    const activeOffer = await prisma.announcement.findFirst({
      where: {
        offerEnabled: true,
        endsAt: { gte: now },
        minDeposit: { lte: payment.amount }
      }
    });

    let bonusAmount = 0;
    if (activeOffer) {
      bonusAmount = payment.amount * (activeOffer.bonusPercent / 100);
    }

    // Approve: increment user balance + set payment status CONFIRMED
    await prisma.$transaction([
      prisma.upiPayment.update({
        where: { id: paymentId },
        data: { status: "CONFIRMED" },
      }),
      prisma.user.update({
        where: { id: payment.userId },
        data: { 
          balance: { increment: payment.amount },
          ...(bonusAmount > 0 ? { bonusBalance: { increment: bonusAmount } } : {})
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: payment.userId,
          action: "UPI_DEPOSIT_APPROVED",
          metadata: { 
            paymentId, 
            amount: payment.amount, 
            utr: payment.utr,
            ...(bonusAmount > 0 ? { bonusAmount, announcementId: activeOffer?.id } : {})
          },
        },
      }),
    ]);

    await processAffiliateCommission(payment.userId, payment.amount);
    await processProfitSplit(payment.id, "UPI", payment.amount);

    return NextResponse.json({ ok: true, status: "CONFIRMED" });
  } else if (action === "reject") {
    // Reject: set payment status REJECTED
    await prisma.$transaction([
      prisma.upiPayment.update({
        where: { id: paymentId },
        data: { status: "REJECTED", rejectedReason: rejectedReason ?? "Rejected by admin" },
      }),
      prisma.auditLog.create({
        data: {
          userId: payment.userId,
          action: "UPI_DEPOSIT_REJECTED",
          metadata: { paymentId, amount: payment.amount, utr: payment.utr, reason: rejectedReason },
        },
      }),
    ]);

    return NextResponse.json({ ok: true, status: "REJECTED" });
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}
