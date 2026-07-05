const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const services = await prisma.adminService.findMany({
    orderBy: [{ platform: 'asc' }, { type: 'asc' }]
  });

  const analysis = {};

  services.forEach(s => {
    const key = `[${s.platform}] ${s.type.toUpperCase()}`;
    if (!analysis[key]) {
      analysis[key] = [];
    }
    
    const cost = s.originalRate;
    const currentPrice = s.customRate;
    const targetPrice = (cost * 5).toFixed(2);
    
    // Check organic compatibility
    let organicStatus = "🟢 Excellent (Low Min, Good for Jitter)";
    let warning = "";
    if (s.minQuantity >= 100) {
      organicStatus = "🔴 Poor (Min 100 - Panel likely strictly requires round batches)";
      warning = "=> Will cause 'Amount Doesn't Match' errors with organic random numbers.";
    } else if (s.name.includes("100 Min")) {
      organicStatus = "🔴 Poor (Name suggests strict 100 multiples)";
    }

    analysis[key].push({
      name: s.name,
      id: s.serviceId,
      min: s.minQuantity,
      cost,
      currentPrice,
      targetPrice,
      organicStatus,
      warning
    });
  });

  for (const [category, list] of Object.entries(analysis)) {
    // Only pick the first unique one per category to avoid spam
    const uniqueList = [];
    const seen = new Set();
    for (const item of list) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        uniqueList.push(item);
      }
    }
    
    console.log(`\n===========================================`);
    console.log(`${category}`);
    console.log(`===========================================`);
    uniqueList.forEach(item => {
      console.log(`Service: ${item.name} (ID: ${item.id})`);
      console.log(`Organic Compatibility: ${item.organicStatus}`);
      if (item.warning) console.log(`  ${item.warning}`);
      console.log(`Pricing:`);
      console.log(`  - Panel Cost: ₹${item.cost}/1k`);
      console.log(`  - Your Current Price: ₹${item.currentPrice}/1k`);
      console.log(`  - Suggested 5x Price: ₹${item.targetPrice}/1k`);
      console.log(`-------------------------------------------`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
