import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ADMIN_SECRET = process.env.ADMIN_SECRET!;

function isAdmin(request: NextRequest) {
  return request.headers.get("x-admin-secret") === ADMIN_SECRET;
}

let adminSystemCache: any = null;
let adminSystemCacheTime = 0;
const CACHE_TTL = 60_000;

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";
  const nowTime = Date.now();
  if (!forceRefresh && adminSystemCache && (nowTime - adminSystemCacheTime < CACHE_TTL)) {
    return NextResponse.json(adminSystemCache, {
      headers: { "Cache-Control": "public, max-age=60" }
    });
  }

  const EXCLUDED_EMAILS = ["arpitasumanekka@gmail.com", "kg44314@gmail.com"];
  const fourteenDaysAgo = new Date(nowTime - 14 * 24 * 60 * 60 * 1000);

  // Parallel database queries for instant response
  const [
    events,
    panels,
    orderStats,
    eventStats,
    totalDepositInrRes,
    confirmedCrypto,
    totalRevenueRes,
    recentOrders
  ] = await Promise.all([
    // 1. Fetch recent delivery events
    prisma.deliveryEvent.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            id: true,
            curveStyle: true,
            reel: { select: { url: true, platform: true } },
            user: { select: { email: true } },
          },
        },
        panel: {
          select: {
            name: true,
            apiUrl: true,
          },
        },
      },
    }),

    // 2. Fetch user panel connections
    prisma.panel.findMany({
      orderBy: { priority: "asc" },
      include: {
        user: { select: { email: true } },
      },
      take: 50,
    }),

    // 3. Count statuses
    prisma.order.groupBy({
      by: ["status"],
      _count: { id: true },
    }),

    prisma.deliveryEvent.groupBy({
      by: ["status"],
      _count: { id: true },
    }),

    // 4. Calculate Total Deposit (INR - excluding admin users)
    prisma.upiPayment.aggregate({
      where: {
        status: "CONFIRMED",
        user: { email: { notIn: EXCLUDED_EMAILS } },
      },
      _sum: { amount: true },
    }),

    prisma.cryptoPayment.findMany({
      where: {
        status: "CONFIRMED",
        user: { email: { notIn: EXCLUDED_EMAILS } },
      },
      select: { amountUsdt: true },
    }),

    // Total Overall Revenue (excluding admin users)
    prisma.order.aggregate({
      where: {
        status: { in: ["COMPLETED", "DELIVERING"] },
        user: { email: { notIn: EXCLUDED_EMAILS } },
      },
      _sum: { priceCharged: true },
    }),

    // 14-Day recent orders for trend chart calculation (excluding admin users)
    prisma.order.findMany({
      where: {
        createdAt: { gte: fourteenDaysAgo },
        user: { email: { notIn: EXCLUDED_EMAILS } },
      },
      include: {
        reel: { select: { platform: true } },
      },
      orderBy: { createdAt: "asc" },
    })
  ]);

  let totalDepositInr = totalDepositInrRes._sum.amount ?? 0;
  for (const cp of confirmedCrypto) {
    totalDepositInr += Math.round((cp.amountUsdt ?? 0) * 96);
  }

  const totalRevenueInr = parseFloat((totalRevenueRes._sum.priceCharged ?? 0).toFixed(2));

  // Build 14-day trend map
  const now = new Date();
  const dailyMap = new Map<string, { dateStr: string; profit: number; revenue: number; orders: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    dailyMap.set(dateStr, { dateStr, profit: 0, revenue: 0, orders: 0 });
  }

  for (const order of recentOrders) {
    const dateStr = order.createdAt.toISOString().split("T")[0];
    const entry = dailyMap.get(dateStr);
    if (entry) {
      entry.revenue += order.priceCharged;
      entry.profit += order.priceCharged * 0.45;
      entry.orders += 1;
    }
  }

  const dailyFinancials = Array.from(dailyMap.values()).map(e => ({
    ...e,
    profit: parseFloat(e.profit.toFixed(2)),
    revenue: parseFloat(e.revenue.toFixed(2))
  }));

  // Map to Array format expected by admin UI: [{ status: string, count: number }]
  const formattedOrderStats = orderStats.map((s) => ({ status: s.status, count: s._count.id }));
  const formattedEventStats = eventStats.map((s) => ({ status: s.status, count: s._count.id }));

  const payload = {
    events,
    panels,
    orderStats: formattedOrderStats,
    eventStats: formattedEventStats,
    totalDepositInr: Math.round(totalDepositInr),
    totalRevenueInr,
    dailyFinancials,
  };

  adminSystemCache = payload;
  adminSystemCacheTime = nowTime;

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, max-age=60" }
  });
}