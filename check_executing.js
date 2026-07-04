require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const executingEvents = await prisma.deliveryEvent.findMany({
    where: {
      status: "EXECUTING"
    }
  });
  console.log(`There are ${executingEvents.length} EXECUTING events.`);
  
  const failedEvents = await prisma.deliveryEvent.findMany({
    where: {
      status: "FAILED"
    }
  });
  console.log(`There are ${failedEvents.length} FAILED events.`);
}

main().finally(() => prisma.$disconnect());
