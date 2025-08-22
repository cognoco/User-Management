#!/usr/bin/env node

/**
 * Script to replace barrel exports with direct imports
 * This dramatically improves compilation performance
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Map of barrel imports to direct imports
const importReplacements = {
  // Core common barrel exports
  "@/core/common'": {
    'ApplicationError': "@/core/common/errors'",
    'ERROR_CODES': "@/core/common/error-codes'",
    'User': "@/core/common/user-types'",
    'LoginPayload': "@/core/common/user-types'",
    'RegistrationPayload': "@/core/common/user-types'",
    'AuthResult': "@/core/common/user-types'",
  },
  // Auth models that re-export from common
  "@/core/auth/models'": {
    'User': "@/core/common/user-types'",
    'LoginPayload': "@/core/common/user-types'",
    'RegistrationPayload': "@/core/common/user-types'",
    'AuthResult': "@/core/common/user-types'",
  }
};

function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Find all import statements
  const importRegex = /import\s+(?:type\s+)?{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
  
  content = content.replace(importRegex, (match, imports, fromPath) => {
    // Check if this is a barrel import we want to fix
    const fromPathWithQuote = fromPath + "'";
    
    if (importReplacements[fromPathWithQuote]) {
      const importList = imports.split(',').map(i => i.trim());
      const newImports = {};
      
      // Group imports by their new path
      importList.forEach(imp => {
        const cleanImport = imp.replace(/^type\s+/, '').split(' as ')[0];
        const newPath = importReplacements[fromPathWithQuote][cleanImport];
        
        if (newPath) {
          if (!newImports[newPath]) {
            newImports[newPath] = [];
          }
          newImports[newPath].push(imp);
          modified = true;
        }
      });
      
      // Generate new import statements
      if (Object.keys(newImports).length > 0) {
        return Object.entries(newImports)
          .map(([path, imps]) => `import { ${imps.join(', ')} } from '${path}`)
          .join(';\n');
      }
    }
    
    return match;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed imports in: ${filePath}`);
    return true;
  }
  
  return false;
}

function main() {
  const srcPath = path.join(__dirname, '..', 'src');
  const appPath = path.join(__dirname, '..', 'app');
  
  console.log('🔍 Scanning for files with barrel imports...\n');
  
  let totalFixed = 0;
  
  // Find all TypeScript files
  const patterns = [
    `${srcPath}/**/*.ts`,
    `${srcPath}/**/*.tsx`,
    `${appPath}/**/*.ts`,
    `${appPath}/**/*.tsx`,
  ];
  
  patterns.forEach(pattern => {
    const files = glob.sync(pattern, { 
      ignore: [
        // Dependencies
        '**/node_modules/**',
        
        // Test files
        '**/*.test.ts', 
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/tests/**',
        '**/e2e/**',
        '**/__tests__/**',
        '**/test-*.ts',
        '**/test-*.tsx',
        
        // Generated/Build files
        '**/generated/**',
        '**/dist/**',
        '**/.next/**',
        '**/out/**',
        '**/build/**',
        
        // Database/Migration files
        '**/migrations/**',
        '**/prisma/**',
        '**/seeds/**',
        
        // Configuration files
        '**/*.config.ts',
        '**/*.config.js',
        '**/config/**',
        
        // Documentation
        '**/*.md',
        
        // External/vendor files
        '**/vendor/**',
        '**/external/**',
        '**/third-party/**'
      ] 
    });
    
    files.forEach(file => {
      // Double-check we're not modifying test files
      if (file.includes('.test.') || file.includes('.spec.') || file.includes('/tests/') || file.includes('/e2e/')) {
        console.log(`⏭️  Skipping test file: ${file}`);
        return;
      }
      
      if (fixImportsInFile(file)) {
        totalFixed++;
      }
    });
  });
  
  console.log(`\n✨ Fixed imports in ${totalFixed} files`);
  console.log('📦 Remember to restart your dev server for changes to take effect');
}

// Run the script
if (require.main === module) {
  main();
}