const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(path.join(__dirname, 'src', 'app'), function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('"use client";') && !content.trim().startsWith('"use client";')) {
      // Remove all "use client"; and put it at the top
      content = content.replace(/"use client";\s*/g, '');
      content = '"use client";\n' + content;
      fs.writeFileSync(filePath, content);
      console.log('Fixed use client in', filePath);
    }
  }
});
