#!/bin/bash

echo "Fixing missing return types in UI components..."

# Find all .tsx files in src/ui/styled
find src/ui/styled -name "*.tsx" -type f ! -name "*.test.tsx" ! -name "*.spec.tsx" | while read -r file; do
  # Check if file contains function components without return type (avoiding duplicates)
  if grep -E "^export function \w+\(\)( *)\{" "$file" > /dev/null 2>&1; then
    echo "Fixing: $file"
    # Add React.ReactElement return type (only if not already present)
    sed -i 's/^export function \(\w\+\)() *{/export function \1(): React.ReactElement {/g' "$file"
  fi
done

echo "Return types fix completed!"