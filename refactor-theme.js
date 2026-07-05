const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const targetRegex = /const\s+N\s*=\s*\{[\s\S]*?bg\s*:\s*["']#[a-fA-F0-9]+["'][\s\S]*?\};/g;

walkDir(path.join(__dirname, 'src', 'app'), function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file has the const N block
    if (targetRegex.test(content)) {
      console.log('Refactoring', filePath);
      
      // Replace the block
      let newContent = content.replace(targetRegex, 'import { N } from "@/lib/theme";');
      
      // We might have inserted `import { N } from "@/lib/theme";` in the middle of a functional component
      // We should ideally hoist imports to the top.
      // Wait, is N defined inside the component or outside?
      // Usually it's outside. Let's see if the import needs to be hoisted.
      if (newContent.includes('import { N } from "@/lib/theme";')) {
          // If it was already at the top level, fine. If inside a component, it's illegal.
          // Let's remove it from where it was inserted and put it at the top of the file after the other imports.
          newContent = newContent.replace('import { N } from "@/lib/theme";', '');
          // Find the last import line
          const lines = newContent.split('\n');
          let lastImportIndex = -1;
          for (let i = 0; i < lines.length; i++) {
              if (lines[i].startsWith('import ')) {
                  lastImportIndex = i;
              }
          }
          if (lastImportIndex !== -1) {
              lines.splice(lastImportIndex + 1, 0, 'import { N } from "@/lib/theme";');
          } else {
              // No imports, put at the top
              lines.unshift('import { N } from "@/lib/theme";');
          }
          newContent = lines.join('\n');
          
          fs.writeFileSync(filePath, newContent);
      }
    }
  }
});
