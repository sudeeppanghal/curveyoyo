import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchLatestInstagramPost, fetchLatestTiktokPost, fetchLatestFacebookPost } from "@/lib/scraper/apify";
import { calculateEngagementTargets } from "@/lib/delivery/curve";
import { sendTelegramAlert } from "@/lib/telegram";
import { isGhostEmail } from "@/lib/ghost";
import { CURVE_100_LIST } from "@/lib/delivery/curve-styles-100";

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
    
    if (post && post.id && post.url && post.id !== sub.lastPostId) {
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

        // Calculate random views
        const targetViews = Math.floor(Math.random() * (sub.viewsMax - sub.viewsMin + 1)) + sub.viewsMin;

        // Pick random template
        let templateIdToUse = sub.templateId;
        if (sub.templateIds && sub.templateIds.length > 0) {
          templateIdToUse = sub.templateIds[Math.floor(Math.random() * sub.templateIds.length)];
        }
        
        if (!templateIdToUse) {
          throw new Error("No template found for auto subscription");
        }

        let template = await prisma.curveTemplate.findUnique({
          where: { id: templateIdToUse }
        }) as any;

        if (!template) {
          const globalT = CURVE_100_LIST.find(c => c.id === templateIdToUse);
          if (globalT) {
            template = {
              id: globalT.id,
              style: globalT.id,
              durationHours: globalT.warmup + globalT.peak + 10,
              warmupHours: globalT.warmup,
              peakHours: globalT.peak,
              decayHours: 10,
            };
          } else {
            throw new Error("Template not found in DB or Global List");
          }
        }

        // Randomize engagements based on Min/Max fields
        const getRandom = (min: number, max: number) => {
          if (max <= min) return min;
          return Math.floor(Math.random() * (max - min + 1)) + min;
        };

        const engTargets = {
          likesTarget: getRandom(sub.likesMin, sub.likesMax),
          commentsTarget: getRandom(sub.commentsMin, sub.commentsMax),
          sharesTarget: getRandom(sub.sharesMin, sub.sharesMax),
          savesTarget: getRandom(sub.savesMin, sub.savesMax),
          repostsTarget: getRandom(sub.repostsMin, sub.repostsMax),
        };

        const viewsCost = (targetViews / 1000) * getRate("views", 3.0);
        const likesCost = (engTargets.likesTarget / 1000) * getRate("likes", 5.0);
        const savesCost = (engTargets.savesTarget / 1000) * getRate("saves", 5.0);
        const sharesCost = (engTargets.sharesTarget / 1000) * getRate("shares", 8.0);
        const commentsCost = (engTargets.commentsTarget / 1000) * getRate("comments", 15.0);
        const repostsCost = (engTargets.repostsTarget / 1000) * getRate("reposts", 12.0);
        const totalPrice = parseFloat((viewsCost + likesCost + savesCost + sharesCost + commentsCost + repostsCost).toFixed(2));

        if (sub.user.balance + sub.user.bonusBalance < totalPrice) {
          // Pause subscription
          await prisma.autoSubscription.update({
            where: { id: sub.id },
            data: { status: "INSUFFICIENT_FUNDS" }
          });
          
          if (!isGhostEmail(sub.user.email)) {
            sendTelegramAlert(`⚠️ *Auto-Order Paused*\nUser: \`${sub.user.email}\`\nReason: Insufficient funds for new post @${sub.username} (Requires ₹${totalPrice})`).catch(console.error);
          }
          results.push({ username: sub.username, status: "PAUSED_FUNDS" });
          continue;
        }

        // Deduct balance and create order
        let bonusDeduct = 0;
        let realDeduct = 0;
        if (sub.user.bonusBalance >= totalPrice) {
          bonusDeduct = totalPrice;
        } else {
          bonusDeduct = sub.user.bonusBalance;
          realDeduct = totalPrice - sub.user.bonusBalance;
        }

        const txOrder = await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: sub.user.id },
            data: { 
              balance: { decrement: realDeduct },
              bonusBalance: { decrement: bonusDeduct }
            }
          });

          let reel = await tx.reel.findFirst({ where: { url, userId: sub.user.id } });
          if (!reel) {
            reel = await tx.reel.create({
              data: { url, platform: sub.platform as any, userId: sub.user.id }
            });
          }

          const createdOrder = await tx.order.create({
            data: {
              userId: sub.user.id,
              reelId: reel.id,
              panelId: adminPanel.id,
              status: "PENDING",
              priceCharged: totalPrice,
              viewsTarget: targetViews,
              likesTarget: engTargets.likesTarget,
              savesTarget: engTargets.savesTarget,
              sharesTarget: engTargets.sharesTarget,
              commentsTarget: engTargets.commentsTarget,
              repostsTarget: engTargets.repostsTarget,
              curveStyle: template.style,
              durationHours: template.durationHours,
              warmupHours: template.warmupHours,
              peakHours: template.peakHours,
              decayHours: template.decayHours,
              viewsRemaining: targetViews,
            }
          });

          await tx.autoSubscription.update({
            where: { id: sub.id },
            data: { lastPostId: post.id }
          });
          
          return createdOrder;
        });

        if (!isGhostEmail(sub.user.email)) {
          sendTelegramAlert(`🚀 *Auto-Order Placed!*\nUser: \`${sub.user.email}\`\nReel: ${url}\nTarget: ${targetViews} views (Template: ${template.name})`).catch(console.error);
        }

        // Trigger delivery scheduling (fire-and-forget)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
        const internalKey = process.env.NEXTAUTH_SECRET || "default_internal_key";
        fetch(`${appUrl}/api/delivery/start`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-key": internalKey,
          },
          body: JSON.stringify({ orderId: txOrder.id }),
        }).catch((e) => console.error("Failed to trigger delivery/start:", e));

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
