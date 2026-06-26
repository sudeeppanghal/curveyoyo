import { prisma } from "@/lib/prisma";
import { checkPanelOrderStatus, placePanelOrder } from "./panel-client";

interface ServiceIds {
  [platform: string]: {
    [type: string]: string;
  };
}

function getServiceId(serviceIds: ServiceIds | null, platform: string, type: string): string | null {
  if (!serviceIds) return null;
  return serviceIds[platform.toLowerCase()]?.[type] ?? null;
}

/**
 * Checks the status of all SMM panel orders placed for this campaign.
 * If any order was returned as Partial or Cancelled, calculates the shortfall
 * and places a new refill order on the panel automatically.
 */
export async function checkAndRefillOrder(orderId: string): Promise<{
  ok: boolean;
  refillsPlaced?: Record<string, number>;
  error?: string;
}> {
  console.log(`[REFILL CHECK] Starting refill verification for Order ID: ${orderId}`);

  // 1. Fetch order details
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      reel: true,
      user: {
        include: {
          panels: {
            where: { isActive: true },
            orderBy: { priority: "asc" },
          },
        },
      },
    },
  });

  if (!order) {
    return { ok: false, error: "Order not found" };
  }

  const panels = order.user.panels;
  if (!panels.length) {
    return { ok: false, error: "No active panels configured for user" };
  }
  const activePanel = panels[0]; // Primary active panel

  // 2. Load all DONE delivery events to check their panel order statuses
  const events = await prisma.deliveryEvent.findMany({
    where: { orderId, status: "DONE" },
  });

  if (!events.length) {
    console.log(`[REFILL CHECK] No completed delivery events found for Order ID: ${orderId}. Skipping.`);
    return { ok: true, refillsPlaced: {} };
  }

  // 3. Accumulate shortfalls
  let viewsShortfall = 0;
  let likesShortfall = 0;
  let savesShortfall = 0;
  let sharesShortfall = 0;
  let commentsShortfall = 0;

  for (const event of events) {
    const data = event.responseData as any;
    if (!data) continue;

    // Check views order status
    if (data.panelOrderId) {
      try {
        const statusResult = await checkPanelOrderStatus(
          activePanel.apiUrl,
          activePanel.apiKeyEncrypted,
          data.panelOrderId
        );

        if (statusResult.status === "Partial" || statusResult.status === "Cancelled") {
          const remains = statusResult.remains ?? 0;
          if (remains > 0) {
            console.log(`[REFILL CHECK] Views panel order ${data.panelOrderId} returned status: ${statusResult.status} with ${remains} remaining.`);
            viewsShortfall += remains;
          }
        }
      } catch (err) {
        console.error(`[REFILL CHECK] Error checking status for views order ${data.panelOrderId}:`, err);
      }
    }

    // Check engagement order statuses
    if (data.engagementPanelOrderIds) {
      const engOrderIds = data.engagementPanelOrderIds as Record<string, string>;
      for (const [type, panelOrderId] of Object.entries(engOrderIds)) {
        if (!panelOrderId) continue;
        try {
          const statusResult = await checkPanelOrderStatus(
            activePanel.apiUrl,
            activePanel.apiKeyEncrypted,
            panelOrderId
          );

          if (statusResult.status === "Partial" || statusResult.status === "Cancelled") {
            const remains = statusResult.remains ?? 0;
            if (remains > 0) {
              console.log(`[REFILL CHECK] Engagement (${type}) panel order ${panelOrderId} returned status: ${statusResult.status} with ${remains} remaining.`);
              if (type === "likes") likesShortfall += remains;
              if (type === "saves") savesShortfall += remains;
              if (type === "shares") sharesShortfall += remains;
              if (type === "comments") commentsShortfall += remains;
            }
          }
        } catch (err) {
          console.error(`[REFILL CHECK] Error checking status for engagement ${type} order ${panelOrderId}:`, err);
        }
      }
    }
  }

  // 4. Trigger Refills for Shortfalls
  const svcIds = activePanel.serviceIds as ServiceIds | null;
  const platform = order.reel.platform.toLowerCase();
  const refillsPlaced: Record<string, number> = {};

  // Helper function to place refill
  const placeRefill = async (type: string, quantity: number, serviceId: string | null) => {
    if (!serviceId) {
      console.warn(`[REFILL CHECK] No service ID configured for ${platform} ${type}. Cannot place refill.`);
      return false;
    }

    console.log(`[REFILL CHECK] Placing refill order on panel for ${quantity} ${type}...`);
    const res = await placePanelOrder({
      apiUrl: activePanel.apiUrl,
      apiKeyEncrypted: activePanel.apiKeyEncrypted,
      serviceId,
      link: order.reel.url,
      quantity,
    });

    if (res.ok) {
      console.log(`[REFILL CHECK] Refill order placed successfully. Panel Order ID: ${res.orderId}`);
      refillsPlaced[type] = quantity;
      return true;
    } else {
      console.error(`[REFILL CHECK] Refill order failed: ${res.error}`);
      return false;
    }
  };

  // Refill Views
  if (viewsShortfall > 0) {
    const viewsSvcId = getServiceId(svcIds, platform, "views") ?? order.panelServiceId ?? "1";
    await placeRefill("views", viewsShortfall, viewsSvcId);
  }

  // Refill Likes
  if (likesShortfall > 0) {
    const likesSvcId = getServiceId(svcIds, platform, "likes");
    await placeRefill("likes", likesShortfall, likesSvcId);
  }

  // Refill Saves
  if (savesShortfall > 0) {
    const savesSvcId = getServiceId(svcIds, platform, "saves");
    await placeRefill("saves", savesShortfall, savesSvcId);
  }

  // Refill Shares
  if (sharesShortfall > 0) {
    const sharesSvcId = getServiceId(svcIds, platform, "shares");
    await placeRefill("shares", sharesShortfall, sharesSvcId);
  }

  // Refill Comments
  if (commentsShortfall > 0) {
    const commentsSvcId = getServiceId(svcIds, platform, "comments");
    await placeRefill("comments", commentsShortfall, commentsSvcId);
  }

  // 5. Create Audit Log and record Delivery Events for monitoring
  if (Object.keys(refillsPlaced).length > 0) {
    await prisma.auditLog.create({
      data: {
        userId: order.userId,
        action: "REFILL_TRIGGERED",
        metadata: {
          orderId,
          shortfalls: {
            views: viewsShortfall,
            likes: likesShortfall,
            saves: savesShortfall,
            shares: sharesShortfall,
            comments: commentsShortfall,
          },
          refillsPlaced,
        },
      },
    });
  }

  return { ok: true, refillsPlaced };
}
