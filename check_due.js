const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const now = new Date();
  const dueEvents = await prisma.deliveryEvent.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
      order: { status: "DELIVERING" },
    },
    take: 10,
    orderBy: { scheduledAt: 'asc' }
  });
  console.log(`There are ${dueEvents.length} due events.`);
  if (dueEvents.length > 0) {
    console.log(JSON.stringify(dueEvents, null, 2));
  }
}
main().finally(() => prisma.$disconnect());
