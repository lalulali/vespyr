#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const h = require('./lib');
h.failClosed(() => {
  if (h.skip('post:edit:dedupe')) return;
  const input = h.readInput();
  const rel = h.filePathOf(input);
  if (!rel || !rel.replace(/\\/g, '/').includes('artifacts/memory/') || !rel.endsWith('.md')) return;
  const root = h.rootOf(input);
  const abs = path.resolve(root, rel);
  if (!fs.existsSync(abs)) return;
  const body = fs.readFileSync(abs, 'utf8');
  const heads = [...body.matchAll(/^### \[([A-Z]+)\] ([^\n]+)/gm)];
  if (heads.length === 0) return;
  const title = heads[heads.length - 1][2].replace(/\[[^\]]+\]/g, '').trim();
  if (!title) return;
  const validator = path.join(root, '.agents', 'scripts', 'dedupe_validator.js');
  if (!fs.existsSync(validator)) return;
  spawnSync(process.execPath, [validator, '--title', title, '--target', rel], { cwd: root, stdio: 'ignore', timeout: 10000 });
});
