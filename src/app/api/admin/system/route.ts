import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_SECRET = process.env.ADMIN_SECRET!;

function isAdmin(request: NextRequest) {
  return request.headers.get("x-admin-secret") === ADMIN_SECRET;
}

// GET platform system health details
export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // 1. Fetch recent delivery events (the ticks)
  const events = await prisma.deliveryEvent.findMany({
    take: 100,
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
  });

  // 2. Fetch all user panel connections
  const panels = await prisma.panel.findMany({
    orderBy: { lastCheckedAt: "desc" },
    include: {
      user: { select: { email: true } },
    },
    take: 100,
  });

  // 3. Count statuses for summary
  const orderStats = await prisma.order.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  const eventStats = await prisma.deliveryEvent.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  // 4. Calculate Total Deposit (INR)
  const totalDepositInrRes = await prisma.upiPayment.aggregate({
    where: { status: "CONFIRMED" },
    _sum: { amount: true },
  });
  const totalDepositInr = totalDepositInrRes._sum.amount ?? 0;

  // 5. Calculate Total Profit and Revenue (INR)
  const allOrders = await prisma.order.findMany({
    include: {
      reel: { select: { platform: true } }
    }
  });

  const adminServices = await prisma.adminService.findMany();
  const rateMap = new Map<string, number>();
  adminServices.forEach(s => {
    rateMap.set(`${s.panelId}:${s.platform}:${s.type}`, s.originalRate);
  });

  let totalProfitInr = 0;
  let totalRevenueInr = 0;

  for (const order of allOrders) {
    totalRevenueInr += order.priceCharged;
    
    let providerCostUsd = 0;
    const panelId = order.panelId;
    const platform = order.reel?.platform;
    
    if (panelId && platform) {
      const getOriginalRate = (type: string) => rateMap.get(`${panelId}:${platform}:${type}`) ?? 0;
      providerCostUsd += (order.viewsTarget / 1000) * getOriginalRate("views");
      providerCostUsd += (order.likesTarget / 1000) * getOriginalRate("likes");
      providerCostUsd += (order.savesTarget / 1000) * getOriginalRate("saves");
      providerCostUsd += (order.sharesTarget / 1000) * getOriginalRate("shares");
      providerCostUsd += (order.commentsTarget / 1000) * getOriginalRate("comments");
    }
    
    const providerCostInr = providerCostUsd * 83;
    totalProfitInr += (order.priceCharged - providerCostInr);
  }

  return NextResponse.json({
    events,
    panels,
    orderStats: orderStats.map((s) => ({ status: s.status, count: s._count.id })),
    eventStats: eventStats.map((s) => ({ status: s.status, count: s._count.id })),
    totalDepositInr,
    totalRevenueInr,
    totalProfitInr,
  });
}
