#!/usr/bin/env node
import fs from 'fs';

const [,, query, logFile] = process.argv;
const docPath = 'docs/Product documentation/Error Code Reference.md';

function searchDoc(q) {
  const text = fs.readFileSync(docPath, 'utf8');
  const lines = text.split(/\r?\n/);
  return lines.filter(l => l.toLowerCase().includes(q.toLowerCase())).join('\n');
}

function countFromLog(file) {
  const content = fs.readFileSync(file, 'utf8');
  const counts = {};
  const codes = content.match(/\b[a-z]+\/[a-z_]+\b/g) || [];
  for (const c of codes) {
    counts[c] = (counts[c] || 0) + 1;
  }
  return Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`${c}: ${n}`).join('\n');
}

if (!query) {
  console.log('Usage: node scripts/filter-error-codes.js <query> [logFile]');
  process.exit(0);
}
console.log(searchDoc(query));
if (logFile) {
  console.log('\nCounts from log:');
  console.log(countFromLog(logFile));
}
