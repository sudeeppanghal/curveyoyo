const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const failedOrders = await prisma.order.findMany({
    where: { failReason: "The Amount for this order doesnt match" },
    include: {
      reel: true,
      user: true,
    }
  });

  if (failedOrders.length > 0) {
    console.log(JSON.stringify(failedOrders[0], null, 2));
  } else {
    console.log("None found");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
