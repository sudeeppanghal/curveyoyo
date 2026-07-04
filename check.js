const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  const failedOrders = await prisma.order.findMany({
    where: { status: "FAILED" },
    select: { id: true, failReason: true, errorMessage: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 10
  });
  console.log(JSON.stringify(failedOrders, null, 2));
}

run().finally(() => prisma.$disconnect());
