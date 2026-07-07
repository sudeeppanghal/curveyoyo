import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const panelId = "cmqyqc4y30001l5043exn2t0u";
  console.log(`=== Listing All Services for Panel ID: ${panelId} ===`);

  const services = await prisma.adminService.findMany({
    where: { panelId },
    orderBy: [{ platform: "asc" }, { type: "asc" }]
  });

  for (const s of services) {
    console.log(`Platform: ${s.platform} | Type: ${s.type} | ID: ${s.id}`);
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
