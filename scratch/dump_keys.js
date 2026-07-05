const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const panels = await prisma.panel.findMany();
  panels.forEach(p => {
    console.log(`Name: "${p.name}" | Status: ${p.status}`);
    console.log(`  apiUrl: ${p.apiUrl}`);
    console.log(`  apiKeyEncrypted (raw stored value): "${p.apiKeyEncrypted}"`);
    console.log('');
  });
}
main().finally(() => prisma.$disconnect());
