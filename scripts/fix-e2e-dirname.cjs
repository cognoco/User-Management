#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all E2E test files
const testFiles = glob.sync('e2e/**/*.ts', {
  cwd: path.resolve(__dirname, '..'),
  absolute: true,
  ignore: ['**/node_modules/**']
});

console.log(`Found ${testFiles.length} E2E test files to check...`);

let filesFixed = 0;

testFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Check if file uses __dirname
  if (content.includes('__dirname')) {
    // Add import.meta.url imports if not present
    if (!content.includes('import.meta.url')) {
      // Add necessary imports at the top
      const importStatements = [];
      
      if (!content.includes('import { fileURLToPath }')) {
        importStatements.push("import { fileURLToPath } from 'url';");
      }
      
      if (importStatements.length > 0) {
        // Find the last import statement
        const importRegex = /^import\s+.*?;$/gm;
        const imports = content.match(importRegex);
        if (imports && imports.length > 0) {
          const lastImportIndex = content.lastIndexOf(imports[imports.length - 1]);
          const insertPosition = lastImportIndex + imports[imports.length - 1].length;
          content = content.slice(0, insertPosition) + '\n' + importStatements.join('\n') + content.slice(insertPosition);
        } else {
          // No imports found, add at the beginning
          content = importStatements.join('\n') + '\n\n' + content;
        }
      }
      
      // Add __dirname replacement
      const dirnameDeclaration = "const __dirname = path.dirname(fileURLToPath(import.meta.url));";
      
      // Find where to insert the dirname declaration (after imports)
      const importRegex = /^import\s+.*?;$/gm;
      const imports = content.match(importRegex);
      if (imports && imports.length > 0) {
        const lastImportIndex = content.lastIndexOf(imports[imports.length - 1]);
        const insertPosition = lastImportIndex + imports[imports.length - 1].length;
        
        // Check if __dirname declaration already exists
        if (!content.includes('const __dirname =')) {
          content = content.slice(0, insertPosition) + '\n\n' + dirnameDeclaration + content.slice(insertPosition);
        }
      }
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(file, content);
      console.log(`Fixed: ${path.basename(file)}`);
      filesFixed++;
    }
  }
});

console.log(`\n✅ Fixed ${filesFixed} files with __dirname issues`);