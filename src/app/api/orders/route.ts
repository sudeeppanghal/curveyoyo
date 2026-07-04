import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/redis";
import { calculateEngagementTargets } from "@/lib/delivery/curve";
import { sendTelegramAlert } from "@/lib/telegram";
import crypto from "crypto";

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
  try {
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
    viewsType = "views",
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
    include: { panels: { where: { isActive: true }, orderBy: { priority: "asc" } } },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let primaryPanel: any = null;
  let totalPrice = 0.0;

  // Calculate engagement targets from ratios (or use submitted values)
  const engTargets = engagementEnabled
    ? (bodyLikes !== undefined
        ? { likesTarget: bodyLikes, savesTarget: bodySaves, sharesTarget: bodyShares, commentsTarget: bodyComments }
        : calculateEngagementTargets(views, likesRatioPct, savesRatioPct, sharesRatioPct, commentsRatioPct)
      )
    : { likesTarget: 0, savesTarget: 0, sharesTarget: 0, commentsTarget: 0 };

  // 1. Fetch active admin panels in priority order
  const activeAdminPanels = await prisma.panel.findMany({
    where: { userId: null, isActive: true },
    orderBy: { priority: "asc" },
  });
  if (activeAdminPanels.length === 0) {
    return NextResponse.json({ error: "Service temporarily unavailable. Please try again later." }, { status: 503 });
  }

  // Find all panels that have mapped admin services configured for this platform
  const validAdminPanels: { panel: any; services: any[] }[] = [];
  for (const p of activeAdminPanels) {
    const svcs = await prisma.adminService.findMany({
      where: { panelId: p.id, platform: (platform as string).toUpperCase() as any },
    });
    if (svcs.length > 0) {
      validAdminPanels.push({ panel: p, services: svcs });
    }
  }
  if (validAdminPanels.length === 0) {
    return NextResponse.json({ error: "Service temporarily unavailable. Please try again later." }, { status: 503 });
  }

  // Auto distribute randomly across available online admin panels for load distribution
  const onlineAdminPanels = validAdminPanels.filter(x => x.panel.status !== "OFFLINE");
  const adminPool = onlineAdminPanels.length > 0 ? onlineAdminPanels : validAdminPanels;
  const selected = adminPool[Math.floor(Math.random() * adminPool.length)];
  const adminPanel = selected.panel;
  const adminServices = selected.services;

  primaryPanel = adminPanel;

  const getRate = (type: string, fallback: number) => {
    const s = adminServices.find(x => x.type === type);
    return s ? s.customRate : fallback;
  };

  const viewsRateKey = (platform === "INSTAGRAM" && viewsType === "reach_impressions_views") ? "reach_impressions_views" : "views";
  const viewsCost = (views / 1000) * getRate(viewsRateKey, 3.0);
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

    }
  }

  // Upsert reel using MD5 hash of URL to avoid identical prefix collisions
  const urlHash = crypto.createHash("md5").update(reelUrl).digest("hex");
  const reelId = `${dbUser.id}:${urlHash}`;
  const reel = await prisma.reel.upsert({
    where: { id: reelId },
    create: {
      id: reelId, userId: dbUser.id, url: reelUrl,
      platform: (platform as string).toUpperCase() as any,
    },
    update: {
      url: reelUrl,
      platform: (platform as string).toUpperCase() as any,
    },
  });

  const curveStyle = ((styleRaw as string | undefined)?.toUpperCase() ?? "ORGANIC") as any;
  const defDuration = curveStyle === "AGGRESSIVE" ? 6 : curveStyle === "FAST" ? 12 : 24;

  const order = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: dbUser.id },
      data: { balance: { decrement: totalPrice } },
    });

    return tx.order.create({
      data: {
        userId: dbUser.id,
        reelId: reel.id,
        panelId: primaryPanel.id,
        panelServiceId: (platform === "INSTAGRAM" && viewsType === "reach_impressions_views") ? "reach_impressions_views" : null,
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

    const firstBatchDelayMs = sortedSchedule.length > 0 ? (sortedSchedule[0].hour * 60 * 60 * 1000) : 0;
    
    const deliveryEventsData = sortedSchedule.map((batch, index) => {
      let scheduledAt: Date;
      if (batch.scheduledTime) {
        scheduledAt = new Date(batch.scheduledTime);
        if (isNaN(scheduledAt.getTime())) {
          scheduledAt = new Date(now);
        }
      } else {
        let delayMs = Math.max(0, (batch.hour * 60 * 60 * 1000) - firstBatchDelayMs);
        if (index === 0) {
          delayMs = 0; // First batch starts instantly
        } else if (index < sortedSchedule.length - 1) {
          // Add ±5 minutes of random time jitter (±300,000 ms)
          const jitterMs = (Math.random() * 2 - 1) * 5 * 60 * 1000;
          delayMs = Math.max(2 * 60 * 1000, delayMs + jitterMs);
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

  sendTelegramAlert(
    `🚀 *New Order Placed!*\n\n` +
    `👤 *User:* \`${dbUser.email}\`\n` +
    `🎯 *Views Target:* \`${views.toLocaleString()}\`\n` +
    `📱 *Platform:* \`${platform}\`\n` +
    `💵 *Price Charged:* \`₹${totalPrice.toLocaleString()}\`\n` +
    `🔗 *Reel URL:* ${reelUrl}`
  ).catch(console.error);

    return NextResponse.json({ orderId: order.id, order, message: "Order created and delivery scheduled!" }, { status: 201 });
  } catch (err: any) {
    console.error("[ORDERS API CREATE ERROR]", err);
    return NextResponse.json({ error: err.message || "An unexpected error occurred while placing your order. Please try again." }, { status: 500 });
  }
}

