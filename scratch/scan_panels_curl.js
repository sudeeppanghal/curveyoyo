const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const prisma = new PrismaClient();

async function main() {
  const panels = await prisma.panel.findMany({ where: { status: 'ONLINE' } });
  
  for (const p of panels) {
    try {
      const curlCmd = `curl -s -X POST "${p.apiUrl}" -d "key=${p.apiKeyEncrypted}&action=services"`;
      const res = execSync(curlCmd).toString();
      
      const services = JSON.parse(res);
      if (!services.error && Array.isArray(services)) {
        console.log(`\n\n✅ SUCCESS WITH PANEL: ${p.name} (${p.id})`);
        analyzeServices(services);
        return; // Stop after first success to avoid spamming
      }
    } catch (e) {
      // Failed
    }
  }
  console.log("No active panel with valid key found even with curl.");
}

function analyzeServices(services) {
  const platforms = ['instagram', 'tiktok', 'youtube'];
  const types = ['views', 'likes', 'saves', 'shares', 'comments', 'reposts'];

  console.log(`\n--- SERVICES ANALYSIS (${services.length} total services) ---`);
  
  for (const plat of platforms) {
    for (const t of types) {
      let matches = services.filter(s => {
        const name = s.name.toLowerCase();
        const cat = s.category ? s.category.toLowerCase() : '';
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

      // Filter: Min <= 50, and NO "100" in name (implies multiples of 100)
      matches = matches.filter(s => parseInt(s.min) <= 50 && !s.name.includes('100')).sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate));

      if (matches.length > 0) {
        const best = matches.slice(0, 3);
        console.log(`\n[${plat.toUpperCase()} - ${t.toUpperCase()}] Best Organic Candidates (Lowest Min & Price):`);
        best.forEach(s => {
          const costPer1k = parseFloat(s.rate);
          const suggestedPrice = (costPer1k * 5).toFixed(2);
          console.log(`  -> ID: ${s.service} (Min: ${s.min}, Max: ${s.max})`);
          console.log(`     Name: ${s.name}`);
          console.log(`     Panel Rate: ₹${costPer1k}/1k | Suggested Our Price (5x): ₹${suggestedPrice}/1k`);
        });
      } else {
        console.log(`\n[${plat.toUpperCase()} - ${t.toUpperCase()}] No exact matching candidates found.`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
