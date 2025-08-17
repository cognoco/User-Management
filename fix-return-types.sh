#!/bin/bash

# Fix missing return types in React components
# This script adds React.ReactElement return type to components missing it

echo "Fixing missing return types in UI components..."

# Find all .tsx files in src/ui/styled
find src/ui/styled -name "*.tsx" -type f ! -name "*.test.tsx" ! -name "*.spec.tsx" | while read -r file; do
  # Check if file contains function components without return type
  if grep -E "^export function \w+\(\)" "$file" > /dev/null 2>&1; then
    echo "Fixing: $file"
    # Add React.ReactElement return type
    sed -i 's/^export function \(\w\+\)()/export function \1(): React.ReactElement/g' "$file"
  fi
  
  # Also fix const arrow functions
  if grep -E "^export const \w+ = \(" "$file" > /dev/null 2>&1; then
    echo "Fixing arrow function in: $file"
    sed -i 's/^export const \(\w\+\) = (/export const \1 = (/g' "$file"
  fi
done

echo "Return types fix completed!"