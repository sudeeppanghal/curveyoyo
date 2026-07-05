const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const yoyoPanels = await prisma.panel.findMany({ where: { name: { contains: 'yoyo', mode: 'insensitive' } } });
  const yoyoPanelIds = yoyoPanels.map(p => p.id);

  const services = await prisma.adminService.findMany({
    where: { panelId: { in: yoyoPanelIds } },
    orderBy: { platform: 'asc' }
  });

  console.log(`Found ${services.length} mapped services for YoYo Media across the database.\n`);

  if (services.length === 0) {
     console.log("Looks like there are no services currently saved in AdminService for YoYo Media.");
     console.log("I will check ALL panels' mapped services just in case:");
     const allServices = await prisma.adminService.findMany();
     allServices.forEach(s => {
       console.log(`- ID: ${s.serviceId} | Name: ${s.name} | Rate: ${s.originalRate} -> Custom: ${s.customRate}`);
     });
     return;
  }

  // Print them out nicely
  services.forEach(s => {
    console.log(`[${s.platform} ${s.type.toUpperCase()}]`);
    console.log(`  Name: ${s.name}`);
    console.log(`  Service ID: ${s.serviceId} (Min: ${s.minQuantity})`);
    
    // Calculate what our custom price SHOULD be
    const cost = s.originalRate;
    const recommended = (cost * 5).toFixed(2);
    
    console.log(`  Current Rates -> Panel: ₹${cost}/1k | App Custom: ₹${s.customRate}/1k`);
    console.log(`  Suggested (5x) -> App Custom: ₹${recommended}/1k`);
    console.log(``);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
