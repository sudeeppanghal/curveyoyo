const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const events = await prisma.deliveryEvent.findMany({
    where: { orderId: 'cmr5tgkpy0001kz04u5xa0wyi' },
    orderBy: { scheduledAt: 'asc' },
    take: 5
  });
  console.log(JSON.stringify(events, null, 2));
}
main().finally(() => prisma.$disconnect());
