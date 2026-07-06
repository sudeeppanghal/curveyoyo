import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: "jaatboy0808@gmail.com" }
  });

  if (!user) return;

  const logs = await prisma.auditLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" }
  });

  console.log(`=== Audit Logs for ${user.email} ===`);
  for (const log of logs) {
    console.log(`[${log.createdAt.toISOString()}] Action: ${log.action} | Meta:`, JSON.stringify(log.metadata));
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
