import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCachedDashboardStats, cacheDashboardStats } from "@/lib/redis";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Try Redis cache first (60s TTL)
  const cached = await getCachedDashboardStats(dbUser.id);
  if (cached) return NextResponse.json(cached);

  // Compute real stats
  const [totalOrders, completedOrders, deliveringOrders, panels, recentOrders] = await Promise.all([
    prisma.order.count({ where: { userId: dbUser.id } }),
    prisma.order.count({ where: { userId: dbUser.id, status: "COMPLETED" } }),
    prisma.order.count({ where: { userId: dbUser.id, status: "DELIVERING" } }),
    prisma.panel.count({ where: { userId: dbUser.id, isActive: true } }),
    prisma.order.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { viewsDelivered: true, createdAt: true, status: true, curveStyle: true },
    }),
  ]);

  const totalViewsDelivered = recentOrders.reduce((a, o) => a + o.viewsDelivered, 0);

  // Build 7-day chart (views delivered per day)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const dailyOrders = await prisma.order.findMany({
    where: { userId: dbUser.id, createdAt: { gte: sevenDaysAgo } },
    select: { viewsDelivered: true, createdAt: true },
  });

  const dayMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dayMap[d.toISOString().slice(0, 10)] = 0;
  }
  dailyOrders.forEach((o) => {
    const day = o.createdAt.toISOString().slice(0, 10);
    if (day in dayMap) dayMap[day] += o.viewsDelivered;
  });

  const weeklyChart = Object.entries(dayMap).map(([date, views]) => ({
    date,
    label: new Date(date).toLocaleDateString("en", { weekday: "short" }),
    views,
  }));

  // Platform breakdown
  const platformGroups = await prisma.order.groupBy({
    by: ["reelId"],
    where: { userId: dbUser.id },
    _sum: { viewsDelivered: true },
    _count: true,
  });

  // Curve style breakdown
  const styleGroups = await prisma.order.groupBy({
    by: ["curveStyle"],
    where: { userId: dbUser.id },
    _count: true,
  });

  const stats = {
    totalOrders,
    completedOrders,
    deliveringOrders,
    activePanels: panels,
    totalViewsDelivered,
    weeklyChart,
    styleBreakdown: styleGroups.map((g) => ({ style: g.curveStyle, count: g._count })),
    successRate: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0,
    plan: dbUser.plan,
    trialEndsAt: dbUser.trialEndsAt,
    lifetimeUnlocked: dbUser.lifetimeUnlocked,
  };

  await cacheDashboardStats(dbUser.id, stats);
  return NextResponse.json(stats);
}
