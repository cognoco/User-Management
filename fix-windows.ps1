# PowerShell script to fix Next.js installation on Windows

Write-Host "Fixing Next.js installation on Windows..." -ForegroundColor Green

# Step 1: Clean up
Write-Host "Step 1: Cleaning up old files..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
}
if (Test-Path "package-lock.json") {
    Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
}
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
}

# Step 2: Clear npm cache
Write-Host "Step 2: Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force

# Step 3: Install dependencies
Write-Host "Step 3: Installing dependencies..." -ForegroundColor Yellow
npm install

# Step 4: Verify installation
Write-Host "Step 4: Verifying installation..." -ForegroundColor Yellow
$nextPath = "node_modules/.bin/next"
if (Test-Path $nextPath) {
    Write-Host "✓ Next.js installed successfully!" -ForegroundColor Green
} else {
    $nextCmdPath = "node_modules/.bin/next.cmd"
    if (Test-Path $nextCmdPath) {
        Write-Host "✓ Next.js installed successfully!" -ForegroundColor Green
    } else {
        Write-Host "✗ Next.js installation failed!" -ForegroundColor Red
        Write-Host "Try running: npm install next@14.2.32 --save" -ForegroundColor Yellow
    }
}

# Step 5: Try to build
Write-Host "Step 5: Testing build..." -ForegroundColor Yellow
npm run build

Write-Host "Done!" -ForegroundColor Green