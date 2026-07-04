const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const fails = await prisma.order.findMany({
    where: { status: 'FAILED' },
    select: {
      id: true,
      failReason: true,
      startedAt: true,
      completedAt: true,
      _count: { select: { deliveryEvents: true } }
    },
    take: 10,
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(fails, null, 2));
}

main().finally(() => prisma.$disconnect());
