#!/bin/bash

echo "🚀 Final migration of remaining 13 routes..."

# Function to migrate a file
migrate_file() {
    local file=$1
    echo "Migrating: $(basename $file)"
    
    # Create backup
    cp "$file" "${file}.backup.final"
    
    # Basic replacements
    sed -i \
        -e "s|import { createApiHandler.*} from '@/lib/api/route-helpers';|import { withValidatedServices } from '@/lib/api/with-services';\nimport { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';|g" \
        -e "s|import { type AuthContext.*} from '@/core/config/interfaces';||g" \
        -e "s|import type { AuthContext.*} from '@/core/config/interfaces';||g" \
        -e "s|, emptySchema||g" \
        -e "s|emptySchema|z.object({})|g" \
        "$file"
    
    # Add z import if not present
    if ! grep -q "import { z }" "$file"; then
        sed -i "1s/^/import { z } from 'zod';\n/" "$file"
    fi
}

# List of files to migrate
files=(
    "/workspaces/ZDX-UM/user-management-reorganized/app/api/permissions/[id]/route.ts"
    "/workspaces/ZDX-UM/user-management-reorganized/app/api/profile/avatar/route.ts"
    "/workspaces/ZDX-UM/user-management-reorganized/app/api/profile/logo/route.ts"
    "/workspaces/ZDX-UM/user-management-reorganized/app/api/profile/privacy/route.ts"
    "/workspaces/ZDX-UM/user-management-reorganized/app/api/resources/permissions/route.ts"
    "/workspaces/ZDX-UM/user-management-reorganized/app/api/resources/[type]/[id]/permissions/route.ts"
    "/workspaces/ZDX-UM/user-management-reorganized/app/api/roles/[roleId]/hierarchy/route.ts"
    "/workspaces/ZDX-UM/user-management-reorganized/app/api/roles/[roleId]/permissions/route.ts"
    "/workspaces/ZDX-UM/user-management-reorganized/app/api/roles/[roleId]/route.ts"
    "/workspaces/ZDX-UM/user-management-reorganized/app/api/team/[teamId]/route.ts"
    "/workspaces/ZDX-UM/user-management-reorganized/app/api/users/[id]/permissions/resources/route.ts"
    "/workspaces/ZDX-UM/user-management-reorganized/app/api/users/[id]/permissions/route.ts"
    "/workspaces/ZDX-UM/user-management-reorganized/app/api/users/[id]/roles/[roleId]/route.ts"
)

# Process each file
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        migrate_file "$file"
    else
        echo "⚠️  File not found: $file"
    fi
done

echo "✅ Basic migration complete! Manual handler conversion still required."