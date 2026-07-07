import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkTiktok() {
  try {
    const activeTiktokOrders = await prisma.order.findMany({
      where: {
        reel: {
          platform: "TIKTOK"
        },
        status: {
          in: ["PENDING", "QUEUED", "DELIVERING"]
        }
      },
      include: {
        reel: true,
        deliveryEvents: {
          orderBy: { createdAt: "desc" },
          take: 5
        }
      },
      orderBy: { createdAt: "desc" }
    });

    console.log(`=== Active TikTok Orders Count: ${activeTiktokOrders.length} ===\n`);

    for (const order of activeTiktokOrders) {
      console.log(`Order ID: ${order.id}`);
      console.log(`Reel URL: ${order.reel.url}`);
      console.log(`Status: ${order.status}`);
      console.log(`Created At: ${order.createdAt.toISOString()}`);
      console.log(`Views Target: ${order.viewsTarget}`);
      console.log(`Views Delivered: ${order.viewsDelivered}`);
      console.log(`Views Remaining: ${order.viewsRemaining}`);
      console.log(`Panel Order ID: ${order.panelOrderId || 'None'}`);
      console.log(`Panel Service ID: ${order.panelServiceId || 'None'}`);
      console.log(`Fail Reason: ${order.failReason || 'None'}`);
      console.log(`Recent Delivery Events:`);
      if (order.deliveryEvents.length === 0) {
        console.log(`  No events found.`);
      } else {
        for (const ev of order.deliveryEvents) {
          console.log(`  - [${ev.status}] Scheduled: ${ev.scheduledAt?.toISOString()} | Executed: ${ev.executedAt?.toISOString() || 'Pending'} | Error: ${ev.errorMessage || 'None'}`);
        }
      }
      console.log(`-----------------------------------------------\n`);
    }

    // Let's also check if the Cron is working by looking at recent global delivery events that are SCHEDULED but overdue!
    const overdueEvents = await prisma.deliveryEvent.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: {
          lt: new Date()
        }
      },
      include: {
        order: {
          include: {
            reel: true
          }
        }
      },
      orderBy: { scheduledAt: "asc" },
      take: 10
    });

    console.log(`=== Overdue Scheduled Events: ${overdueEvents.length} ===`);
    for (const ev of overdueEvents) {
      console.log(`  Event ID: ${ev.id} | Scheduled: ${ev.scheduledAt.toISOString()} | Order ID: ${ev.orderId} | Platform: ${ev.order.reel.platform} | Link: ${ev.order.reel.url}`);
    }

  } catch (error) {
    console.error("Error checking TikTok orders:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTiktok();
