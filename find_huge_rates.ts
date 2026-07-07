import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("=== Searching for Extremely Large Rates ===");

  const hugeServices = await prisma.adminService.findMany({
    where: {
      OR: [
        { originalRate: { gt: 1000 } },
        { customRate: { gt: 5000 } }
      ]
    },
    include: { panel: true }
  });

  console.log(`Found ${hugeServices.length} services with extremely large rates.`);

  for (const s of hugeServices) {
    console.log(`ID: ${s.id} | Panel: ${s.panel?.name} | Platform: ${s.platform} | Type: ${s.type}`);
    console.log(`  SMM ID: ${s.serviceId} | Name: ${s.name}`);
    console.log(`  Original Rate: ${s.originalRate} | Custom Rate: ${s.customRate}`);
    console.log(`-----------------------------------------`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
