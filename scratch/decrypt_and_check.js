const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const crypto = require('crypto');
const prisma = new PrismaClient();

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// Load NEXTAUTH_SECRET from .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

function getKey() {
  const secret = process.env.NEXTAUTH_SECRET || 'fallback-dev-secret-change-in-prod';
  return crypto.scryptSync(secret, 'yoyosmm-salt', KEY_LENGTH);
}

function decrypt(ciphertext) {
  try {
    const key = getKey();
    const data = Buffer.from(ciphertext, 'base64');
    const iv = data.subarray(0, IV_LENGTH);
    const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch (e) {
    return null;
  }
}

async function tryKey(apiUrl, plainKey, panelName) {
  try {
    const cmd = `curl -s -m 10 -X POST "${apiUrl}" -H "Content-Type: application/x-www-form-urlencoded" --data "key=${plainKey}&action=services"`;
    const res = execSync(cmd).toString().trim();
    if (res.startsWith('[')) {
      const data = JSON.parse(res);
      if (Array.isArray(data) && data.length > 0) return { success: true, data };
    }
    if (res.startsWith('{')) {
      const data = JSON.parse(res);
      return { success: false, error: data.error || 'Unknown error' };
    }
    return { success: false, error: res.substring(0, 80) };
  } catch (e) {
    return { success: false, error: e.message.substring(0, 60) };
  }
}

async function main() {
  const panels = await prisma.panel.findMany();
  console.log(`Decrypting and checking ${panels.length} panels...\n`);
  console.log(`NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? process.env.NEXTAUTH_SECRET.substring(0, 8) + '...' : 'NOT FOUND (using fallback)'}\n`);

  for (const p of panels) {
    const plainKey = decrypt(p.apiKeyEncrypted);
    if (!plainKey) {
      console.log(`❌ "${p.name}" -> Decryption FAILED (wrong secret key?)`);
      continue;
    }
    
    const result = await tryKey(p.apiUrl, plainKey, p.name);
    if (result.success) {
      console.log(`\n✅ WORKING KEY FOUND! Panel: "${p.name}" (ID: ${p.id})`);
      console.log(`   API URL: ${p.apiUrl}`);
      console.log(`   Decrypted Key: ${plainKey.substring(0, 8)}...`);
      console.log(`   Total Services: ${result.data.length}`);
      analyzeServices(result.data);
      return;
    } else {
      console.log(`❌ "${p.name}" | Key: ${plainKey.substring(0, 10)}... | Error: ${result.error}`);
    }
  }
  console.log('\nNo working key found after decryption.');
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

      console.log(`\n[${plat.toUpperCase()} - ${type.key.toUpperCase()}] - ${matches.length} services found`);

      if (organic.length > 0) {
        console.log(`  🟢 ORGANIC-FRIENDLY (Min <= 50 - Good for jitter):`);
        organic.slice(0, 5).forEach(s => {
          const c = parseFloat(s.rate);
          console.log(`    ID:${s.service} | Min:${s.min} | Max:${s.max} | Panel:₹${c}/1k | Our5x:₹${(c*5).toFixed(3)}/1k`);
          console.log(`    "${s.name}"`);
        });
      }

      if (strict.length > 0) {
        console.log(`  🔴 STRICT MIN (>50 - avoid for organic):`);
        strict.slice(0, 3).forEach(s => {
          const c = parseFloat(s.rate);
          console.log(`    ID:${s.service} | Min:${s.min} | Panel:₹${c}/1k | "${s.name.substring(0, 70)}"`);
        });
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
