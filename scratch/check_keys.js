const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const prisma = new PrismaClient();

async function tryKey(apiUrl, key, panelName) {
  try {
    const cmd = `curl -s -m 10 -X POST "${apiUrl}" -H "Content-Type: application/x-www-form-urlencoded" --data "key=${key}&action=services"`;
    const res = execSync(cmd).toString().trim();
    if (res.startsWith('[')) {
      const data = JSON.parse(res);
      if (Array.isArray(data) && data.length > 0) {
        return { success: true, data };
      }
    }
    if (res.startsWith('{')) {
      const data = JSON.parse(res);
      if (data.error) return { success: false, error: data.error };
    }
    return { success: false, error: 'Non-JSON response' };
  } catch (e) {
    return { success: false, error: e.message.substring(0, 60) };
  }
}

async function main() {
  const panels = await prisma.panel.findMany();
  console.log(`Checking ${panels.length} panels...\n`);

  for (const p of panels) {
    const result = await tryKey(p.apiUrl, p.apiKeyEncrypted, p.name);
    if (result.success) {
      console.log(`\n✅ WORKING KEY FOUND! Panel: "${p.name}" (ID: ${p.id})`);
      console.log(`   API URL: ${p.apiUrl}`);
      console.log(`   Key: ${p.apiKeyEncrypted.substring(0, 8)}...`);
      console.log(`   Services available: ${result.data.length}`);
      analyzeServices(result.data);
      break;
    } else {
      console.log(`❌ Panel "${p.name}" -> ${result.error}`);
    }
  }
}

function analyzeServices(services) {
  const platforms = ['instagram', 'tiktok', 'youtube'];
  const types = [
    { key: 'views', keywords: ['view', 'play', 'impression'] },
    { key: 'likes', keywords: ['like', 'heart'] },
    { key: 'saves', keywords: ['save', 'bookmark'] },
    { key: 'shares', keywords: ['share', 'repost'] },
    { key: 'comments', keywords: ['comment'] },
    { key: 'followers', keywords: ['follower', 'subscriber', 'fan'] },
  ];

  console.log(`\n\n======= FULL SERVICE ANALYSIS =======\n`);

  for (const plat of platforms) {
    for (const type of types) {
      let matches = services.filter(s => {
        const name = (s.name || '').toLowerCase();
        const cat = (s.category || '').toLowerCase();
        return (name.includes(plat) || cat.includes(plat)) && type.keywords.some(k => name.includes(k));
      });

      if (matches.length === 0) continue;

      const organic = matches.filter(s => parseInt(s.min) <= 50).sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate));
      const strict = matches.filter(s => parseInt(s.min) > 50).sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate));

      console.log(`\n[${plat.toUpperCase()} - ${type.key.toUpperCase()}] - ${matches.length} found`);

      if (organic.length > 0) {
        console.log(`  🟢 ORGANIC-FRIENDLY (Min <= 50):`);
        organic.slice(0, 5).forEach(s => {
          const c = parseFloat(s.rate);
          console.log(`    ID:${s.service} | Min:${s.min} | Max:${s.max} | Panel:₹${c}/1k | Our5x:₹${(c*5).toFixed(3)}/1k`);
          console.log(`    ${s.name}`);
        });
      }

      if (strict.length > 0) {
        console.log(`  🔴 STRICT MIN (>50, avoid for organic):`);
        strict.slice(0, 3).forEach(s => {
          const c = parseFloat(s.rate);
          console.log(`    ID:${s.service} | Min:${s.min} | Panel:₹${c}/1k | ${s.name.substring(0, 70)}`);
        });
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
