@echo off
echo Fixing Next.js installation on Windows...

REM Step 1: Clean up
echo Step 1: Cleaning up old files...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /f package-lock.json
if exist .next rmdir /s /q .next

REM Step 2: Clear npm cache
echo Step 2: Clearing npm cache...
call npm cache clean --force

REM Step 3: Install dependencies
echo Step 3: Installing dependencies...
call npm install

REM Step 4: Test build
echo Step 4: Testing build...
call npm run build

echo Done!