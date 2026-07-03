const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const mappedServices = await prisma.adminService.findMany({
    where: { platform: 'TIKTOK' }
  });
  
  console.log("TikTok mapped services:");
  mappedServices.forEach(s => {
    console.log(`- ${s.type} | minQuantity: ${s.minQuantity} | panelId: ${s.panelId}`);
  });
}

main().finally(() => prisma.$disconnect());
