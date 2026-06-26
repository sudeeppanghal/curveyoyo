import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/redis";
import { calculateEngagementTargets } from "@/lib/delivery/curve";

/* ── GET /api/orders ── */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const orders = await prisma.order.findMany({
    where: { userId: dbUser.id },
    include: {
      reel: { select: { url: true, platform: true, title: true } },
      panel: { select: { name: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const withProgress = orders.map((o) => ({
    ...o,
    progressPct: o.viewsTarget > 0
      ? Math.min(100, Math.round((o.viewsDelivered / o.viewsTarget) * 100))
      : 0,
  }));

  return NextResponse.json({ orders: withProgress });
}

/* ── POST /api/orders ── */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    reelUrl, platform,
    viewsTarget,           // new field name
    totalViews,            // legacy compat
    curveStyle: styleRaw,
    durationHours, warmupHours, peakHours, decayHours,
    // Engagement
    engagementEnabled = true,
    likesRatioPct = 4.0, savesRatioPct = 2.0,
    sharesRatioPct = 0.5, commentsRatioPct = 0.2,
    likesTarget: bodyLikes, savesTarget: bodySaves,
    sharesTarget: bodyShares, commentsTarget: bodyComments,
  } = body;

  const views = viewsTarget ?? totalViews;
  if (!reelUrl || !platform || !views) {
    return NextResponse.json({ error: "reelUrl, platform, and viewsTarget are required" }, { status: 400 });
  }
  if (views < 100 || views > 10_000_000) {
    return NextResponse.json({ error: "Views must be between 100 and 10,000,000" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { panels: { where: { isActive: true }, orderBy: { priority: "asc" }, take: 1 } },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (dbUser.panels.length === 0) {
    return NextResponse.json({ error: "Connect at least one SMM panel before placing an order." }, { status: 400 });
  }

  const allowed = await checkRateLimit(dbUser.id, 50);
  if (!allowed) {
    return NextResponse.json({ error: "Too many orders. Limit: 50/hour." }, { status: 429 });
  }

  // Calculate engagement targets from ratios (or use submitted values)
  const engTargets = engagementEnabled
    ? (bodyLikes !== undefined
        ? { likesTarget: bodyLikes, savesTarget: bodySaves, sharesTarget: bodyShares, commentsTarget: bodyComments }
        : calculateEngagementTargets(views, likesRatioPct, savesRatioPct, sharesRatioPct, commentsRatioPct)
      )
    : { likesTarget: 0, savesTarget: 0, sharesTarget: 0, commentsTarget: 0 };

  // Upsert reel
  const reelId = `${dbUser.id}:${Buffer.from(reelUrl).toString("base64").slice(0, 20)}`;
  const reel = await prisma.reel.upsert({
    where: { id: reelId },
    create: {
      id: reelId, userId: dbUser.id, url: reelUrl,
      platform: (platform as string).toUpperCase() as "INSTAGRAM" | "TIKTOK" | "YOUTUBE",
    },
    update: {},
  });

  const curveStyle = ((styleRaw as string | undefined)?.toUpperCase() ?? "ORGANIC") as "ORGANIC" | "FAST" | "AGGRESSIVE";
  const defDuration = curveStyle === "AGGRESSIVE" ? 6 : curveStyle === "FAST" ? 12 : 24;

  // Create order with full engagement config
  const order = await prisma.order.create({
    data: {
      userId: dbUser.id,
      reelId: reel.id,
      panelId: dbUser.panels[0].id,
      viewsTarget: views,
      viewsRemaining: views,
      curveStyle,
      durationHours: durationHours ?? defDuration,
      warmupHours: warmupHours ?? 4,
      peakHours: peakHours ?? 8,
      decayHours: decayHours ?? 12,
      // Engagement
      engagementEnabled,
      likesRatioPct: engagementEnabled ? likesRatioPct : 0,
      savesRatioPct: engagementEnabled ? savesRatioPct : 0,
      sharesRatioPct: engagementEnabled ? sharesRatioPct : 0,
      commentsRatioPct: engagementEnabled ? commentsRatioPct : 0,
      ...engTargets,
      status: "PENDING",
    },
  });

  // Trigger delivery scheduling (fire-and-forget)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  fetch(`${appUrl}/api/delivery/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-key": process.env.NEXTAUTH_SECRET ?? "" },
    body: JSON.stringify({ orderId: order.id }),
  }).catch(console.error);

  return NextResponse.json({ orderId: order.id, order, message: "Order created and delivery scheduled!" }, { status: 201 });
}
