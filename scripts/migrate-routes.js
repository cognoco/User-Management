#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all route files
const routeFiles = glob.sync('app/api/**/route.ts', {
  cwd: '/workspaces/ZDX-UM/user-management-reorganized',
  absolute: true
});

console.log(`Found ${routeFiles.length} route files`);

let migratedCount = 0;
let skippedCount = 0;
let errorCount = 0;

routeFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already migrated
    if (content.includes('withValidatedServices')) {
      console.log(`✓ Already migrated: ${path.relative('/workspaces/ZDX-UM/user-management-reorganized', filePath)}`);
      skippedCount++;
      return;
    }
    
    // Skip if doesn't use old pattern
    if (!content.includes('createApiHandler') && !content.includes('getServiceContainer')) {
      skippedCount++;
      return;
    }
    
    console.log(`Migrating: ${path.relative('/workspaces/ZDX-UM/user-management-reorganized', filePath)}`);
    
    // Replace imports
    content = content.replace(
      /import \{ createApiHandler.*?\} from ['"]@\/lib\/api\/route-helpers['"]/g,
      "import { withValidatedServices } from '@/lib/api/with-services'"
    );
    
    // Remove getServiceContainer import
    content = content.replace(
      /import \{ getServiceContainer.*?\} from ['"]@\/lib\/config\/service-container['"]\n?/g,
      ''
    );
    
    // Extract service names used
    const serviceMatches = content.matchAll(/getServiceContainer\(\)\.(\w+)/g);
    const services = [...new Set([...serviceMatches].map(m => m[1]))];
    
    // Transform handlers
    const handlerRegex = /const\s+(\w+Handler)\s*=\s*async\s*\([^)]*\)\s*=>\s*\{/g;
    content = content.replace(handlerRegex, (match, handlerName) => {
      return `const ${handlerName} = async ({ services, request, data, userId, params }) => {`;
    });
    
    // Replace getServiceContainer() calls
    content = content.replace(/getServiceContainer\(\)\.(\w+)/g, 'services.$1');
    
    // Replace ctx.userId with userId
    content = content.replace(/ctx\.userId/g, 'userId');
    
    // Transform exports
    const exportRegex = /export\s+const\s+(GET|POST|PUT|PATCH|DELETE)\s*=\s*createApiHandler\s*\(\s*([^,]+),\s*([^,]+)(?:,\s*(\{[^}]+\}))?\s*\)/g;
    
    content = content.replace(exportRegex, (match, method, schema, handler, options) => {
      const requiredServices = services.length > 0 ? `\n  requiredServices: [${services.map(s => `'${s}'`).join(', ')}],` : '';
      const requireAuth = options && options.includes('requireAuth: true') ? '\n  requireAuth: true,' : '';
      
      return `export const ${method} = withValidatedServices({
  schema: ${schema},${requiredServices}${requireAuth}
  handler: ${handler}
})`;
    });
    
    // Save migrated file
    fs.writeFileSync(filePath, content);
    console.log(`✓ Migrated: ${path.relative('/workspaces/ZDX-UM/user-management-reorganized', filePath)}`);
    migratedCount++;
    
  } catch (error) {
    console.error(`✗ Error migrating ${filePath}:`, error.message);
    errorCount++;
  }
});

console.log(`
Migration Complete:
- Migrated: ${migratedCount} files
- Skipped: ${skippedCount} files
- Errors: ${errorCount} files
`);