const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const prisma = new PrismaClient();

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

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

async function main() {
  const panels = await prisma.panel.findMany();
  console.log(`Checking ${panels.length} panels (saving responses to files)...\n`);

  // Try first ONLINE panel only to avoid rate limiting
  const online = panels.filter(p => p.status === 'ONLINE');
  const toCheck = [...online, ...panels.filter(p => p.status !== 'ONLINE')];

  for (const p of toCheck) {
    const plainKey = decrypt(p.apiKeyEncrypted);
    if (!plainKey) {
      console.log(`❌ "${p.name}" -> Decryption FAILED`);
      continue;
    }
    
    const outFile = `scratch/response_${p.id}.txt`;
    try {
      // Save response to file to avoid ENOBUFS
      const cmd = `curl -s -m 15 -X POST "${p.apiUrl}" -H "Content-Type: application/x-www-form-urlencoded" --data "key=${plainKey}&action=services" -o "${outFile}"`;
      execSync(cmd, { stdio: 'pipe' });
      
      if (!fs.existsSync(outFile)) {
        console.log(`❌ "${p.name}" -> No response file created`);
        continue;
      }
      
      const raw = fs.readFileSync(outFile, 'utf8').trim();
      if (!raw) {
        console.log(`❌ "${p.name}" -> Empty response`);
        continue;
      }
      
      if (raw.startsWith('[')) {
        const data = JSON.parse(raw);
        if (Array.isArray(data) && data.length > 0) {
          console.log(`\n✅ WORKING KEY FOUND! Panel: "${p.name}"`);
          console.log(`   Key (decrypted): ${plainKey.substring(0, 12)}...`);
          console.log(`   Total Services: ${data.length}`);
          analyzeServices(data);
          return;
        }
      } else if (raw.startsWith('{')) {
        const data = JSON.parse(raw);
        console.log(`❌ "${p.name}" | Key: ${plainKey.substring(0, 10)}... | Error: ${data.error}`);
      } else {
        console.log(`❌ "${p.name}" | Key: ${plainKey.substring(0, 10)}... | Unexpected: ${raw.substring(0, 60)}`);
      }
    } catch (e) {
      console.log(`❌ "${p.name}" | Key: ${plainKey ? plainKey.substring(0, 10) + '...' : 'N/A'} | Error: ${e.message.substring(0, 60)}`);
    }
  }
  console.log('\nNo working key found.');
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

  console.log(`\n======= FULL SERVICE ANALYSIS =======\n`);

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

      console.log(`\n[${plat.toUpperCase()} - ${type.key.toUpperCase()}] (${matches.length} total)`);
      if (organic.length > 0) {
        console.log(`  🟢 ORGANIC-FRIENDLY (Min<=50):`);
        organic.slice(0, 5).forEach(s => {
          const c = parseFloat(s.rate);
          console.log(`    ID:${s.service} | Min:${s.min} | Max:${s.max} | Panel:₹${c}/1k | 5x:₹${(c*5).toFixed(3)}/1k`);
          console.log(`    "${s.name}"`);
        });
      }
      if (strict.length > 0) {
        console.log(`  🔴 STRICT MIN(>50):`);
        strict.slice(0, 3).forEach(s => {
          const c = parseFloat(s.rate);
          console.log(`    ID:${s.service} | Min:${s.min} | Panel:₹${c}/1k | "${s.name.substring(0, 65)}"`);
        });
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
