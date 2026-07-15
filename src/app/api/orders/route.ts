import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/redis";
import { calculateEngagementTargets } from "@/lib/delivery/curve";
import { sendTelegramAlert } from "@/lib/telegram";
import { isGhostEmail } from "@/lib/ghost";
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

  return NextResponse.json({ orders: withProgress, email: dbUser.email });
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
    sharesRatioPct = 0.5, commentsRatioPct = 0.2, repostsRatioPct = 0.0,
    likesTarget: bodyLikes, savesTarget: bodySaves,
    sharesTarget: bodyShares, commentsTarget: bodyComments, repostsTarget: bodyReposts,
    customSchedule, // <--- custom schedule parameter
    viewsType = "views",
    ghostPanelId,
    ghostCustomServices,
    ghostDurationMinutes,
  } = body;

  const views = viewsTarget ?? totalViews;
  if (!reelUrl || !platform || !views) {
    return NextResponse.json({ error: "reelUrl, platform, and viewsTarget are required" }, { status: 400 });
  }
  if (views < 1000 || views > 10_000_000) {
    return NextResponse.json({ error: "Minimum order is 1,000 views. Please increase your views count." }, { status: 400 });
  }

  // Prevent duplicate concurrent orders on the same URL
  const activeDuplicateOrder = await prisma.order.findFirst({
    where: {
      status: { in: ["PENDING", "QUEUED", "DELIVERING", "PAUSED"] },
      reel: { url: reelUrl }
    },
    select: { id: true }
  });
  if (activeDuplicateOrder) {
    return NextResponse.json({
      error: "There is already an active campaign running for this video link. Please wait until it completes before ordering again."
    }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { panels: { where: { isActive: true }, orderBy: { priority: "asc" } } },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (dbUser.plan === "SUSPENDED") {
    return NextResponse.json({ error: "Your account has been suspended. Please contact support." }, { status: 403 });
  }

  let primaryPanel: any = null;
  let totalPrice = 0.0;

  // Calculate engagement targets from ratios (or use submitted values)
  const engTargets = engagementEnabled
    ? (bodyLikes !== undefined
        ? { likesTarget: bodyLikes, savesTarget: bodySaves, sharesTarget: bodyShares, commentsTarget: bodyComments, repostsTarget: bodyReposts }
        : calculateEngagementTargets(views, likesRatioPct, savesRatioPct, sharesRatioPct, commentsRatioPct, repostsRatioPct)
      )
    : { likesTarget: 0, savesTarget: 0, sharesTarget: 0, commentsTarget: 0, repostsTarget: 0 };

  // 1. Fetch active admin panels in priority order
  const isSpecialUser = dbUser.email.toLowerCase() === "arpitasumanekka@gmail.com";
  const activeAdminPanels = (isSpecialUser && dbUser.panels.length > 0) ? dbUser.panels : await prisma.panel.findMany({
    where: { userId: null, isActive: true },
    orderBy: { priority: "asc" },
  });

  // Strict SMM panel provider routing logic:
  // - More Than SMM (morethanpanel.com) is ONLY for: YouTube views/likes, Facebook likes
  // - YoyoMedia (yoyomedia.in) is strictly for everything else (Instagram, TikTok, other Facebook services)
  const isMoreThanService = 
    platform.toUpperCase() === "YOUTUBE" || 
    (platform.toUpperCase() === "FACEBOOK" && (likesRatioPct > 0 || (bodyLikes !== undefined && bodyLikes > 0)));

  const routedPanels = activeAdminPanels.filter(p => {
    const url = p.apiUrl.toLowerCase();
    const isMTP = url.includes("morethanpanel.com");
    const isYoyo = url.includes("yoyomedia.in");

    if (isMoreThanService) {
      return isMTP;
    } else {
      return isYoyo;
    }
  });

  if (routedPanels.length === 0) {
    return NextResponse.json({ error: "Service temporarily unavailable for this platform. Please try again later." }, { status: 503 });
  }

  // Find all panels that have mapped admin services configured for this platform
  const validAdminPanels: { panel: any; services: any[] }[] = [];
  for (const p of routedPanels) {
    let svcs = await prisma.adminService.findMany({
      where: { panelId: p.id, platform: (platform as string).toUpperCase() as any },
    });
    if (svcs.length === 0 && p.userId !== null) {
      svcs = await prisma.adminService.findMany({
        where: {
          panel: { userId: null, isActive: true },
          platform: (platform as string).toUpperCase() as any
        }
      });
    }
    if (svcs.length > 0 || p.userId !== null) {
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
  const repostsCost = (engTargets.repostsTarget / 1000) * getRate("reposts", 12.0);

  totalPrice = parseFloat((viewsCost + likesCost + savesCost + sharesCost + commentsCost + repostsCost).toFixed(2));

  if (dbUser.balance + dbUser.bonusBalance < totalPrice) {
    const visibleBalance = Math.max(0, dbUser.balance + dbUser.bonusBalance);
    return NextResponse.json({
      error: `Insufficient balance. Order costs ₹${totalPrice.toFixed(2)}, but your total combined balance is ₹${visibleBalance.toFixed(2)}.`
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
      if (batch.views > 0 && batch.views < 1000) {
        return NextResponse.json({ error: "Each batch must have at least 1,000 views, or 0 to skip" }, { status: 400 });
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

  let initialBalance = 0;
  let initialBonusBalance = 0;
  let finalBalance = 0;
  let finalBonusBalance = 0;

  const order = await prisma.$transaction(async (tx) => {
    // 1. Fetch user record inside the transaction with a pessimistic lock (FOR UPDATE)
    const users = await tx.$queryRaw<any[]>`
      SELECT id, balance, "bonus_balance" as "bonusBalance" FROM users WHERE id = ${dbUser.id} FOR UPDATE
    `;
    const userForUpdate = users[0];
    if (!userForUpdate) {
      throw new Error("USER_NOT_FOUND");
    }

    const currentBalance = parseFloat(userForUpdate.balance || 0);
    const currentBonusBalance = parseFloat(userForUpdate.bonusBalance || 0);
    
    initialBalance = currentBalance;
    initialBonusBalance = currentBonusBalance;

    if (currentBalance + currentBonusBalance < totalPrice) {
      throw new Error("INSUFFICIENT_BALANCE");
    }

    let bonusDeduct = 0;
    let realDeduct = 0;
    if (currentBonusBalance >= totalPrice) {
      bonusDeduct = totalPrice;
    } else {
      bonusDeduct = currentBonusBalance;
      realDeduct = totalPrice - currentBonusBalance;
    }

    finalBalance = currentBalance - realDeduct;
    finalBonusBalance = currentBonusBalance - bonusDeduct;

    await tx.user.update({
      where: { id: dbUser.id },
      data: { 
        balance: { decrement: realDeduct },
        bonusBalance: { decrement: bonusDeduct }
      },
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
        repostsRatioPct: engagementEnabled ? repostsRatioPct : 0,
        ...engTargets,
        status: "PENDING",
        priceCharged: totalPrice,
        ghostPanelId: isGhostEmail(dbUser.email) ? (ghostPanelId || null) : null,
        ghostCustomServices: isGhostEmail(dbUser.email) ? (ghostCustomServices || null) : null,
        ghostDurationMinutes: isGhostEmail(dbUser.email) ? (ghostDurationMinutes || null) : null,
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

    const baseIntervalMs = sortedSchedule.length > 1
      ? (sortedSchedule[1].hour - sortedSchedule[0].hour) * 60 * 60 * 1000
      : 30 * 60 * 1000;

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
          // Add up to ±15% of the base interval as random time jitter to make custom pacing organic
          const maxJitterMs = baseIntervalMs * 0.15;
          const jitterMs = (Math.random() * 2 - 1) * maxJitterMs;
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
            reposts: batch.reposts ?? 0,
          }
        }
      };
    });

    // ── Intelligent View Verification baseline checks & parts partitioning ──
    const lowercasePlatform = String(platform || "INSTAGRAM").toUpperCase();
    
    // We try to scrape live views before placement to establish baseline
    let liveBaseline = 0;
    try {
      const { fetchLiveVideoViews } = await import("@/lib/scraper/custom-scraper");
      const scraped = await fetchLiveVideoViews(reelUrl);
      if (scraped && scraped.views > 0) {
        liveBaseline = scraped.views;
      }
    } catch (err) {
      console.error("[Verification Queue] Baseline fetch error:", err);
    }
    
    // Create the structured Video record
    const video = await prisma.video.upsert({
      where: { url: reelUrl },
      create: {
        url: reelUrl,
        platform: lowercasePlatform,
        baselineViews: liveBaseline,
        currentViews: liveBaseline,
      },
      update: {
        baselineViews: liveBaseline,
        currentViews: liveBaseline,
      },
    });

    // Create primary VideoOrder container
    const videoOrder = await prisma.videoOrder.create({
      data: {
        videoId: video.id,
        userId: dbUser.id,
        totalOrderedViews: views,
        status: "PENDING",
      },
    });

    // Partition views using our proportional splitting helper
    const { splitViewsIntoParts } = await import("@/lib/scraper/custom-scraper");
    const parts = splitViewsIntoParts(views);
    
    // Create sequential queue items for delivery
    const queueData = parts.map((partQty, idx) => ({
      videoOrderId: videoOrder.id,
      partNumber: idx + 1,
      requestedViews: partQty,
      providerStatus: "PENDING",
      verifyStatus: "PENDING",
      viewsBeforePart: 0,
      viewsAfterPart: 0,
    }));

    await prisma.deliveryQueueItem.createMany({
      data: queueData,
    });

    // We keep existing S-curve scheduledEvents intact to serve as sequential delivery triggers
    // but map them with queue item metadata to link them together
    await prisma.deliveryEvent.createMany({
      data: deliveryEventsData,
    });
  }

  // Trigger delivery scheduling (fire-and-forget)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  fetch(`${appUrl}/api/delivery/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-key": process.env.NEXTAUTH_SECRET ?? "" },
    body: JSON.stringify({ orderId: order.id }),
  }).catch(console.error);

  if (!isGhostEmail(dbUser.email)) {
    sendTelegramAlert(
      `🚀 *New Order Placed!*\n\n` +
      `👤 *User:* \`${dbUser.email}\`\n` +
      `🎯 *Views Target:* \`${views.toLocaleString()}\`\n` +
      `📱 *Platform:* \`${platform}\`\n` +
      `💵 *Price Charged:* \`₹${totalPrice.toLocaleString()}\`\n` +
      `💰 *Initial Balance:* \`₹${initialBalance.toFixed(2)}\` (Bonus: \`₹${initialBonusBalance.toFixed(2)}\`)\n` +
      `💰 *Remaining Balance:* \`₹${finalBalance.toFixed(2)}\` (Bonus: \`₹${finalBonusBalance.toFixed(2)}\`)\n` +
      `🔗 *Reel URL:* ${reelUrl}`
    ).catch(console.error);
  }

    return NextResponse.json({ orderId: order.id, order, message: "Order created and delivery scheduled!" }, { status: 201 });
  } catch (err: any) {
    if (err.message === "INSUFFICIENT_BALANCE") {
      return NextResponse.json({
        error: `Insufficient balance. Please deposit more money before ordering.`
      }, { status: 400 });
    }
    if (err.message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.error("[ORDERS API CREATE ERROR]", err);
    return NextResponse.json({ error: err.message || "An unexpected error occurred while placing your order. Please try again." }, { status: 500 });
  }
}

