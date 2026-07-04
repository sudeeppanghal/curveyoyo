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
      take: 1000,
    });

    const totalAnkit = profitSplits.reduce((acc, curr) => acc + curr.ankitShare, 0);
    const totalRam = profitSplits.reduce((acc, curr) => acc + curr.ramShare, 0);
    const totalDeposited = profitSplits.reduce((acc, curr) => acc + curr.amountInr, 0);

    return NextResponse.json({
      profitSplits,
      totalAnkit,
      totalRam,
      totalDeposited,
    });
  } catch (err: any) {
    console.error("[Profit Split API Error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
