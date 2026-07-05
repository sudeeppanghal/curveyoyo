const fs = require('fs');

// 1. Inject into PublicHeaderFooter.tsx
let pub = fs.readFileSync('src/app/PublicHeaderFooter.tsx', 'utf8');
if (!pub.includes('import { ThemeToggle }')) {
  pub = pub.replace(
    'import { N } from "@/lib/theme";',
    'import { N } from "@/lib/theme";\nimport { ThemeToggle } from "@/components/ThemeToggle";'
  );
}
if (!pub.includes('<ThemeToggle />')) {
  pub = pub.replace(
    '<div style={{ display: "flex", alignItems: "center", gap: 10 }}>\n          <Link href="/login"',
    '<div style={{ display: "flex", alignItems: "center", gap: 10 }}>\n          <ThemeToggle />\n          <Link href="/login"'
  );
  fs.writeFileSync('src/app/PublicHeaderFooter.tsx', pub);
  console.log('Injected into PublicHeaderFooter.tsx');
}

// 2. Inject into dashboard/layout.tsx
let dash = fs.readFileSync('src/app/dashboard/layout.tsx', 'utf8');
if (!dash.includes('import { ThemeToggle }')) {
  dash = dash.replace(
    'import { N } from "@/lib/theme";',
    'import { N } from "@/lib/theme";\nimport { ThemeToggle } from "@/components/ThemeToggle";'
  );
}
if (!dash.includes('<ThemeToggle />')) {
  dash = dash.replace(
    '<div style={{ display:"flex", alignItems:"center", gap:10 }}>\n            <Link href="/reels/new"',
    '<div style={{ display:"flex", alignItems:"center", gap:10 }}>\n            <ThemeToggle />\n            <Link href="/reels/new"'
  );
  fs.writeFileSync('src/app/dashboard/layout.tsx', dash);
  console.log('Injected into dashboard/layout.tsx');
}

// 3. Inject into admin/page.tsx (already there but checking just in case)
let admin = fs.readFileSync('src/app/admin/page.tsx', 'utf8');
if (!admin.includes('import { ThemeToggle }')) {
  admin = admin.replace(
    'import { N } from "@/lib/theme";',
    'import { N } from "@/lib/theme";\nimport { ThemeToggle } from "@/components/ThemeToggle";'
  );
}
const searchStr = '<h1 style={{ fontSize: 22, fontWeight: 900, color: N.text, margin: 0, letterSpacing: "-0.5px" }}>YoyoSMM Admin</h1>';
if (!admin.includes('<ThemeToggle />') && admin.includes(searchStr)) {
  const pieces = admin.split(searchStr);
  const secondPart = pieces[1];
  const divSearchStr = '<div style={{ display: "flex", alignItems: "center", gap: 12 }}>';
  if (secondPart.includes(divSearchStr)) {
    const injectedSecondPart = secondPart.replace(divSearchStr, divSearchStr + '\n            <ThemeToggle />');
    admin = pieces[0] + searchStr + injectedSecondPart;
    fs.writeFileSync('src/app/admin/page.tsx', admin);
    console.log('Injected into admin/page.tsx');
  }
}

console.log('Injection check complete.');
