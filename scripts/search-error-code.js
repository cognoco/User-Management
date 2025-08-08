#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const [,, code] = process.argv;
if (!code) {
  console.log('Usage: node scripts/search-error-code.js <code>');
  process.exit(0);
}

const docPath = path.join('docs', 'Product documentation', 'Error Code Reference.md');
const text = fs.readFileSync(docPath, 'utf8');
const lines = text.split(/\r?\n/);
const index = lines.findIndex(l => l.includes(code));
if (index !== -1) {
  console.log(`${docPath}:${index + 1}`);
  console.log(lines[index]);
} else {
  console.log(`Code ${code} not found`);
}
