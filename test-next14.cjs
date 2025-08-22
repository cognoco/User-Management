// Test script to check Next.js 14 performance
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Testing Next.js 14 compilation performance...\n');

// Create a minimal test app
const testDir = path.join(__dirname, 'next14-test');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Create minimal package.json
const packageJson = {
  "name": "next14-test",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev"
  },
  "dependencies": {
    "next": "14.2.32",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  }
};

fs.writeFileSync(
  path.join(testDir, 'package.json'),
  JSON.stringify(packageJson, null, 2)
);

// Create minimal next.config.js
fs.writeFileSync(
  path.join(testDir, 'next.config.js'),
  `module.exports = { reactStrictMode: true }`
);

// Create app directory
const appDir = path.join(testDir, 'app');
if (!fs.existsSync(appDir)) {
  fs.mkdirSync(appDir, { recursive: true });
}

// Create minimal layout
fs.writeFileSync(
  path.join(appDir, 'layout.tsx'),
  `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`
);

// Create minimal page
fs.writeFileSync(
  path.join(appDir, 'page.tsx'),
  `export default function Home() {
  return <h1>Next.js 14 Test</h1>;
}`
);

console.log('Created test Next.js 14 app in:', testDir);
console.log('Run the following commands to test:');
console.log(`  cd ${testDir}`);
console.log('  npm install');
console.log('  npm run dev');