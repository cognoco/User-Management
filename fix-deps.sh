#!/bin/bash

echo "Attempting to fix dependencies..."

# Try to extract the Next.js package we downloaded
if [ -f "next.tgz" ]; then
  echo "Extracting Next.js package..."
  mkdir -p node_modules/next
  tar -xzf next.tgz -C node_modules/next --strip-components=1 2>/dev/null || {
    # If tar fails, try a different approach
    gunzip -c next.tgz | tar -x -C node_modules/next --strip-components=1 2>/dev/null
  }
fi

# Create symlink for next binary
if [ -f "node_modules/next/dist/bin/next" ]; then
  mkdir -p node_modules/.bin
  ln -sf ../next/dist/bin/next node_modules/.bin/next
  chmod +x node_modules/.bin/next
  echo "Next.js binary linked"
fi

# Test if next works
if [ -f "node_modules/.bin/next" ]; then
  echo "Testing Next.js..."
  node node_modules/.bin/next --version 2>/dev/null && echo "Next.js is working!"
fi

echo "Done"