#!/bin/bash
echo "Installing minimal Next.js 14 dependencies..."

# Create minimal package.json for faster install
cat > package-minimal.json << 'EOF'
{
  "name": "user-management",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.2.32",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "@types/node": "^20.17.47",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "typescript": "^5.2.2",
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.35"
  }
}
EOF

# Install with minimal package.json
npm install --package-lock-only --package-lock=false --loglevel=error --no-audit --no-fund --legacy-peer-deps

# Restore original package.json
rm package-minimal.json

echo "Minimal install complete!"