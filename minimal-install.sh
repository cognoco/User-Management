#!/bin/bash
# Minimal install script to get Next.js 14 working

echo "Creating minimal node_modules for Next.js 14..."

# Create package.json backup
cp package.json package.json.backup

# Create minimal package.json
cat > package.minimal.json << 'EOF'
{
  "name": "user-management-minimal",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev"
  },
  "dependencies": {
    "next": "14.2.32",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  }
}
EOF

# Use minimal package.json
mv package.json package.full.json
mv package.minimal.json package.json

# Install minimal deps
npm install --legacy-peer-deps

# Restore full package.json
mv package.json package.minimal.json
mv package.full.json package.json

echo "Minimal install complete!"