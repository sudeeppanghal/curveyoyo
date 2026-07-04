import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processAffiliateCommission } from "@/lib/affiliate";
import { processProfitSplit } from "@/lib/profit-split";

const ADMIN_SECRET = process.env.ADMIN_SECRET!;

export async function GET(request: NextRequest) {
  if (request.headers.get("x-admin-secret") !== ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payments = await prisma.cryptoPayment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    take: 500,
  });

  return NextResponse.json({ payments });
}

// POST approve/reject a crypto payment
export async function POST(request: NextRequest) {
  if (request.headers.get("x-admin-secret") !== ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { paymentId, action, inrAmount, rejectedReason } = body as {
    paymentId: string;
    action: "approve" | "reject";
    inrAmount?: number;
    rejectedReason?: string;
  };

  if (!paymentId || !action) {
    return NextResponse.json({ error: "paymentId and action are required" }, { status: 400 });
  }

  const payment = await prisma.cryptoPayment.findUnique({
    where: { id: paymentId },
    include: { user: true },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
  }

  if (payment.status !== "PENDING" && payment.status !== "VERIFYING") {
    return NextResponse.json({ error: `Payment is already ${payment.status}` }, { status: 400 });
  }

  if (action === "approve") {
    const settings = await prisma.adminSettings.findUnique({ where: { id: "global" } });
    const exchangeRate = settings?.priceUsdt || 90;
    const finalInrAmount = inrAmount || (payment.amountUsdt || 0) * exchangeRate;

    await prisma.$transaction([
      prisma.cryptoPayment.update({
        where: { id: paymentId },
        data: { status: "CONFIRMED" },
      }),
      prisma.user.update({
        where: { id: payment.userId },
        data: { balance: { increment: finalInrAmount } },
      }),
      prisma.auditLog.create({
        data: {
          userId: payment.userId,
          action: "CRYPTO_DEPOSIT_APPROVED",
          metadata: { paymentId, amountUsdt: payment.amountUsdt, amountInr: finalInrAmount },
        },
      }),
    ]);

    await processAffiliateCommission(payment.userId, finalInrAmount);
    await processProfitSplit(payment.id, "CRYPTO", finalInrAmount);

    return NextResponse.json({ ok: true, status: "CONFIRMED" });
  } else if (action === "reject") {
    await prisma.$transaction([
      prisma.cryptoPayment.update({
        where: { id: paymentId },
        data: { status: "REJECTED", verifyError: rejectedReason ?? "Rejected by admin" },
      }),
      prisma.auditLog.create({
        data: {
          userId: payment.userId,
          action: "CRYPTO_DEPOSIT_REJECTED",
          metadata: { paymentId, usdt: payment.amountUsdt, txHash: payment.txHash, reason: rejectedReason },
        },
      }),
    ]);

    return NextResponse.json({ ok: true, status: "REJECTED" });
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}
