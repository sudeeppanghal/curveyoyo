import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_SECRET = process.env.ADMIN_SECRET!;

function isAdmin(request: NextRequest) {
  return request.headers.get("x-admin-secret") === ADMIN_SECRET;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (await params).id;

  try {
    const upiPayments = await prisma.upiPayment.findMany({
      where: { userId, status: "CONFIRMED" },
      orderBy: { createdAt: "desc" },
    });

    const cryptoPayments = await prisma.cryptoPayment.findMany({
      where: { userId, status: "CONFIRMED" },
      orderBy: { createdAt: "desc" },
    });

    // Map to unified format
    const deposits = [
      ...upiPayments.map(p => ({
        id: p.id,
        type: "UPI",
        amount: p.amount,
        currency: "INR",
        txId: p.utr || "N/A",
        date: p.createdAt,
      })),
      ...cryptoPayments.map(p => ({
        id: p.id,
        type: "Crypto",
        amount: p.amountUsdt,
        currency: "USDT",
        txId: p.txHash || "N/A",
        date: p.createdAt,
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ deposits });
  } catch (error) {
    console.error("Error fetching user history:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
