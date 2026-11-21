#!/usr/bin/env node
// Discovers and runs every *.test.js fixture under tests/ (converged from test/ + tests/).
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOTS = [__dirname];

// Naming conventions discovered: tests/test_*.js (legacy prefix),
// tests/**/*.test.js (node:test suffix), and tests/test_*.mjs (F2.29 gate suites).
function isTestFixture(name) {
  return name.endsWith('.test.js') || name.endsWith('.test.mjs') || /^test_.+\.(js|mjs)$/.test(name);
}

function collect(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, acc);
    else if (entry.isFile() && isTestFixture(entry.name)) acc.push(full);
  }
  return acc;
}

const files = [...new Set(ROOTS.flatMap((root) => (fs.existsSync(root) ? collect(root) : [])))].sort();
if (files.length === 0) {
  console.error('run-all: no *.test.js / test_*.mjs fixtures found under tests/');
  process.exit(2);
}
console.log(`run-all: executing ${files.length} test files:`);
for (const f of files) console.log('  - ' + path.relative(process.cwd(), f));
const res = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(res.status === null ? 1 : res.status);
