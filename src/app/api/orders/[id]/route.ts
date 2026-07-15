import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { triggerMidwayRefund } from "@/lib/delivery/refund";
import { isGhostEmail } from "@/lib/ghost";
import { sendTelegramAlert } from "@/lib/telegram";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id: orderId } = await params;
    const body = await req.json();
    const { action } = body as { action: "pause" | "cancel" | "resume" | "refill" };

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ 
      where: { id: orderId },
      include: { reel: true }
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.userId !== dbUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "refill") {
      if (order.status !== "CANCELLED" && order.status !== "FAILED") {
        return NextResponse.json({ error: "Only failed or cancelled orders can be refilled" }, { status: 400 });
      }

      // Calculate remaining quantities
      const viewsDelivered = order.viewsDelivered || 0;
      const viewsTarget = order.viewsTarget || 0;
      const viewsRemaining = viewsTarget - viewsDelivered;

      // If shortfall is tiny, automatically mark as COMPLETED
      if (viewsRemaining < 100) {
        await prisma.order.update({
          where: { id: orderId },
          data: { 
            status: "COMPLETED", 
            failReason: null,
            viewsDelivered: viewsTarget // Set to target for cleaner UI display
          }
        });
        return NextResponse.json({ ok: true, message: "Campaign is already 99% complete. Marked as completed!" });
      }

      const likesDelivered = order.likesDelivered || 0;
      const likesTarget = order.likesTarget || 0;
      const likesRemaining = Math.max(0, likesTarget - likesDelivered);

      const savesDelivered = order.savesDelivered || 0;
      const savesTarget = order.savesTarget || 0;
      const savesRemaining = Math.max(0, savesTarget - savesDelivered);

      const sharesDelivered = order.sharesDelivered || 0;
      const sharesTarget = order.sharesTarget || 0;
      const sharesRemaining = Math.max(0, sharesTarget - sharesDelivered);

      const commentsDelivered = order.commentsDelivered || 0;
      const commentsTarget = order.commentsTarget || 0;
      const commentsRemaining = Math.max(0, commentsTarget - commentsDelivered);

      const repostsDelivered = order.repostsDelivered || 0;
      const repostsTarget = order.repostsTarget || 0;
      const repostsRemaining = Math.max(0, repostsTarget - repostsDelivered);

      // Check if this order was already refunded historically (from old system or manual cancel)
      const existingRefund = await prisma.auditLog.findFirst({
        where: {
          action: "ORDER_MIDWAY_REFUND",
          metadata: {
            path: ["orderId"],
            equals: orderId
          }
        }
      });

      let totalPrice = 0.0;
      let adminServices: any[] = [];

      // If user was already refunded, we charge them for the refill based on current rates (Backward compatibility).
      // Otherwise, the refill is FREE (totalPrice = 0.0).
      if (existingRefund) {
        // Fetch rates from the order's panel, matching the correct platform
        adminServices = await prisma.adminService.findMany({
          where: { 
            panelId: order.panelId || undefined,
            platform: order.reel.platform
          }
        });

        const getRate = (type: string, fallback: number) => {
          const s = adminServices.find(x => x.type === type);
          return s ? s.customRate : fallback;
        };

        const viewsCost = (viewsRemaining / 1000) * getRate("views", 3.0);
        const likesCost = (likesRemaining / 1000) * getRate("likes", 5.0);
        const savesCost = (savesRemaining / 1000) * getRate("saves", 5.0);
        const sharesCost = (sharesRemaining / 1000) * getRate("shares", 8.0);
        const commentsCost = (commentsRemaining / 1000) * getRate("comments", 15.0);
        const repostsCost = (repostsRemaining / 1000) * getRate("reposts", 12.0);

        totalPrice = parseFloat((viewsCost + likesCost + savesCost + sharesCost + commentsCost + repostsCost).toFixed(2));
      }

      let initialBalance = 0;
      let initialBonusBalance = 0;
      let finalBalance = 0;
      let finalBonusBalance = 0;

      // Lock user row and deduct balance
      await prisma.$transaction(async (tx) => {
        const users = await tx.$queryRaw<any[]>`
          SELECT id, balance, "bonus_balance" as "bonusBalance" FROM users WHERE id = ${dbUser.id} FOR UPDATE
        `;
        const userForUpdate = users[0];
        if (!userForUpdate) throw new Error("USER_NOT_FOUND");

        const currentBalance = parseFloat(userForUpdate.balance || 0);
        const currentBonusBalance = parseFloat(userForUpdate.bonusBalance || 0);

        initialBalance = currentBalance;
        initialBonusBalance = currentBonusBalance;

        if (totalPrice > 0) {
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
        } else {
          finalBalance = currentBalance;
          finalBonusBalance = currentBonusBalance;
        }

        // Reset the order for remaining targets
        await tx.order.update({
          where: { id: orderId },
          data: {
            viewsTarget: viewsRemaining,
            viewsDelivered: 0,
            viewsRemaining: viewsRemaining,
            
            likesTarget: likesRemaining,
            likesDelivered: 0,
            
            savesTarget: savesRemaining,
            savesDelivered: 0,
            
            sharesTarget: sharesRemaining,
            sharesDelivered: 0,
            
            commentsTarget: commentsRemaining,
            commentsDelivered: 0,
            
            repostsTarget: repostsRemaining,
            repostsDelivered: 0,
            
            status: "QUEUED",
            failReason: null,
            // Keep original price if free refill, else add the new cost
            priceCharged: totalPrice > 0 ? parseFloat((order.priceCharged + totalPrice).toFixed(2)) : order.priceCharged
          }
        });

        // Remove old delivery events
        await tx.deliveryEvent.deleteMany({
          where: { orderId }
        });
      });

      // Trigger delivery/start in background
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
      const internalKey = process.env.NEXTAUTH_SECRET || "default_internal_key";
      fetch(`${appUrl}/api/delivery/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-key": internalKey,
        },
        body: JSON.stringify({ orderId }),
      }).catch((e) => console.error("Failed to trigger delivery/start:", e));

      if (!isGhostEmail(dbUser.email)) {
        sendTelegramAlert(
          `🔄 *Order Refill Placed!*\n\n` +
          `👤 *User:* \`${dbUser.email}\`\n` +
          `🎯 *Views Refilled:* \`${viewsRemaining.toLocaleString()}\`\n` +
          `💵 *Price Charged:* \`₹${totalPrice.toLocaleString()}\`\n` +
          `💰 *Initial Balance:* \`₹${initialBalance.toFixed(2)}\` (Bonus: \`₹${initialBonusBalance.toFixed(2)}\`)\n` +
          `💰 *Remaining Balance:* \`₹${finalBalance.toFixed(2)}\` (Bonus: \`₹${finalBonusBalance.toFixed(2)}\`)\n` +
          `🔗 *Order ID:* \`${orderId}\``
        ).catch(console.error);
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: order.userId,
          action: `USER_REFILL_ORDER`,
          metadata: { orderId, chargedPrice: totalPrice },
        },
      });

      return NextResponse.json({ ok: true, status: "QUEUED" });
    }

    let newStatus: OrderStatus;
    if (action === "pause") {
      if (order.status !== "QUEUED" && order.status !== "DELIVERING") {
        return NextResponse.json({ error: "Order cannot be paused in its current state" }, { status: 400 });
      }
      newStatus = "PAUSED";
    } else if (action === "cancel") {
      if (order.status === "COMPLETED" || order.status === "CANCELLED") {
        return NextResponse.json({ error: "Order is already completed or cancelled" }, { status: 400 });
      }
      newStatus = "CANCELLED";
    } else if (action === "resume") {
      if (order.status !== "PAUSED") {
        return NextResponse.json({ error: "Order is not paused" }, { status: 400 });
      }
      newStatus = order.viewsDelivered === 0 ? "QUEUED" : "DELIVERING";
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    });

    if (action === "pause" || action === "cancel") {
      // Cancel scheduled events
      await prisma.deliveryEvent.updateMany({
        where: { orderId, status: "SCHEDULED" },
        data: { status: "FAILED", errorMessage: `Order ${action}d by user` },
      });
      if (action === "cancel") {
        await triggerMidwayRefund(orderId, true);
      }
    } else if (action === "resume") {
      // Re-schedule failed/paused events that were cancelled by user or admin
      await prisma.deliveryEvent.updateMany({
        where: { 
          orderId, 
          status: "FAILED", 
          OR: [
            { errorMessage: { contains: "user" } },
            { errorMessage: { contains: "administrator" } }
          ]
        },
        data: { status: "SCHEDULED", errorMessage: null },
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: order.userId,
        action: `USER_${action.toUpperCase()}_ORDER`,
        metadata: { orderId },
      },
    });

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (error: any) {
    if (error.message === "INSUFFICIENT_BALANCE") {
      return NextResponse.json({ error: "Insufficient balance. Please deposit more money before ordering a refill." }, { status: 400 });
    }
    if (error.message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.error("Order Action API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
