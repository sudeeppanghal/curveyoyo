const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const nextDir = path.join(__dirname, '..', '.next');
const staticDir = path.join(nextDir, 'static');
const backupDir = path.join(os.tmpdir(), 'yoyosmm-static-backup');

// Helper to copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      // Copy only if file does not exist to preserve old chunks
      if (!fs.existsSync(destPath)) {
        try {
          fs.copyFileSync(srcPath, destPath);
        } catch (e) {
          console.error(`Failed to copy ${srcPath} to ${destPath}:`, e.message);
        }
      }
    }
  }
}

console.log("=== PRE-BUILD: Backing up current static chunks ===");
if (fs.existsSync(staticDir)) {
  copyDir(staticDir, backupDir);
  console.log(`Successfully backed up static assets to: ${backupDir}`);
} else {
  console.log("No previous static assets found. Skipping pre-build backup.");
}

console.log("=== BUILDING NEXT.JS PRODUCTION APP ===");
try {
  console.log("Generating Prisma client...");
  execSync('npx prisma generate', { stdio: 'inherit' });
  execSync('next build', { stdio: 'inherit' });
} catch (err) {
  console.error("Compilation failed:", err.message);
  process.exit(1);
}

console.log("=== POST-BUILD: Restoring preserved static chunks ===");
if (fs.existsSync(backupDir)) {
  copyDir(backupDir, staticDir);
  console.log(`Successfully restored preserved static chunks back to: ${staticDir}`);
} else {
  console.log("No backup folder found. Skipping post-build restore.");
}

console.log("=== BUILD COMPLETE ===");
