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

    if (order.status === "FAILED" || order.status === "CANCELLED") {
      // Calculate cost of what was actually delivered
      const deliveredViewsCost = (order.viewsDelivered / 1000) * customViewsRate;
      const deliveredLikesCost = (order.likesDelivered / 1000) * customLikesRate;
      const deliveredSavesCost = (order.savesDelivered / 1000) * customSavesRate;
      const deliveredSharesCost = (order.sharesDelivered / 1000) * customSharesRate;
      const deliveredCommentsCost = (order.commentsDelivered / 1000) * customCommentsRate;

      orderRevenue = parseFloat(
        (deliveredViewsCost + deliveredLikesCost + deliveredSavesCost + deliveredSharesCost + deliveredCommentsCost).toFixed(2)
      );
      // Ensure we don't exceed the original price charged
      orderRevenue = Math.min(orderRevenue, order.priceCharged);

      // Calculate actual provider cost
      let providerCostUsd = 0;
      providerCostUsd += (order.viewsDelivered / 1000) * originalViewsRate;
      providerCostUsd += (order.likesDelivered / 1000) * originalLikesRate;
      providerCostUsd += (order.savesDelivered / 1000) * originalSavesRate;
      providerCostUsd += (order.sharesDelivered / 1000) * originalSharesRate;
      providerCostUsd += (order.commentsDelivered / 1000) * originalCommentsRate;

      const providerCostInr = providerCostUsd * 83;
      totalRevenueInr += orderRevenue;
      totalProfitInr += (orderRevenue - providerCostInr);
    } else {
      let providerCostUsd = 0;
      providerCostUsd += (order.viewsTarget / 1000) * originalViewsRate;
      providerCostUsd += (order.likesTarget / 1000) * originalLikesRate;
      providerCostUsd += (order.savesTarget / 1000) * originalSavesRate;
      providerCostUsd += (order.sharesTarget / 1000) * originalSharesRate;
      providerCostUsd += (order.commentsTarget / 1000) * originalCommentsRate;

      const providerCostInr = providerCostUsd * 83;
      totalRevenueInr += orderRevenue;
      totalProfitInr += (orderRevenue - providerCostInr);
    }
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
