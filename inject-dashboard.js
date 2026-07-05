const fs = require('fs');

let content = fs.readFileSync('src/app/dashboard/layout.tsx', 'utf8');

// Insert import
content = content.replace(
  'import { N } from "@/lib/theme";',
  'import { N } from "@/lib/theme";\nimport { ThemeToggle } from "@/components/ThemeToggle";'
);

// Insert into header
content = content.replace(
  '<div style={{ display:"flex", alignItems:"center", gap:10 }}>\n            <Link href="/reels/new"',
  '<div style={{ display:"flex", alignItems:"center", gap:10 }}>\n            <ThemeToggle />\n            <Link href="/reels/new"'
);

fs.writeFileSync('src/app/dashboard/layout.tsx', content);
