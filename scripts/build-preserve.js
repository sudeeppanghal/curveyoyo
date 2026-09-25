const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const nextDir = path.join(__dirname, '..', '.next');
const staticDir = path.join(nextDir, 'static');

const MANIFEST_PATTERN = /(_buildManifest|_ssgManifest|webpack-runtime|webpack\.js)/i;
const PRESERVE_EXTENSIONS = new Set(['.js', '.css', '.woff', '.woff2', '.ttf', '.png', '.jpg', '.svg', '.ico']);

const oldChunks = new Map();

function snapshot(dir, base) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(base, abs);
    if (entry.isDirectory()) {
      snapshot(abs, base);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (PRESERVE_EXTENSIONS.has(ext) && !MANIFEST_PATTERN.test(entry.name)) {
        oldChunks.set(rel, abs);
      }
    }
  }
}

console.log('=== PRE-BUILD: Snapshotting existing chunk file list ===');
snapshot(staticDir, staticDir);

console.log('=== BUILDING NEXT.JS PRODUCTION APP ===');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  execSync('npx next build', { stdio: 'inherit' });
} catch (err) {
  console.error('Compilation failed:', err.message);
  process.exit(1);
}

// Ensure BUILD_ID exists
const buildIdPath = path.join(nextDir, 'BUILD_ID');
if (!fs.existsSync(buildIdPath)) {
  fs.writeFileSync(buildIdPath, 'production', 'utf-8');
}

console.log('=== POST-BUILD: Merging old chunks into new static dir ===');
let merged = 0;
for (const [rel, srcAbs] of oldChunks) {
  if (MANIFEST_PATTERN.test(path.basename(rel))) continue;
  const destAbs = path.join(staticDir, rel);
  if (!fs.existsSync(destAbs)) {
    try {
      fs.mkdirSync(path.dirname(destAbs), { recursive: true });
      fs.copyFileSync(srcAbs, destAbs);
      merged++;
    } catch (e) {}
  }
}
console.log(`Merged ${merged} old chunk files.`);
console.log('=== BUILD COMPLETE ===');
