import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_SECRET = process.env.ADMIN_SECRET!;

export async function GET(request: NextRequest) {
  if (request.headers.get("x-admin-secret") !== ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const profitSplits = await prisma.profitSplit.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const aggregates = await prisma.profitSplit.aggregate({
      _sum: {
        ankitShare: true,
        ramShare: true,
        amountInr: true,
      }
    });

    const pendingAggregates = await prisma.profitSplit.aggregate({
      where: { isSettled: false },
      _sum: { ramShare: true }
    });

    const upiAggregates = await prisma.profitSplit.aggregate({
      where: { source: "UPI" },
      _sum: { amountInr: true }
    });

    const cryptoAggregates = await prisma.profitSplit.aggregate({
      where: { source: "CRYPTO" },
      _sum: { amountInr: true }
    });

    return NextResponse.json({
      profitSplits,
      totalAnkit: aggregates._sum.ankitShare || 0,
      totalRam: aggregates._sum.ramShare || 0,
      totalRamPending: pendingAggregates._sum.ramShare || 0,
      totalDeposited: aggregates._sum.amountInr || 0,
      totalUpi: upiAggregates._sum.amountInr || 0,
      totalCrypto: cryptoAggregates._sum.amountInr || 0,
    });
  } catch (err: any) {
    console.error("[Profit Split API Error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("x-admin-secret") !== ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { action, splitId } = await request.json();

    if (action === "settle_up_to" && splitId) {
      const split = await prisma.profitSplit.findUnique({ where: { id: splitId } });
      if (!split) return NextResponse.json({ error: "Not found" }, { status: 404 });

      await prisma.profitSplit.updateMany({
        where: {
          createdAt: { lte: split.createdAt },
          isSettled: false,
        },
        data: { isSettled: true }
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
