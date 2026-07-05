const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const prisma = new PrismaClient();

async function fetchWithCurl(url, key) {
  // Try different User-Agents and headers to bypass WAF
  const attempts = [
    // Attempt 1: Standard browser UA
    `curl -s -m 15 -X POST "${url}" -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36" -H "Accept: application/json, text/plain, */*" -H "Accept-Language: en-US,en;q=0.9" -H "Content-Type: application/x-www-form-urlencoded" --data-urlencode "key=${key}" --data-urlencode "action=services"`,
    
    // Attempt 2: Pretend to be Python requests (common API client)
    `curl -s -m 15 -X POST "${url}" -H "User-Agent: python-requests/2.31.0" -H "Content-Type: application/x-www-form-urlencoded" --data "key=${key}&action=services"`,
    
    // Attempt 3: No User-Agent
    `curl -s -m 15 -X POST "${url}" -H "Content-Type: application/x-www-form-urlencoded" -H "Accept: */*" --data "key=${key}&action=services"`,
    
    // Attempt 4: Mobile UA
    `curl -s -m 15 -X POST "${url}" -H "User-Agent: Dalvik/2.1.0 (Linux; U; Android 14; Pixel 8 Build/UQ1A.240105.004)" -H "Content-Type: application/x-www-form-urlencoded" --data "key=${key}&action=services"`,
    
    // Attempt 5: Appear as SMM panel client
    `curl -s -m 15 -X POST "${url}" -H "User-Agent: SMMScript/1.0" -H "Content-Type: application/x-www-form-urlencoded" -H "X-Requested-With: XMLHttpRequest" --data "key=${key}&action=services"`,
    
    // Attempt 6: Try with Referer header set to same domain
    `curl -s -m 15 -X POST "${url}" -H "Referer: ${url.replace('/api/v2','')}" -H "Origin: ${url.replace('/api/v2','')}" -H "Content-Type: application/x-www-form-urlencoded" --data "key=${key}&action=services"`,
    
    // Attempt 7: JSON body instead of form
    `curl -s -m 15 -X POST "${url}" -H "User-Agent: Mozilla/5.0" -H "Content-Type: application/json" --data "{\\"key\\":\\"${key}\\",\\"action\\":\\"services\\"}"`,
  ];

  for (let i = 0; i < attempts.length; i++) {
    try {
      const res = execSync(attempts[i]).toString().trim();
      if (res.startsWith('[') || res.startsWith('{')) {
        const data = JSON.parse(res);
        if (Array.isArray(data) && data.length > 0) {
          console.log(`✅ Bypass succeeded on attempt ${i + 1}`);
          return data;
        }
        if (data.error) {
          console.log(`Attempt ${i + 1}: API Error -> ${data.error}`);
        }
      } else {
        console.log(`Attempt ${i + 1}: WAF block -> ${res.substring(0, 80)}`);
      }
    } catch (e) {
      console.log(`Attempt ${i + 1}: curl error -> ${e.message.substring(0, 60)}`);
    }
  }
  return null;
}

async function main() {
  const panels = await prisma.panel.findMany({ where: { status: 'ONLINE' } });
  // Try YOYO panel first
  const yoyo = panels.find(p => p.name.toLowerCase().includes('yoyo') || p.apiUrl.includes('yoyo'));

  if (!yoyo) {
    console.log("No YoYo Media panel found.");
    return;
  }

  console.log(`Trying panel: ${yoyo.name} -> ${yoyo.apiUrl}`);
  const services = await fetchWithCurl(yoyo.apiUrl, yoyo.apiKeyEncrypted);
  
  if (!services) {
    console.log("\nAll bypass attempts failed. Trying all ONLINE panels...");
    for (const p of panels) {
      const res = await fetchWithCurl(p.apiUrl, p.apiKeyEncrypted);
      if (res) {
        console.log(`Got ${res.length} services from panel: ${p.name}`);
        analyzeServices(res);
        return;
      }
    }
    console.log("Could not bypass WAF from any panel.");
    return;
  }

  console.log(`Got ${services.length} services!\n`);
  analyzeServices(services);
}

function analyzeServices(services) {
  const platforms = ['instagram', 'tiktok', 'youtube'];
  const types = [
    { key: 'views', keywords: ['view', 'play', 'impression'] },
    { key: 'likes', keywords: ['like', 'heart'] },
    { key: 'saves', keywords: ['save', 'bookmark'] },
    { key: 'shares', keywords: ['share', 'retweet', 'repost'] },
    { key: 'comments', keywords: ['comment'] },
    { key: 'followers', keywords: ['follower', 'subscriber', 'fan'] },
  ];

  console.log(`\n=== FULL ANALYSIS: ${services.length} total services ===`);

  for (const plat of platforms) {
    for (const type of types) {
      let matches = services.filter(s => {
        const name = (s.name || '').toLowerCase();
        const cat = (s.category || '').toLowerCase();
        const isPlatMatch = name.includes(plat) || cat.includes(plat);
        const isTypeMatch = type.keywords.some(k => name.includes(k));
        return isPlatMatch && isTypeMatch;
      });

      if (matches.length === 0) continue;

      // Sort by organic compatibility first (low min), then by price
      const organicFriendly = matches.filter(s => parseInt(s.min) <= 50).sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate));
      const strictMin = matches.filter(s => parseInt(s.min) > 50).sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate));

      console.log(`\n📦 [${plat.toUpperCase()} - ${type.key.toUpperCase()}] (${matches.length} services total)`);

      if (organicFriendly.length > 0) {
        console.log(`  🟢 ORGANIC-FRIENDLY (Min <= 50 - use these!):`);
        organicFriendly.slice(0, 5).forEach(s => {
          const cost = parseFloat(s.rate);
          console.log(`     ID:${s.service} | Min:${s.min} | ₹${cost}/1k -> Our Price: ₹${(cost * 5).toFixed(2)}/1k`);
          console.log(`     ${s.name}`);
        });
      }

      if (strictMin.length > 0) {
        console.log(`  🔴 STRICT MIN (Min > 50 - avoid for organic):`);
        strictMin.slice(0, 3).forEach(s => {
          const cost = parseFloat(s.rate);
          console.log(`     ID:${s.service} | Min:${s.min} | ₹${cost}/1k -> ${s.name.substring(0, 60)}`);
        });
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
