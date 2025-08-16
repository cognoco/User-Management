# Build From Scratch Guide

## Prerequisites
- Node.js 18.x or 20.x (NOT in WSL/Docker if possible)
- Git
- A clean environment (not WSL/Docker recommended)

## Step 1: Clone the Repository
```bash
# Clone the repository
git clone https://github.com/cognoco/User-Management.git
cd User-Management

# Verify you're in the right directory
ls -la
# Should see: package.json, app/, src/, etc.
```

## Step 2: Clean Everything
```bash
# Remove ALL generated files and caches
rm -rf node_modules
rm -rf .next
rm -rf .turbo
rm -rf dist
rm -rf coverage
rm -f package-lock.json
rm -f yarn.lock
rm -f pnpm-lock.yaml

# Clear npm cache
npm cache clean --force

# Clear any other caches
rm -rf ~/.npm
rm -rf ~/.yarn
rm -rf ~/.pnpm
```

## Step 3: Install Dependencies (Try Multiple Methods)

### Method A: NPM (Try First)
```bash
# Install with npm
npm install

# If that times out or fails, try:
npm install --legacy-peer-deps

# Or force it:
npm install --force
```

### Method B: Yarn (If NPM Fails)
```bash
# Install yarn if not present
npm install -g yarn

# Install dependencies
yarn install
```

### Method C: PNPM (Fastest, Most Reliable)
```bash
# Install pnpm
npm install -g pnpm

# Install dependencies
pnpm install
```

## Step 4: Verify Core Dependencies
```bash
# Check if Next.js is installed
ls node_modules/.bin/next
# Should show the file

# Check React versions
npm ls react react-dom
# Should show 18.3.1 for both

# Check TypeScript
npx tsc --version
# Should show Version 5.x.x
```

## Step 5: Set Up Environment Variables
```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local with your Supabase credentials
# You need these values from your Supabase dashboard:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY

# Or use the existing .env file if it has the values:
cp .env .env.local
```

## Step 6: Generate Prisma Client (If Using Prisma)
```bash
# Generate Prisma client
npx prisma generate

# If you have migrations:
# npx prisma migrate dev
```

## Step 7: Test TypeScript Compilation
```bash
# Check for TypeScript errors
npx tsc --noEmit

# If errors appear, save them to a file:
npx tsc --noEmit > typescript-errors-new.txt 2>&1

# Count errors:
grep "error TS" typescript-errors-new.txt | wc -l
```

## Step 8: Try Development Server
```bash
# Start the dev server
npm run dev

# Or with explicit port:
npx next dev -p 3000

# Test if it works:
# Open browser to http://localhost:3000
# Or test with curl:
curl http://localhost:3000
```

## Step 9: If Dev Server Fails, Try Production Build
```bash
# Build for production
npm run build

# If build succeeds, start production server:
npm start

# Test:
curl http://localhost:3000
```

## Step 10: Run Tests
```bash
# Run the test suite
npm test

# Or if using Vitest directly:
npx vitest run

# For test coverage:
npm run test:coverage
```

## Step 11: Check Linting
```bash
# Run ESLint
npm run lint

# Auto-fix what's possible:
npm run lint:fix
```

---

## Troubleshooting

### If npm install fails:
1. **Use different Node version:**
   ```bash
   # Install nvm (Node Version Manager)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   
   # Install and use Node 18
   nvm install 18
   nvm use 18
   ```

2. **Try installing core packages first:**
   ```bash
   npm install next@14.2.16 react@18.3.1 react-dom@18.3.1 typescript@5.9.2
   npm install
   ```

### If Next.js won't start:
1. **Check for port conflicts:**
   ```bash
   lsof -i :3000
   # Kill any process using port 3000
   ```

2. **Try minimal configuration:**
   - Rename `app` to `app-backup`
   - Create minimal `app/page.tsx`:
   ```tsx
   export default function Home() {
     return <h1>Test</h1>
   }
   ```

