const fs = require('fs');
let data = fs.readFileSync('src/app/admin/page.tsx', 'utf-8');
data = data.replace(/width:\s*"100%",\s*borderCollapse:\s*"collapse",\s*width:\s*"100%"/g, 'width: "100%", borderCollapse: "collapse"');
// Ensure no other duplicate width issue:
data = data.replace(/width:\s*"\d+%",[^>]+(width:\s*"\d+%")/g, match => {
  return match.replace(/,\s*width:\s*"\d+"/, ''); // crude but the first replace covers it.
});
fs.writeFileSync('src/app/admin/page.tsx', data);
console.log('Fixed keys');
