import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const panels = await prisma.panel.findMany();
  console.log("=== SMM Panels Status ===");
  for (const p of panels) {
    console.log({
      id: p.id,
      name: p.name,
      status: p.status,
      apiUrl: p.apiUrl,
      lastCheckedAt: p.lastCheckedAt
    });
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
