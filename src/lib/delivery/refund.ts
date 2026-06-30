import { prisma } from "@/lib/prisma";

export async function triggerMidwayRefund(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, reel: true }
    });
    
    if (!order || !order.user.walletMode || order.priceCharged <= 0) return;
    
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
    
    const deliveredCost = parseFloat(
      (deliveredViewsCost + deliveredLikesCost + deliveredSavesCost + deliveredSharesCost + deliveredCommentsCost).toFixed(2)
    );
    
    const refundAmount = parseFloat(Math.max(0, order.priceCharged - deliveredCost).toFixed(2));
    
    if (refundAmount > 0) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: order.userId },
          data: { balance: { increment: refundAmount } },
        }),
        prisma.auditLog.create({
          data: {
            userId: order.userId,
            action: "ORDER_MIDWAY_REFUND",
            metadata: {
              orderId: order.id,
              refundAmount,
              priceCharged: order.priceCharged,
              deliveredCost,
              viewsDelivered: order.viewsDelivered,
              viewsTarget: order.viewsTarget
            },
          },
        }),
      ]);
      console.log(`[Refund] Successfully refunded ₹${refundAmount} to user ${order.user.email} for order ${order.id}`);
    }
  } catch (e) {
    console.error("[Refund] Failed to process midway refund for order:", orderId, e);
  }
}
