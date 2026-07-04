require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allScheduled = await prisma.deliveryEvent.findMany({
    where: { status: "SCHEDULED" },
    select: { id: true, panelId: true }
  });
  
  const nullPanels = allScheduled.filter(e => e.panelId === null);
  console.log(`Out of ${allScheduled.length} SCHEDULED events, ${nullPanels.length} have panelId = null.`);
}
main().finally(() => prisma.$disconnect());
