const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const executingEvents = await prisma.deliveryEvent.findMany({
    where: {
      status: "EXECUTING"
    }
  });
  console.log(`There are ${executingEvents.length} EXECUTING events.`);
  
  const now = new Date();
  const dueEvents = await prisma.deliveryEvent.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
      order: { status: "DELIVERING" },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 10
  });
  console.log(`There are ${dueEvents.length} overdue SCHEDULED events.`);
  
  if (executingEvents.length > 0) {
    console.log("EXECUTING:", executingEvents);
  }
}

main().finally(() => prisma.$disconnect());
