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
    customSchedule, // <--- custom schedule parameter
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

  let primaryPanel: any = null;
  let totalPrice = 0.0;
  const isWalletUser = dbUser.walletMode;

  // Calculate engagement targets from ratios (or use submitted values)
  const engTargets = engagementEnabled
    ? (bodyLikes !== undefined
        ? { likesTarget: bodyLikes, savesTarget: bodySaves, sharesTarget: bodyShares, commentsTarget: bodyComments }
        : calculateEngagementTargets(views, likesRatioPct, savesRatioPct, sharesRatioPct, commentsRatioPct)
      )
    : { likesTarget: 0, savesTarget: 0, sharesTarget: 0, commentsTarget: 0 };

  if (isWalletUser) {
    // 1. Fetch active admin panel
    const adminPanel = await prisma.panel.findFirst({
      where: { userId: null, isActive: true },
      orderBy: { priority: "asc" },
    });
    if (!adminPanel) {
      return NextResponse.json({ error: "Service temporarily unavailable. Please try again later." }, { status: 503 });
    }
    primaryPanel = adminPanel;

    // 2. Fetch admin services custom rates
    const adminServices = await prisma.adminService.findMany({
      where: { panelId: adminPanel.id, platform: (platform as string).toUpperCase() as any },
    });

    const getRate = (type: string, fallback: number) => {
      const s = adminServices.find(x => x.type === type);
      return s ? s.customRate : fallback;
    };

    const viewsCost = (views / 1000) * getRate("views", 3.0);
    const likesCost = (engTargets.likesTarget / 1000) * getRate("likes", 5.0);
    const savesCost = (engTargets.savesTarget / 1000) * getRate("saves", 5.0);
    const sharesCost = (engTargets.sharesTarget / 1000) * getRate("shares", 8.0);
    const commentsCost = (engTargets.commentsTarget / 1000) * getRate("comments", 15.0);

    totalPrice = parseFloat((viewsCost + likesCost + savesCost + sharesCost + commentsCost).toFixed(2));

    if (dbUser.balance < totalPrice) {
      return NextResponse.json({
        error: `Insufficient balance. Order costs ₹${totalPrice.toFixed(2)}, but your balance is ₹${dbUser.balance.toFixed(2)}.`
      }, { status: 400 });
    }
  } else {
    if (dbUser.panels.length === 0) {
      return NextResponse.json({ error: "Connect at least one SMM panel before placing an order." }, { status: 400 });
    }
    primaryPanel = dbUser.panels[0];
  }

  const allowed = await checkRateLimit(dbUser.id, 50);
  if (!allowed) {
    return NextResponse.json({ error: "Too many orders. Limit: 50/hour." }, { status: 429 });
  }

  // Validate custom schedule if present
  if (customSchedule) {
    if (!Array.isArray(customSchedule)) {
      return NextResponse.json({ error: "customSchedule must be an array" }, { status: 400 });
    }
    for (const batch of customSchedule) {
      if (typeof batch.hour !== "number" || typeof batch.views !== "number") {
        return NextResponse.json({ error: "Each batch must contain numeric hour and views properties" }, { status: 400 });
      }
      if (batch.views > 0 && batch.views < 100) {
        return NextResponse.json({ error: "Each batch must have at least 100 views, or 0 to skip" }, { status: 400 });
      }
      if (batch.likes > 0 && batch.likes < 10) {
        return NextResponse.json({ error: "Likes on each dot must be at least 10, or 0 to skip" }, { status: 400 });
      }
      if (batch.saves > 0 && batch.saves < 10) {
        return NextResponse.json({ error: "Saves on each dot must be at least 10, or 0 to skip" }, { status: 400 });
      }
      if (batch.shares > 0 && batch.shares < 10) {
        return NextResponse.json({ error: "Shares on each dot must be at least 10, or 0 to skip" }, { status: 400 });
      }
      if (batch.comments > 0 && batch.comments < 5) {
        return NextResponse.json({ error: "Comments on each dot must be at least 5, or 0 to skip" }, { status: 400 });
      }
    }
  }

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

  const curveStyle = ((styleRaw as string | undefined)?.toUpperCase() ?? "ORGANIC") as "ORGANIC" | "FAST" | "AGGRESSIVE" | "WHOP" | "CLIPSTAKE" | "CLIPSTAR" | "PICSART" | "CROSSWAVE";
  const defDuration = curveStyle === "AGGRESSIVE" ? 6 : curveStyle === "FAST" ? 12 : 24;

  const order = await prisma.$transaction(async (tx) => {
    if (isWalletUser) {
      await tx.user.update({
        where: { id: dbUser.id },
        data: { balance: { decrement: totalPrice } },
      });
    }

    return tx.order.create({
      data: {
        userId: dbUser.id,
        reelId: reel.id,
        panelId: primaryPanel.id,
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
        priceCharged: totalPrice,
      },
    });
  });

  if (Array.isArray(customSchedule) && customSchedule.length > 0) {
    const now = new Date();
    
    // Sort customSchedule by scheduledTime (or hour) to make sure events are ordered chronologically
    const sortedSchedule = [...customSchedule].sort((a, b) => {
      if (a.scheduledTime && b.scheduledTime) {
        return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
      }
      return a.hour - b.hour;
    });
    
    const deliveryEventsData = sortedSchedule.map((batch, index) => {
      let scheduledAt: Date;
      if (batch.scheduledTime) {
        scheduledAt = new Date(batch.scheduledTime);
        if (isNaN(scheduledAt.getTime())) {
          scheduledAt = new Date(now);
        }
      } else {
        let delayMs = batch.hour * 60 * 60 * 1000;
        if (index === 0) {
          delayMs = 0; // First batch starts instantly
        } else if (index < sortedSchedule.length - 1) {
          // Add ±15 minutes of random time jitter (±900,000 ms)
          const jitterMs = (Math.random() * 2 - 1) * 15 * 60 * 1000;
          delayMs = Math.max(5 * 60 * 1000, delayMs + jitterMs);
        }
        scheduledAt = new Date(now.getTime() + delayMs);
      }

      // Clamp to current time if in the past
      if (scheduledAt.getTime() < now.getTime()) {
        scheduledAt = now;
      }
      
      return {
        orderId: order.id,
        panelId: primaryPanel.id,
        viewsBatch: batch.views,
        scheduledAt,
        status: "SCHEDULED" as const,
        responseData: {
          customEngagement: {
            likes: batch.likes ?? 0,
            saves: batch.saves ?? 0,
            shares: batch.shares ?? 0,
            comments: batch.comments ?? 0,
          }
        }
      };
    });

    await prisma.deliveryEvent.createMany({
      data: deliveryEventsData,
    });
  }

  // Trigger delivery scheduling (fire-and-forget)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  fetch(`${appUrl}/api/delivery/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-key": process.env.NEXTAUTH_SECRET ?? "" },
    body: JSON.stringify({ orderId: order.id }),
  }).catch(console.error);

  return NextResponse.json({ orderId: order.id, order, message: "Order created and delivery scheduled!" }, { status: 201 });
}

