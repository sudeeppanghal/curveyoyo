const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orderId = 'cmr3gs8b1000llg044jz411w9';
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      reel: true,
      deliveryEvents: true
    }
  });
  
  if (order) {
    console.log("Order found:");
    console.log("Platform:", order.reel.platform);
    console.log("Views Target:", order.viewsTarget);
    console.log("Engagement Enabled:", order.engagementEnabled);
    console.log("Likes Target:", order.likesTarget);
    console.log("Saves Target:", order.savesTarget);
    console.log("Shares Target:", order.sharesTarget);
    console.log("Comments Target:", order.commentsTarget);
    console.log("Status:", order.status);
    
    console.log("\nEvents:");
    order.deliveryEvents.forEach(e => {
      console.log(`- ${e.type} | ${e.status} | targetQty: ${e.targetQty} | panelOrderId: ${e.panelOrderId} | error: ${e.errorMsg}`);
    });
  } else {
    console.log("Order not found.");
  }
}

main().finally(() => prisma.$disconnect());
