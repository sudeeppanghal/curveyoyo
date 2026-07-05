const fs = require('fs');

let content = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

if (!content.includes('import { ThemeToggle }')) {
  content = content.replace(
    'import { N } from "@/lib/theme";',
    'import { N } from "@/lib/theme";\nimport { ThemeToggle } from "@/components/ThemeToggle";'
  );
}

// Inject ThemeToggle near "YoyoSMM Admin"
const searchStr = '<h1 style={{ fontSize: 22, fontWeight: 900, color: N.text, margin: 0, letterSpacing: "-0.5px" }}>YoyoSMM Admin</h1>';

if (content.includes(searchStr)) {
  const pieces = content.split(searchStr);
  // Look for the next '<div style={{ display: "flex", alignItems: "center", gap: 12 }}>'
  const secondPart = pieces[1];
  const divSearchStr = '<div style={{ display: "flex", alignItems: "center", gap: 12 }}>';
  
  if (secondPart.includes(divSearchStr)) {
    const injectedSecondPart = secondPart.replace(divSearchStr, divSearchStr + '\n            <ThemeToggle />');
    content = pieces[0] + searchStr + injectedSecondPart;
    fs.writeFileSync('src/app/admin/page.tsx', content);
    console.log('Successfully injected ThemeToggle into admin page.');
  } else {
    console.log('Could not find the target div in admin page.');
  }
} else {
  console.log('Could not find YoyoSMM Admin title');
}
