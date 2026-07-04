const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const svcs = await prisma.adminService.findMany({ where: { type: 'views' }});
  console.log(JSON.stringify(svcs, null, 2));
}
main().finally(() => prisma.$disconnect());
