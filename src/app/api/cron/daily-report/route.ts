import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NOT_GHOST_USER } from "@/lib/ghost";

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET || process.env.ADMIN_SECRET;

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret") || request.headers.get("Authorization")?.replace("Bearer ", "");
  
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1. Confirmed UPI Deposits (Exclude Ghost Users)
    const upiPayments = await prisma.upiPayment.findMany({
      where: {
        status: "CONFIRMED",
        updatedAt: { gte: dayAgo },
        user: NOT_GHOST_USER,
      },
      include: { user: true },
    });

    // 2. Confirmed Crypto Deposits (Exclude Ghost Users)
    const cryptoPayments = await prisma.cryptoPayment.findMany({
      where: {
        status: "CONFIRMED",
        updatedAt: { gte: dayAgo },
        user: NOT_GHOST_USER,
      },
      include: { user: true },
    });

    // 3. New Campaigns Placed in last 24h (Exclude Ghost Users)
    const newOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: dayAgo },
        user: NOT_GHOST_USER,
      }
    });

    // 4. Campaigns COMPLETED in last 24h (Exclude Ghost Users)
    const completedOrders = await prisma.order.findMany({
      where: {
        status: "COMPLETED",
        completedAt: { gte: dayAgo },
        user: NOT_GHOST_USER,
      },
      include: { 
        user: true,
        reel: true
      }
    });

    // 5. Active/Running Campaigns currently in system (Exclude Ghost Users)
    const runningCount = await prisma.order.count({
      where: {
        status: { in: ["DELIVERING", "QUEUED", "PAUSED"] },
        user: NOT_GHOST_USER,
      }
    });

    // Fetch all admin services to map provider original rates
    const adminServices = await prisma.adminService.findMany();
    const rateMap = new Map<string, number>();
    adminServices.forEach(s => {
      rateMap.set(`${s.panelId}:${s.platform}:${s.type}`, s.originalRate);
    });

    // 6. Confirmed deposit splits in last 24h
    const dailySplits = await prisma.profitSplit.findMany({
      where: {
        createdAt: { gte: dayAgo }
      }
    });

    const totalAnkit = dailySplits.reduce((sum, s) => sum + s.ankitShare, 0);
    const totalRam = dailySplits.reduce((sum, s) => sum + s.ramShare, 0);

    const totalUpi = upiPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalCrypto = cryptoPayments.reduce((sum, p) => sum + (p.amountUsdt || 0), 0);

    let totalRevenue = 0.0;
    let totalProviderCost = 0.0;

    for (const o of completedOrders) {
      const panelId = o.panelId;
      const platform = o.reel?.platform;

      let originalViewsRate = 0;
      let originalLikesRate = 0;
      let originalSavesRate = 0;
      let originalSharesRate = 0;
      let originalCommentsRate = 0;
      let originalRepostsRate = 0;

      if (panelId && platform) {
        originalViewsRate = rateMap.get(`${panelId}:${platform}:views`) ?? 0;
        originalLikesRate = rateMap.get(`${panelId}:${platform}:likes`) ?? 0;
        originalSavesRate = rateMap.get(`${panelId}:${platform}:saves`) ?? 0;
        originalSharesRate = rateMap.get(`${panelId}:${platform}:shares`) ?? 0;
        originalCommentsRate = rateMap.get(`${panelId}:${platform}:comments`) ?? 0;
        originalRepostsRate = rateMap.get(`${panelId}:${platform}:reposts`) ?? 0;
      }

      let cost = 0.0;
      cost += (o.viewsTarget / 1000) * originalViewsRate;
      cost += (o.likesTarget / 1000) * originalLikesRate;
      cost += (o.savesTarget / 1000) * originalSavesRate;
      cost += (o.sharesTarget / 1000) * originalSharesRate;
      cost += (o.commentsTarget / 1000) * originalCommentsRate;
      cost += (o.repostsTarget / 1000) * originalRepostsRate;

      totalRevenue += o.priceCharged;
      totalProviderCost += cost;
    }

    const netProfit = totalRevenue - totalProviderCost;

    // Construct Telegram Report using HTML tags
    let reportHtml = `📊 <b>Daily Financial & Activity Summary</b>\n`;
    reportHtml += `<i>Period: Last 24 Hours (Indian Time Audit)</i>\n\n`;
    reportHtml += `🇮🇳 <b>Total UPI Deposits:</b> <code>₹${totalUpi.toFixed(2)}</code> (${upiPayments.length} txs)\n`;
    reportHtml += `🇺🇸 <b>Total Crypto Deposits:</b> <code>$${totalCrypto.toFixed(2)}</code> (${cryptoPayments.length} txs)\n\n`;
    reportHtml += `🤝 <b>Partner Splits (40% Each):</b>\n`;
    reportHtml += `• <b>Ankit:</b> <code>₹${totalAnkit.toFixed(2)}</code>\n`;
    reportHtml += `• <b>Ram:</b> <code>₹${totalRam.toFixed(2)}</code>\n\n`;
    reportHtml += `💰 <b>Gross User Revenue (Completed):</b> <code>₹${totalRevenue.toFixed(2)}</code>\n`;
    reportHtml += `📉 <b>SMM Panel Provider Cost:</b> <code>₹${totalProviderCost.toFixed(2)}</code>\n`;
    reportHtml += `💸 <b>Net SMM Profit Margin:</b> <code>₹${netProfit.toFixed(2)}</code> (Markup: ~5x)\n\n`;
    reportHtml += `🚀 <b>New Campaigns Placed:</b> <code>${newOrders.length}</code>\n`;
    reportHtml += `⏳ <b>Active Campaigns Running:</b> <code>${runningCount}</code>\n\n`;

    if (upiPayments.length > 0) {
      reportHtml += `<b>🇮🇳 Confirmed UPI Transactions:</b>\n`;
      upiPayments.forEach(p => {
        reportHtml += `• <code>${p.user.email}</code>: ₹${p.amount} (UTR: <code>${p.utr}</code>)\n`;
      });
      reportHtml += `\n`;
    }

    if (cryptoPayments.length > 0) {
      reportHtml += `<b>🇺🇸 Confirmed Crypto Transactions:</b>\n`;
      cryptoPayments.forEach(p => {
        reportHtml += `• <code>${p.user.email}</code>: $${p.amountUsdt} (Hash: <code>${p.txHash.slice(0, 8)}...</code>)\n`;
      });
      reportHtml += `\n`;
    }

    if (completedOrders.length > 0) {
      reportHtml += `<b>📈 High-Value Completed Campaigns (&gt;₹100):</b>\n`;
      const highValueCompleted = completedOrders.filter(o => o.priceCharged > 100);
      if (highValueCompleted.length > 0) {
        highValueCompleted.forEach(o => {
          reportHtml += `• <code>${o.user.email}</code>: ₹${o.priceCharged.toFixed(2)} (ID: <code>${o.id}</code> - ${o.viewsTarget} views)\n`;
        });
      } else {
        reportHtml += `<i>None</i>\n`;
      }
    }

    // Call Telegram bot API directly with parse_mode: HTML
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!token || !chatId) {
      console.warn("[Daily Report Cron] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment. Telegram alert skipped.");
      return NextResponse.json({ ok: false, error: "Telegram variables missing" }, { status: 500 });
    }
    
    const tgResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: reportHtml,
        parse_mode: "HTML",
      }),
    });
    
    const tgData = await tgResponse.json();
    if (!tgData.ok) {
      console.error("[Telegram Report Failed]", tgData.description);
    }

    return NextResponse.json({
      ok: true,
      totalUpi,
      totalCrypto,
      newOrdersCount: newOrders.length,
      completedOrdersCount: completedOrders.length,
      totalRevenue,
      totalProviderCost,
      netProfit,
      runningCount
    });
  } catch (error) {
    console.error("Daily Report Cron Error:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
