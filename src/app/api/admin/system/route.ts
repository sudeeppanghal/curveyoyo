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

  return NextResponse.json({
    events,
    panels,
    orderStats: orderStats.map((s) => ({ status: s.status, count: s._count.id })),
    eventStats: eventStats.map((s) => ({ status: s.status, count: s._count.id })),
  });
}
