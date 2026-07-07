import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  try {
    const deliveringOrders = await prisma.order.findMany({
      where: {
        status: "DELIVERING"
      },
      include: {
        reel: true,
        deliveryEvents: true
      }
    });

    console.log(`Scanning ${deliveringOrders.length} delivering orders for stuck campaigns...`);
    let rescheduledCount = 0;
    const now = new Date();

    for (const order of deliveringOrders) {
      const activeEvents = order.deliveryEvents.filter(
        e => ["SCHEDULED", "EXECUTING", "RETRYING"].includes(e.status)
      );

      if (activeEvents.length === 0 && order.viewsRemaining > 0) {
        rescheduledCount++;
        console.log(`Rescheduling Order ID: ${order.id} | Platform: ${order.reel.platform}`);
        console.log(`  Target: ${order.viewsTarget} | Remaining views to send: ${order.viewsRemaining}`);

        // Select the panel ID to run this batch
        const panelId = order.panelId || order.deliveryEvents[0]?.panelId;
        if (!panelId) {
          console.log(`  [SKIP] No panel ID found associated with order.`);
          continue;
        }

        // Create a new SCHEDULED delivery event for the remaining views
        await prisma.deliveryEvent.create({
          data: {
            orderId: order.id,
            panelId: panelId,
            viewsBatch: order.viewsRemaining,
            // Schedule it to run immediately
            scheduledAt: new Date(now.getTime() + 1000 * rescheduledCount), // space by 1s
            status: "SCHEDULED",
            responseData: {}
          }
        });
        
        console.log(`  [OK] Created new SCHEDULED event for immediate execution.`);
      }
    }

    console.log(`\nSuccessfully rescheduled ${rescheduledCount} stuck orders to run immediately!`);

  } catch (error) {
    console.error("Error rescheduling stuck orders:", error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
