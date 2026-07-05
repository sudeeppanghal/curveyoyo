const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const failedOrders = await prisma.order.findMany({
    where: { status: 'FAILED' },
    include: {
      user: true,
      reel: true,
    }
  });

  console.log(`Total Failed Orders: ${failedOrders.length}`);
  
  const reasons = {};
  failedOrders.forEach(o => {
    const reason = o.failReason || "No reason logged";
    if (!reasons[reason]) reasons[reason] = { count: 0, sampleUrls: [] };
    reasons[reason].count++;
    if (reasons[reason].sampleUrls.length < 3) {
      reasons[reason].sampleUrls.push({ url: o.reel.url, qty: o.viewsTarget });
    }
  });

  for (const [r, data] of Object.entries(reasons)) {
    console.log(`\nReason: "${r}"`);
    console.log(`Count: ${data.count}`);
    console.log(`Samples:`);
    data.sampleUrls.forEach(s => console.log(`  URL: ${s.url} | Target Qty: ${s.qty}`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