3. **Check Next.js config:**
   - Temporarily rename `next.config.mjs` to `next.config.mjs.backup`
   - Try starting without config

### If TypeScript has many errors:
1. **Check tsconfig.json:**
   ```json
   {
     "compilerOptions": {
       "skipLibCheck": true,
       "strict": false
     }
   }
   ```

2. **Focus on critical errors only:**
   ```bash
   npx tsc --noEmit | grep -E "Cannot find module|';' expected"
   ```

### Environment-Specific Issues:

#### WSL/Docker Issues:
- File watching doesn't work: Add to next.config.mjs:
  ```javascript
  module.exports = {
    webpack: (config) => {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
      return config
    }
  }
  ```

#### Windows Issues:
- Use PowerShell or Git Bash, not CMD
- Install Windows Build Tools:
  ```bash
  npm install --global windows-build-tools
  ```

#### Mac Issues:
- Install Xcode Command Line Tools:
  ```bash
  xcode-select --install
  ```

---

## Expected Results When Working:

### Successful npm install:
- Takes 1-3 minutes
- Installs 1000+ packages
- Creates `node_modules` folder (500MB+)
- Creates `package-lock.json`

### Successful TypeScript check:
- Either 0 errors or manageable number (<100)
- Takes 10-30 seconds to complete
- No "Cannot find module" errors for core packages

### Successful dev server:
```
▲ Next.js 14.2.16
- Local:        http://localhost:3000
- Environments: .env.local

✓ Starting...
✓ Ready in 2.5s
```
- Page loads in browser
- No console errors
- API routes respond

### Successful build:
```
Route (app)                              Size     First Load JS
┌ ○ /                                    5.32 kB        93.4 kB
├ ○ /_not-found                          871 B          88.9 kB
└ ○ /api/health                          0 B                0 B

✓ Compiled successfully
```

### Successful tests:
```
✓ src/components/Button.test.tsx (3)
✓ src/utils/validation.test.ts (5)
...
Test Files  215 passed (215)
     Tests  1043 passed (1043)
```

---

## Quick Validation Script

Create `validate.sh`:
```bash
#!/bin/bash

echo "🔍 Checking environment..."

# Check Node
echo -n "Node.js: "
node --version || echo "❌ Not installed"

# Check npm
echo -n "npm: "
npm --version || echo "❌ Not installed"

# Check for node_modules
echo -n "Dependencies: "
[ -d "node_modules" ] && echo "✅ Installed" || echo "❌ Not installed"

# Check for Next.js
echo -n "Next.js: "
[ -f "node_modules/.bin/next" ] && echo "✅ Found" || echo "❌ Not found"

# Check environment
echo -n "Environment file: "
[ -f ".env.local" ] && echo "✅ Exists" || echo "⚠️ Missing (using .env)"

# Check TypeScript
echo -n "TypeScript check: "
npx tsc --noEmit 2>/dev/null && echo "✅ No errors" || echo "⚠️ Has errors"

# Try to start server
echo "🚀 Attempting to start server..."
timeout 10 npm run dev 2>&1 | grep -q "Ready" && echo "✅ Server starts" || echo "❌ Server fails"
```

Run it:
```bash
chmod +x validate.sh
./validate.sh
```

---

## If Everything Fails:

Consider using alternative approaches:

### 1. Use Create React App:
```bash
npx create-react-app my-app --template typescript
# Copy your components into the new structure
```

### 2. Use Vite:
```bash
npm create vite@latest my-app -- --template react-ts
# Copy your components
```

### 3. Use Remix:
```bash
npx create-remix@latest
# Migrate your Next.js code to Remix
```

### 4. Use Docker (Fresh Container):
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Contact for Help:

If none of these solutions work:
1. Create an issue on: https://github.com/cognoco/User-Management/issues
2. Include:
   - Your OS and Node version
   - Error messages from npm install
   - Output of `npx next info`
   - Any error from `npm run dev`

---

*Last updated: 2025-08-07*
*Tested with: Node 18.x, 20.x | Next.js 14.2.16 | React 18.3.1*