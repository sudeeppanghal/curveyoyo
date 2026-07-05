const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const s = await prisma.adminService.findFirst({ where: { platform: 'TIKTOK', type: 'views' }});
  console.log(s);
}
main().finally(() => prisma.$disconnect());
