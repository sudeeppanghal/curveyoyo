const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const panels = await prisma.panel.findMany();
  const yoyo = panels.find(p => p.name.toLowerCase().includes('yoyo'));
  
  if (!yoyo) {
    console.log("YoYo Media panel not found in DB.");
    return;
  }

  console.log(`Found Panel: ${yoyo.name} (${yoyo.apiUrl})`);

  const body = new URLSearchParams();
  body.append('key', yoyo.apiKeyEncrypted);
  body.append('action', 'services');

  const res = await fetch(yoyo.apiUrl, {
    method: 'POST',
    body: body.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });

  const services = await res.json();
  if (services.error) {
    console.log("Error from panel:", services.error);
    return;
  }

  const platforms = ['instagram', 'tiktok', 'youtube'];
  const types = ['views', 'likes', 'saves', 'shares', 'comments', 'reposts'];

  console.log(`\n--- YOYO MEDIA SERVICES ANALYSIS (${services.length} total services) ---`);
  console.log(`Criteria for Organic System: LOW minimum quantity (ideally 10-50), no "multiples of 100" in name.`);
  
  for (const plat of platforms) {
    for (const t of types) {
      let matches = services.filter(s => {
        const name = s.name.toLowerCase();
        const cat = s.category.toLowerCase();
        const isPlatMatch = name.includes(plat) || cat.includes(plat);
        
        let isTypeMatch = false;
        if (t === 'views') isTypeMatch = name.includes('view') || name.includes('play');
        if (t === 'likes') isTypeMatch = name.includes('like');
        if (t === 'saves') isTypeMatch = name.includes('save');
        if (t === 'shares') isTypeMatch = name.includes('share');
        if (t === 'comments') isTypeMatch = name.includes('comment');
        if (t === 'reposts') isTypeMatch = name.includes('repost');
        
        return isPlatMatch && isTypeMatch;
      });

      // Sort by minimum quantity to find ones that support exact organic drip numbers
      matches = matches.filter(s => parseInt(s.min) <= 50 && !s.name.toLowerCase().includes('100')).sort((a, b) => parseInt(a.min) - parseInt(b.min));

      if (matches.length > 0) {
        // Pick the top 3 best matching services
        const best = matches.slice(0, 3);
        console.log(`\n[${plat.toUpperCase()} - ${t.toUpperCase()}] Best Organic Candidates:`);
        best.forEach(s => {
          const costPer1k = parseFloat(s.rate);
          const suggestedPrice = (costPer1k * 5).toFixed(2);
          console.log(`  -> Service ID: ${s.service} (Min: ${s.min})`);
          console.log(`     Name: ${s.name}`);
          console.log(`     Panel Rate: ₹${costPer1k}/1k | Suggested Our Price (5x): ₹${suggestedPrice}/1k`);
        });
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
