const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const order = await prisma.order.findFirst({
    where: { curveStyle: 'CUSTOM' },
    orderBy: { createdAt: 'desc' },
    include: { deliveryEvents: { take: 5, orderBy: { scheduledAt: 'asc' } } }
  });
  console.log(JSON.stringify(order, null, 2));
}
main().finally(() => prisma.$disconnect());
