import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_SECRET = process.env.ADMIN_SECRET!;

function isAdmin(request: NextRequest) {
  return request.headers.get("x-admin-secret") === ADMIN_SECRET;
}

// GET platform system health details and financial analytics
export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Excluded admin accounts from revenue/profit calculations
  const EXCLUDED_ADMIN_EMAILS = ["arpitasumanekka@gmail.com"];

  // 1. Fetch recent delivery events
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

  // 4. Calculate Total Deposit (INR) - EXCLUDING ADMIN ACCOUNTS
  const totalDepositInrRes = await prisma.upiPayment.aggregate({
    where: {
      status: "CONFIRMED",
      user: {
        email: { notIn: EXCLUDED_ADMIN_EMAILS },
      },
    },
    _sum: { amount: true },
  });
  let totalDepositInr = totalDepositInrRes._sum.amount ?? 0;

  // Also add confirmed crypto deposits from non-admin accounts
  const confirmedCrypto = await prisma.cryptoPayment.findMany({
    where: {
      status: "CONFIRMED",
      user: {
        email: { notIn: EXCLUDED_ADMIN_EMAILS },
      },
    },
    include: { user: true },
  });
  for (const cp of confirmedCrypto) {
    // approx 96 INR per USDT if not tracked explicitly
    totalDepositInr += Math.round((cp.amountUsdt ?? 0) * 96);
  }

  // 5. Calculate Total Profit and Revenue (INR) - EXCLUDING ADMIN ACCOUNTS
  const allOrders = await prisma.order.findMany({
    where: {
      user: {
        email: { notIn: EXCLUDED_ADMIN_EMAILS },
      },
    },
    include: {
      reel: { select: { platform: true } },
      user: { select: { email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const adminServices = await prisma.adminService.findMany();
  const rateMap = new Map<string, number>();
  adminServices.forEach(s => {
    rateMap.set(`${s.panelId}:${s.platform}:${s.type}`, s.originalRate);
  });

  let totalProfitInr = 0;
  let totalRevenueInr = 0;

  // Initialize 14-day trend map for beautiful frontend chart
  const now = new Date();
  const dailyMap = new Map<string, { date: string; fullDate: string; revenue: number; profit: number; orders: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD
    const displayDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    dailyMap.set(dateStr, { date: displayDate, fullDate: dateStr, revenue: 0, profit: 0, orders: 0 });
  }

  for (const order of allOrders) {
    let orderRevenue = order.priceCharged;
    const panelId = order.panelId;
    const platform = order.reel?.platform;

    let originalViewsRate = 0;
    let originalLikesRate = 0;
    let originalSavesRate = 0;
    let originalSharesRate = 0;
    let originalCommentsRate = 0;

    let customViewsRate = 3.0;
    let customLikesRate = 5.0;
    let customSavesRate = 5.0;
    let customSharesRate = 8.0;
    let customCommentsRate = 15.0;

    if (panelId && platform) {
      originalViewsRate = rateMap.get(`${panelId}:${platform}:views`) ?? 0;
      originalLikesRate = rateMap.get(`${panelId}:${platform}:likes`) ?? 0;
      originalSavesRate = rateMap.get(`${panelId}:${platform}:saves`) ?? 0;
      originalSharesRate = rateMap.get(`${panelId}:${platform}:shares`) ?? 0;
      originalCommentsRate = rateMap.get(`${panelId}:${platform}:comments`) ?? 0;

      const panelServices = adminServices.filter(s => s.panelId === panelId && s.platform === platform);
      const getCustomRate = (type: string, fallback: number) => {
        const s = panelServices.find(x => x.type === type);
        return s ? s.customRate : fallback;
      };
      customViewsRate = getCustomRate("views", 3.0);
      customLikesRate = getCustomRate("likes", 5.0);
      customSavesRate = getCustomRate("saves", 5.0);
      customSharesRate = getCustomRate("shares", 8.0);
      customCommentsRate = getCustomRate("comments", 15.0);
    }

    let orderProfit = 0;

    if (order.status === "FAILED" || order.status === "CANCELLED") {
      const deliveredViewsCost = (order.viewsDelivered / 1000) * customViewsRate;
      const deliveredLikesCost = (order.likesDelivered / 1000) * customLikesRate;
      const deliveredSavesCost = (order.savesDelivered / 1000) * customSavesRate;
      const deliveredSharesCost = (order.sharesDelivered / 1000) * customSharesRate;
      const deliveredCommentsCost = (order.commentsDelivered / 1000) * customCommentsRate;

      orderRevenue = parseFloat(
        (deliveredViewsCost + deliveredLikesCost + deliveredSavesCost + deliveredSharesCost + deliveredCommentsCost).toFixed(2)
      );
      orderRevenue = Math.min(orderRevenue, order.priceCharged);

      let providerCostInr = 0;
      providerCostInr += (order.viewsDelivered / 1000) * originalViewsRate;
      providerCostInr += (order.likesDelivered / 1000) * originalLikesRate;
      providerCostInr += (order.savesDelivered / 1000) * originalSavesRate;
      providerCostInr += (order.sharesDelivered / 1000) * originalSharesRate;
      providerCostInr += (order.commentsDelivered / 1000) * originalCommentsRate;

      orderProfit = (orderRevenue - providerCostInr);
      totalRevenueInr += orderRevenue;
      totalProfitInr += orderProfit;
    } else {
      let providerCostInr = 0;
      providerCostInr += (order.viewsTarget / 1000) * originalViewsRate;
      providerCostInr += (order.likesTarget / 1000) * originalLikesRate;
      providerCostInr += (order.savesTarget / 1000) * originalSavesRate;
      providerCostInr += (order.sharesTarget / 1000) * originalSharesRate;
      providerCostInr += (order.commentsTarget / 1000) * originalCommentsRate;

      orderProfit = (orderRevenue - providerCostInr);
      totalRevenueInr += orderRevenue;
      totalProfitInr += orderProfit;
    }

    // Add to daily trend if within window or map
    const orderDateStr = order.createdAt.toISOString().slice(0, 10);
    if (dailyMap.has(orderDateStr)) {
      const entry = dailyMap.get(orderDateStr)!;
      entry.revenue += orderRevenue;
      entry.profit += orderProfit;
      entry.orders += 1;
    } else if (allOrders.length > 0 && orderDateStr === allOrders[allOrders.length - 1].createdAt.toISOString().slice(0, 10)) {
      // If today is newer than our map initialization
      const d = new Date(order.createdAt);
      const displayDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dailyMap.set(orderDateStr, { date: displayDate, fullDate: orderDateStr, revenue: orderRevenue, profit: orderProfit, orders: 1 });
    }
  }

  const dailyFinancials = Array.from(dailyMap.values()).map(d => ({
    date: d.date,
    revenue: parseFloat(d.revenue.toFixed(2)),
    profit: parseFloat(d.profit.toFixed(2)),
    orders: d.orders,
  }));

  return NextResponse.json({
    events,
    panels,
    orderStats: orderStats.map((s) => ({ status: s.status, count: s._count.id })),
    eventStats: eventStats.map((s) => ({ status: s.status, count: s._count.id })),
    totalDepositInr: parseFloat(totalDepositInr.toFixed(2)),
    totalRevenueInr: parseFloat(totalRevenueInr.toFixed(2)),
    totalProfitInr: parseFloat(totalProfitInr.toFixed(2)),
    dailyFinancials,
    excludedAdminAccounts: EXCLUDED_ADMIN_EMAILS,
  });
}
