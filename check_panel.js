const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orderId = 'cmr3gs8b1000llg044jz411w9';
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      panel: true
    }
  });
  
  if (order && order.panel) {
    console.log("Panel:", order.panel.name);
    console.log("Service IDs:", JSON.stringify(order.panel.serviceIds, null, 2));
  } else {
    console.log("No panel or order");
  }
}

main().finally(() => prisma.$disconnect());
