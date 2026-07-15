import { prisma } from "@/lib/prisma";
import { isGhostEmail } from "@/lib/ghost";

export async function triggerMidwayRefund(orderId: string, isManual: boolean = false) {
  try {
    if (!isManual) {
      console.log(`[Refund] Skipping automatic refund for order ${orderId} (retained for zero-charge refill flow).`);
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, reel: true }
    });
    
    if (!order || !order.user.walletMode || order.priceCharged <= 0) return;
    
    // 1. Sync live statuses from SMM panel for completed/done events
    // This ensures we get the latest partial/cancelled remains before refunding.
    const userWithPanels = await prisma.user.findUnique({
      where: { id: order.userId },
      include: {
        panels: {
          where: { isActive: true },
          orderBy: { priority: "asc" }
        }
      }
    });

    const isGhost = isGhostEmail(order.user.email);
    let activePanel = userWithPanels?.panels[0];
    if (order.user.walletMode && !isGhost && !activePanel) {
      // Fallback to global admin panels for wallet users
      const globalPanel = await prisma.panel.findFirst({
        where: { userId: null, isActive: true },
        orderBy: { priority: "asc" }
      });
      if (globalPanel) activePanel = globalPanel;
    }

    if (activePanel) {
      const events = await prisma.deliveryEvent.findMany({
        where: { orderId, status: "DONE" }
      });

      const { checkPanelOrderStatus } = await import("./panel-client");

      let viewsAdjustment = 0;
      let likesAdjustment = 0;
      let savesAdjustment = 0;
      let sharesAdjustment = 0;
      let commentsAdjustment = 0;
      let repostsAdjustment = 0;

      const updatedEvents: { id: string; responseData: any }[] = [];

      for (const event of events) {
        const data = event.responseData as any;
        if (!data) continue;

        let changed = false;

        // Sync views order
        if (data.panelOrderId && !data.syncedStatus) {
          try {
            const statusResult = await checkPanelOrderStatus(
              activePanel.apiUrl,
              activePanel.apiKeyEncrypted,
              data.panelOrderId
            );
            if (statusResult.status === "Partial" || statusResult.status === "Cancelled") {
              const remains = statusResult.remains ?? 0;
              if (remains > 0) {
                viewsAdjustment += remains;
                data.syncedStatus = statusResult.status;
                data.syncedRemains = remains;
                changed = true;
              }
            }
          } catch (err) {
            console.error(`[Refund Sync] Failed to check views status for ${data.panelOrderId}:`, err);
          }
        }

        // Sync engagement orders
        if (data.engagementPanelOrderIds) {
          if (!data.engagementSyncedStatus) {
            data.engagementSyncedStatus = {};
          }
          const engOrderIds = data.engagementPanelOrderIds as Record<string, string>;
          for (const [type, panelOrderId] of Object.entries(engOrderIds)) {
            if (!panelOrderId || data.engagementSyncedStatus[type]) continue;
            try {
              const statusResult = await checkPanelOrderStatus(
                activePanel.apiUrl,
                activePanel.apiKeyEncrypted,
                panelOrderId
              );
              if (statusResult.status === "Partial" || statusResult.status === "Cancelled") {
                const remains = statusResult.remains ?? 0;
                if (remains > 0) {
                  if (type === "likes") likesAdjustment += remains;
                  else if (type === "saves") savesAdjustment += remains;
                  else if (type === "shares") sharesAdjustment += remains;
                  else if (type === "comments") commentsAdjustment += remains;
                  else if (type === "reposts") repostsAdjustment += remains;

                  data.engagementSyncedStatus[type] = statusResult.status;
                  if (!data.engagementSyncedRemains) data.engagementSyncedRemains = {};
                  data.engagementSyncedRemains[type] = remains;
                  changed = true;
                }
              }
            } catch (err) {
              console.error(`[Refund Sync] Failed to check engagement (${type}) status for ${panelOrderId}:`, err);
            }
          }
        }

        if (changed) {
          updatedEvents.push({ id: event.id, responseData: data });
        }
      }

      // If there are any adjustments, apply them to the order in DB
      if (
        viewsAdjustment > 0 ||
        likesAdjustment > 0 ||
        savesAdjustment > 0 ||
        sharesAdjustment > 0 ||
        commentsAdjustment > 0 ||
        repostsAdjustment > 0 ||
        updatedEvents.length > 0
      ) {
        await prisma.$transaction(async (tx) => {
          if (viewsAdjustment > 0 || likesAdjustment > 0 || savesAdjustment > 0 || sharesAdjustment > 0 || commentsAdjustment > 0 || repostsAdjustment > 0) {
            await tx.order.update({
              where: { id: orderId },
              data: {
                viewsDelivered: { decrement: viewsAdjustment },
                viewsRemaining: { increment: viewsAdjustment },
                ...(likesAdjustment > 0 ? { likesDelivered: { decrement: likesAdjustment } } : {}),
                ...(savesAdjustment > 0 ? { savesDelivered: { decrement: savesAdjustment } } : {}),
                ...(sharesAdjustment > 0 ? { sharesDelivered: { decrement: sharesAdjustment } } : {}),
                ...(commentsAdjustment > 0 ? { commentsDelivered: { decrement: commentsAdjustment } } : {}),
                ...(repostsAdjustment > 0 ? { repostsDelivered: { decrement: repostsAdjustment } } : {}),
              }
            });
          }

          for (const ue of updatedEvents) {
            await tx.deliveryEvent.update({
              where: { id: ue.id },
              data: { responseData: ue.responseData }
            });
          }
        });

        // Refresh order details from DB with updated values
        const refreshedOrder = await prisma.order.findUnique({
          where: { id: orderId },
          include: { user: true, reel: true }
        });
        if (refreshedOrder) {
          // Replace order details for subsequent calculations
          order.viewsDelivered = refreshedOrder.viewsDelivered;
          order.likesDelivered = refreshedOrder.likesDelivered;
          order.savesDelivered = refreshedOrder.savesDelivered;
          order.sharesDelivered = refreshedOrder.sharesDelivered;
          order.commentsDelivered = refreshedOrder.commentsDelivered;
          order.repostsDelivered = refreshedOrder.repostsDelivered;
          order.viewsRemaining = refreshedOrder.viewsRemaining;
        }
      }
    }

    // Fetch rates configured for this panel and platform
    const adminServices = await prisma.adminService.findMany({
      where: { 
        panelId: order.panelId || undefined, 
        platform: order.reel.platform 
      }
    });
    
    const getRate = (type: string, fallback: number) => {
      const s = adminServices.find(x => x.type === type);
      return s ? s.customRate : fallback;
    };
    
    // Calculate cost of what was delivered
    const deliveredViewsCost = (order.viewsDelivered / 1000) * getRate("views", 3.0);
    const deliveredLikesCost = (order.likesDelivered / 1000) * getRate("likes", 5.0);
    const deliveredSavesCost = (order.savesDelivered / 1000) * getRate("saves", 5.0);
    const deliveredSharesCost = (order.sharesDelivered / 1000) * getRate("shares", 8.0);
    const deliveredCommentsCost = (order.commentsDelivered / 1000) * getRate("comments", 15.0);
    const deliveredRepostsCost = (order.repostsDelivered / 1000) * getRate("reposts", 12.0);
    
    const currentRunDeliveredCost = parseFloat(
      (deliveredViewsCost + deliveredLikesCost + deliveredSavesCost + deliveredSharesCost + deliveredCommentsCost + deliveredRepostsCost).toFixed(2)
    );

    // Fetch prior refunds and their delivered costs for this order
    const priorRefundLogs = await prisma.auditLog.findMany({
      where: {
        action: "ORDER_MIDWAY_REFUND",
        metadata: {
          path: ["orderId"],
          equals: orderId
        }
      }
    });

    let totalPriorRefunds = 0;
    let totalPriorDeliveredCost = 0;

    priorRefundLogs.forEach(log => {
      const meta = log.metadata as any;
      if (meta) {
        totalPriorRefunds += parseFloat(meta.refundAmount || 0);
        totalPriorDeliveredCost += parseFloat(meta.deliveredCost || 0);
      }
    });

    const totalDeliveredCost = parseFloat((totalPriorDeliveredCost + currentRunDeliveredCost).toFixed(2));
    const refundAmount = parseFloat(Math.max(0, order.priceCharged - totalPriorRefunds - totalDeliveredCost).toFixed(2));
    
    if (refundAmount > 0) {
      await prisma.$transaction(async (tx) => {
        // Double refund protection inside the transaction block
        const latestRefund = await tx.auditLog.findFirst({
          where: {
            action: "ORDER_MIDWAY_REFUND",
            metadata: {
              path: ["orderId"],
              equals: orderId
            }
          },
          orderBy: { createdAt: "desc" }
        });

        if (latestRefund) {
          // Check if there was a refill or resume event after the latest refund
          const reactivation = await tx.auditLog.findFirst({
            where: {
              userId: order.userId,
              action: {
                in: ["USER_REFILL_ORDER", "ORDER_RESUME_CHARGE", "ADMIN_RESUME_ORDER"]
              },
              metadata: {
                path: ["orderId"],
                equals: orderId
              },
              createdAt: {
                gt: latestRefund.createdAt
              }
            }
          });

          if (!reactivation) {
            console.log(`[Refund] Aborted duplicate refund call. Order ${orderId} already refunded and has not been refilled/resumed since.`);
            return;
          }
        }

        await tx.user.update({
          where: { id: order.userId },
          data: { balance: { increment: refundAmount } },
        });

        await tx.auditLog.create({
          data: {
            userId: order.userId,
            action: "ORDER_MIDWAY_REFUND",
            metadata: {
              orderId: order.id,
              refundAmount,
              priceCharged: order.priceCharged,
              deliveredCost: currentRunDeliveredCost,
              viewsDelivered: order.viewsDelivered,
              viewsTarget: order.viewsTarget
            },
          },
        });
        
        console.log(`[Refund] Successfully refunded ₹${refundAmount} to user ${order.user.email} for order ${order.id}`);
      });
    }
  } catch (e) {
    console.error("[Refund] Failed to process midway refund for order:", orderId, e);
  }
}
