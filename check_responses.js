const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orderId = 'cmr3gs8b1000llg044jz411w9';
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      deliveryEvents: true
    }
  });
  
  if (order) {
    order.deliveryEvents.forEach((e, i) => {
      console.log(`Event ${i + 1} | Status: ${e.status} | Views: ${e.viewsBatch}`);
      console.log(`ResponseData:`, JSON.stringify(e.responseData, null, 2));
      console.log(`ErrorMessage:`, e.errorMessage);
      console.log("-------------------");
    });
  }
}

main().finally(() => prisma.$disconnect());
