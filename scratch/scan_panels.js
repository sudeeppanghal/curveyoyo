const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const panels = await prisma.panel.findMany({ where: { status: 'ONLINE' } });
  
  for (const p of panels) {
    const body = new URLSearchParams();
    body.append('key', p.apiKeyEncrypted);
    body.append('action', 'services');

    try {
      const res = await fetch(p.apiUrl, {
        method: 'POST',
        body: body.toString(),
        headers: { 
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      
      const text = await res.text();
      try {
        const services = JSON.parse(text);
        if (!services.error && Array.isArray(services)) {
          console.log(`\n\n✅ SUCCESS WITH PANEL: ${p.name} (${p.id})`);
          analyzeServices(services);
          return; // Stop after first success to avoid spamming
        }
      } catch (e) {
        // Not JSON
      }
    } catch (e) {
      // Fetch error
    }
  }
  console.log("No active panel with valid key found even with User-Agent.");
}

function analyzeServices(services) {
  const platforms = ['instagram', 'tiktok', 'youtube'];
  const types = ['views', 'likes', 'saves', 'shares', 'comments', 'reposts'];

  console.log(`\n--- SERVICES ANALYSIS (${services.length} total services) ---`);
  
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
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
