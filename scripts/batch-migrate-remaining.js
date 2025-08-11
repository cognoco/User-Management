#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// List of files to migrate
const filesToMigrate = [
  '/workspaces/ZDX-UM/user-management-reorganized/app/api/company/verify-domain/check/route.ts',
  '/workspaces/ZDX-UM/user-management-reorganized/app/api/company/verify-domain/initiate/route.ts',
  '/workspaces/ZDX-UM/user-management-reorganized/app/api/organizations/[orgId]/route.ts',
  '/workspaces/ZDX-UM/user-management-reorganized/app/api/organizations/[orgId]/sso/[idpType]/config/route.ts',
  '/workspaces/ZDX-UM/user-management-reorganized/app/api/organizations/[orgId]/sso/route.ts',
  '/workspaces/ZDX-UM/user-management-reorganized/app/api/organizations/[orgId]/sso/status/route.ts',
  '/workspaces/ZDX-UM/user-management-reorganized/app/api/permissions/enforce-policies/route.ts',
  '/workspaces/ZDX-UM/user-management-reorganized/app/api/permissions/[id]/route.ts',
  '/workspaces/ZDX-UM/user-management-reorganized/app/api/profile/avatar/route.ts',
  '/workspaces/ZDX-UM/user-management-reorganized/app/api/profile/logo/route.ts',
];

// Simple transformation rules
const transformFile = (content) => {
  // Replace imports
  content = content.replace(
    /import \{ createApiHandler[^}]*\} from ['"]@\/lib\/api\/route-helpers['"];?/g,
    "import { withValidatedServices } from '@/lib/api/with-services';\nimport { createSuccessResponse, ApiError } from '@/lib/api/common';"
  );
  
  // Remove AuthContext imports
  content = content.replace(
    /import \{ type AuthContext[^}]*\} from ['"]@\/core\/config\/interfaces['"];?\n?/g,
    ''
  );
  content = content.replace(
    /import type \{ AuthContext[^}]*\} from ['"]@\/core\/config\/interfaces['"];?\n?/g,
    ''
  );
  
  // Remove service factory imports
  content = content.replace(
    /import \{ getApi\w+Service \} from ['"][^'"]+['"];?\n?/g,
    ''
  );
  
  return content;
};

// Process each file
filesToMigrate.forEach(filePath => {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const transformed = transformFile(content);
    
    if (content !== transformed) {
      // Create backup
      fs.writeFileSync(`${filePath}.backup`, content);
      // Write transformed content
      fs.writeFileSync(filePath, transformed);
      console.log(`✅ Migrated: ${path.basename(filePath)}`);
    } else {
      console.log(`⏭️  Already migrated or no changes: ${path.basename(filePath)}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log('\n🎯 Import migration complete! Manual handler conversion still required.');