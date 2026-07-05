const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const panels = await prisma.panel.findMany();
  console.log(panels.map(p => ({ id: p.id, name: p.name, apiUrl: p.apiUrl, status: p.status })));
}
main().finally(() => prisma.$disconnect());
