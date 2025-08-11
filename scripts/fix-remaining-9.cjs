#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Function to transform imports and basic patterns
function transformFile(content, fileName) {
  // Replace imports
  content = content.replace(
    /import \{ createApiHandler[^}]*\} from ['"]@\/lib\/api\/route-helpers['"];?/g,
    "import { withValidatedServices } from '@/lib/api/with-services';\nimport { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';"
  );
  
  // Remove old imports
  content = content.replace(
    /import \{ type AuthContext[^}]*\} from ['"]@\/core\/config\/interfaces['"];?\n?/g,
    ''
  );
  content = content.replace(
    /import type \{ AuthContext[^}]*\} from ['"]@\/core\/config\/interfaces['"];?\n?/g,
    ''
  );
  
  // Replace emptySchema with z.object({})
  content = content.replace(/emptySchema/g, 'z.object({})');
  
  // Add z import if not present
  if (!content.includes("import { z }") && !content.includes("import {z}")) {
    content = "import { z } from 'zod';\n" + content;
  }
  
  // Remove NextRequest/NextResponse imports if only used for types
  content = content.replace(
    /import \{ (?:type )?NextRequest, NextResponse \} from 'next\/server';\n?/g,
    ''
  );
  content = content.replace(
    /import \{ NextRequest, NextResponse \} from 'next\/server';\n?/g,
    ''
  );
  
  console.log(`✅ Processed imports for ${fileName}`);
  return content;
}

// Files to process
const files = [
  '/workspaces/ZDX-UM/user-management-reorganized/app/api/resources/permissions/route.ts',
  '/workspaces/ZDX-UM/user-management-reorganized/app/api/resources/[type]/[id]/permissions/route.ts',
  '/workspaces/ZDX-UM/user-management-reorganized/app/api/roles/[roleId]/hierarchy/route.ts',
  '/workspaces/ZDX-UM/user-management-reorganized/app/api/roles/[roleId]/permissions/route.ts',
  '/workspaces/ZDX-UM/user-management-reorganized/app/api/roles/[roleId]/route.ts',
  '/workspaces/ZDX-UM/user-management-reorganized/app/api/team/[teamId]/route.ts',
  '/workspaces/ZDX-UM/user-management-reorganized/app/api/users/[id]/permissions/resources/route.ts',
  '/workspaces/ZDX-UM/user-management-reorganized/app/api/users/[id]/permissions/route.ts',
  '/workspaces/ZDX-UM/user-management-reorganized/app/api/users/[id]/roles/[roleId]/route.ts'
];

// Process each file
files.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const transformed = transformFile(content, path.basename(filePath));
      
      if (content !== transformed) {
        // Create backup
        fs.writeFileSync(`${filePath}.backup-9`, content);
        // Write transformed content
        fs.writeFileSync(filePath, transformed);
        console.log(`✅ Migrated: ${path.basename(filePath)}`);
      } else {
        console.log(`⏭️  No changes needed: ${path.basename(filePath)}`);
      }
    } else {
      console.log(`⚠️  File not found: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log('\n🎯 Import migration complete for 9 files!');
console.log('⚠️  Note: Handler functions still need manual conversion to withValidatedServices pattern');