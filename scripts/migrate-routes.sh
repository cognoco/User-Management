#!/bin/bash

# Migration script to convert createApiHandler to withValidatedServices pattern

echo "Starting route migration..."

# Find all files using createApiHandler (excluding tests and already migrated)
FILES=$(grep -l "createApiHandler[^W]" /workspaces/ZDX-UM/user-management-reorganized/app/api/**/route.ts 2>/dev/null | grep -v "__tests__")

TOTAL=$(echo "$FILES" | wc -l)
MIGRATED=0

echo "Found $TOTAL files to migrate"

for file in $FILES; do
    echo "Processing: $file"
    
    # Check if file exists and is readable
    if [ ! -r "$file" ]; then
        echo "  ⚠️  Cannot read file, skipping..."
        continue
    fi
    
    # Create backup
    cp "$file" "${file}.backup.$(date +%s)"
    
    # Apply transformation using sed
    # This is a simplified transformation - for complex cases manual review is needed
    sed -i \
        -e "s|import { createApiHandler.*} from '@/lib/api/route-helpers';|import { withValidatedServices } from '@/lib/api/with-services';\\nimport { createSuccessResponse, ApiError } from '@/lib/api/common';|g" \
        -e "s|import { type AuthContext.*} from '@/core/config/interfaces';||g" \
        -e "s|import type { AuthContext.*} from '@/core/config/interfaces';||g" \
        "$file"
    
    MIGRATED=$((MIGRATED + 1))
    echo "  ✅ Migrated ($MIGRATED/$TOTAL)"
done

echo "Migration complete! Migrated $MIGRATED files"
echo "Note: Manual review required for handler function conversions"