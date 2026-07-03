import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchLatestInstagramPost, fetchLatestTiktokPost, fetchLatestFacebookPost } from "@/lib/scraper/apify";
import { calculateEngagementTargets } from "@/lib/delivery/curve";
import { sendTelegramAlert } from "@/lib/telegram";

export const maxDuration = 300; // Allow 5 minutes for cron execution
export const dynamic = 'force-dynamic'; // Prevent caching

export async function GET(request: NextRequest) {
  // Simple cron authentication
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeSubs = await prisma.autoSubscription.findMany({
    where: { status: "ACTIVE" },
    include: { template: true, user: true },
  });

  const results = [];

  for (const sub of activeSubs) {
    let post: { id: string, url: string } | null = null;
    if (sub.platform === "INSTAGRAM") {
      post = await fetchLatestInstagramPost(sub.username);
    } else if (sub.platform === "TIKTOK") {
      post = await fetchLatestTiktokPost(sub.username);
    } else if (sub.platform === "FACEBOOK") {
      post = await fetchLatestFacebookPost(sub.username);
    }
    
    if (post && post.id !== sub.lastPostId) {
      // It's a new post! Place an order.
      try {
        const url = post.url;
        
        // 1. Calculate price
        const adminPanel = await prisma.panel.findFirst({
          where: { userId: null, isActive: true },
          include: { adminServices: true }
        });
        
        if (!adminPanel) {
          throw new Error("No active admin panel found for pricing");
        }

        const getRate = (type: string, fallback: number) => {
          const s = adminPanel.adminServices.find(x => x.type === type);
          return s ? s.customRate : fallback;
        };

        const engTargets = calculateEngagementTargets(
          sub.viewsTarget,
          sub.template.likesRatioPct,
          sub.template.savesRatioPct,
          sub.template.sharesRatioPct,
          sub.template.commentsRatioPct
        );

        const viewsCost = (sub.viewsTarget / 1000) * getRate("views", 3.0);
        const likesCost = (engTargets.likesTarget / 1000) * getRate("likes", 5.0);
        const savesCost = (engTargets.savesTarget / 1000) * getRate("saves", 5.0);
        const sharesCost = (engTargets.sharesTarget / 1000) * getRate("shares", 8.0);
        const commentsCost = (engTargets.commentsTarget / 1000) * getRate("comments", 15.0);
        const totalPrice = parseFloat((viewsCost + likesCost + savesCost + sharesCost + commentsCost).toFixed(2));

        if (sub.user.balance < totalPrice) {
          // Pause subscription
          await prisma.autoSubscription.update({
            where: { id: sub.id },
            data: { status: "INSUFFICIENT_FUNDS" }
          });
          
          sendTelegramAlert(`⚠️ *Auto-Order Paused*\nUser: \`${sub.user.email}\`\nReason: Insufficient funds for new post @${sub.username}`).catch(console.error);
          results.push({ username: sub.username, status: "PAUSED_FUNDS" });
          continue;
        }

        // Deduct balance and create order
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: sub.user.id },
            data: { balance: { decrement: totalPrice } }
          });

          let reel = await tx.reel.findFirst({ where: { url, userId: sub.user.id } });
          if (!reel) {
            reel = await tx.reel.create({
              data: { url, platform: sub.platform as any, userId: sub.user.id }
            });
          }

          await tx.order.create({
            data: {
              userId: sub.user.id,
              reelId: reel.id,
              panelId: adminPanel.id,
              status: "PENDING",
              priceCharged: totalPrice,
              viewsTarget: sub.viewsTarget,
              likesTarget: engTargets.likesTarget,
              savesTarget: engTargets.savesTarget,
              sharesTarget: engTargets.sharesTarget,
              commentsTarget: engTargets.commentsTarget,
              curveStyle: sub.template.style,
              durationHours: sub.template.durationHours,
              warmupHours: sub.template.warmupHours,
              peakHours: sub.template.peakHours,
              decayHours: sub.template.decayHours,
              viewsRemaining: sub.viewsTarget,
            }
          });

          await tx.autoSubscription.update({
            where: { id: sub.id },
            data: { lastPostId: post.id }
          });
        });

        sendTelegramAlert(`🚀 *Auto-Order Placed!*\nUser: \`${sub.user.email}\`\nReel: ${url}\nTarget: ${sub.viewsTarget} views`).catch(console.error);
        results.push({ username: sub.username, status: "ORDER_PLACED", url });

      } catch (err) {
        console.error(`Failed to place auto order for ${sub.username}:`, err);
        results.push({ username: sub.username, status: "ERROR" });
      }
    } else {
      results.push({ username: sub.username, status: "NO_NEW_POST" });
    }
  }

  return NextResponse.json({ success: true, processed: results.length, results });
}
