import { prisma } from "@/lib/prisma";
import { fetchLiveVideoViews } from "@/lib/scraper/custom-scraper";
import { checkPanelOrderStatus } from "@/lib/delivery/panel-client";

/**
 * Iterates through all active DeliveryQueueItems and processes them.
 * This function is intended to be called by a recurring cron job (e.g., every 5-10 minutes).
 */
export async function processVerificationQueue(): Promise<void> {
  const now = new Date();

  // Find all VideoOrders that are currently active (RUNNING)
  const activeOrders = await prisma.videoOrder.findMany({
    where: {
      status: "RUNNING",
    },
    include: {
      video: true,
      queueItems: {
        orderBy: { partNumber: "asc" },
      },
    },
  });

  // Handle pending orders that need to transition to RUNNING
  const pendingOrders = await prisma.videoOrder.findMany({
    where: {
      status: "PENDING",
    },
    include: {
      video: true,
      queueItems: {
        orderBy: { partNumber: "asc" },
      },
    },
  });

  const ordersToProcess = [...activeOrders, ...pendingOrders];

  for (const order of ordersToProcess) {
    try {
      // If order is PENDING, we boot the first part
      if (order.status === "PENDING") {
        await prisma.videoOrder.update({
          where: { id: order.id },
          data: { status: "RUNNING" },
        });
        order.status = "RUNNING";
      }

      // Find the first non-completed queue item (current active part)
      const activeItem = order.queueItems.find(item => item.verifyStatus !== "PASSED" && item.verifyStatus !== "FAILED");
      
      if (!activeItem) {
        // All parts successfully verified and passed!
        await prisma.videoOrder.update({
          where: { id: order.id },
          data: { status: "COMPLETED" },
        });
        continue;
      }

      // If activeItem is still waiting for the SMM order to be placed or completed
      if (activeItem.providerStatus === "PENDING") {
        // Check if there is an active provider ID from delivery process events
        // (delivery process updates deliveryEvent.responseData.panelOrderId when executing)
        const doneEvents = await prisma.deliveryEvent.findMany({
          where: {
            order: {
              reel: { url: order.video.url }
            },
            status: "DONE",
          },
          orderBy: { executedAt: "desc" }
        });

        const relevantEvent = doneEvents.find(e => {
          const resData = e.responseData as any;
          return resData && resData.panelOrderId;
        });

        if (relevantEvent) {
          const resData = relevantEvent.responseData as any;
          if (resData?.panelOrderId) {
            // Establish the live baseline count before this part starts delivering
            let preViews = order.video.currentViews;
            const scraped = await fetchLiveVideoViews(order.video.url);
            if (scraped && scraped.views > 0) {
              preViews = scraped.views;
            }

            await prisma.deliveryQueueItem.update({
              where: { id: activeItem.id },
              data: {
                providerOrderId: String(resData.panelOrderId),
                providerStatus: "PROCESSING",
                viewsBeforePart: preViews,
                startedAt: now,
              },
            });
            activeItem.providerOrderId = String(resData.panelOrderId);
            activeItem.providerStatus = "PROCESSING";
            activeItem.viewsBeforePart = preViews;
          }
        }
      }

      // If SMM order is currently processing, let's poll its status from the panel API
      if (activeItem.providerStatus === "PROCESSING" && activeItem.providerOrderId) {
        // Load the panel used in deliveryEvent to check status
        const orderEvents = await prisma.deliveryEvent.findMany({
          where: {
            order: { reel: { url: order.video.url } }
          },
          include: { panel: true }
        });

        const relevantEvent = orderEvents.find(e => {
          const resData = e.responseData as any;
          return resData && resData.panelOrderId === activeItem.providerOrderId;
        });

        if (relevantEvent?.panel) {
          const panelStatus = await checkPanelOrderStatus(
            relevantEvent.panel.apiUrl,
            relevantEvent.panel.apiKeyEncrypted,
            activeItem.providerOrderId
          );

          if (panelStatus.status === "Completed" || panelStatus.status === "Success" || panelStatus.remains === 0) {
            await prisma.deliveryQueueItem.update({
              where: { id: activeItem.id },
              data: {
                providerStatus: "COMPLETED",
                completedAt: now,
              },
            });
            activeItem.providerStatus = "COMPLETED";
          } else if (panelStatus.status === "Canceled" || panelStatus.status === "Partial" || panelStatus.status === "Failed") {
            // SMM panel failed, we flag this item to trigger refund or retry
            await prisma.deliveryQueueItem.update({
              where: { id: activeItem.id },
              data: {
                providerStatus: "FAILED",
                verifyStatus: "FAILED",
                completedAt: now,
              },
            });
            continue;
          }
        }
      }

      // Once the provider reports completion, verify views using our custom scraper
      if (activeItem.providerStatus === "COMPLETED" && activeItem.verifyStatus === "PENDING") {
        await prisma.deliveryQueueItem.update({
          where: { id: activeItem.id },
          data: { verifyStatus: "VERIFYING" },
        });

        const scraped = await fetchLiveVideoViews(order.video.url);
        const currentViews = scraped ? scraped.views : null;

        if (currentViews !== null) {
          // Update global video cache views
          await prisma.video.update({
            where: { id: order.videoId },
            data: { currentViews, lastCheckedAt: now },
          });

          // Log history
          await prisma.viewHistory.create({
            data: { videoId: order.videoId, views: currentViews, checkedAt: now },
          });

          const deliveredQty = currentViews - activeItem.viewsBeforePart;
          // Tolerance threshold (90% of requested quantity)
          const targetQty = activeItem.requestedViews;
          const toleranceQty = targetQty * 0.9;

          if (deliveredQty >= toleranceQty || currentViews >= activeItem.viewsBeforePart + targetQty - 100) {
            // Passed verification! Lock in part metrics and activate next sequential part
            await prisma.deliveryQueueItem.update({
              where: { id: activeItem.id },
              data: {
                verifyStatus: "PASSED",
                viewsAfterPart: currentViews,
                verifiedAt: now,
              },
            });
          } else {
            // Verification failed, reschedule check or mark as failed for retry/refund
            const ageMinutes = (now.getTime() - (activeItem.completedAt?.getTime() ?? now.getTime())) / (60 * 1000);
            if (ageMinutes > 120) {
              // Failed delivery threshold (give 2 hours for views to fully register in analytics)
              await prisma.deliveryQueueItem.update({
                where: { id: activeItem.id },
                data: {
                  verifyStatus: "FAILED",
                  viewsAfterPart: currentViews,
                  verifiedAt: now,
                },
              });
            } else {
              // Reset status to verify again in the next worker cron check
              await prisma.deliveryQueueItem.update({
                where: { id: activeItem.id },
                data: { verifyStatus: "PENDING" },
              });
            }
          }
        } else {
          // Scraper returned null (e.g. temporary API block). Reset status to retry later
          await prisma.deliveryQueueItem.update({
            where: { id: activeItem.id },
            data: { verifyStatus: "PENDING" },
          });
        }
      }

    } catch (err: any) {
      console.error(`[Queue Worker] Failed to process videoOrder ${order.id}:`, err.message);
    }
  }
}
