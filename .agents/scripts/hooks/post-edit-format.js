#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const h = require('./lib');
h.failClosed(() => {
  if (h.skip('post:edit:format')) return;
  const input = h.readInput();
  const tool = h.normalizeTool(input);
  if (tool !== 'Write' && tool !== 'Edit' && input.hook_event_name !== 'afterFileEdit') return;
  const root = h.rootOf(input);
  const rel = h.filePathOf(input);
  if (!rel) return;
  const abs = path.resolve(root, rel);
  if (!fs.existsSync(abs)) return;
  const ext = path.extname(abs).toLowerCase();
  let cmd = null, args = [];
  const prettier = path.join(root, 'node_modules', '.bin', 'prettier');
  if (/\.(js|jsx|ts|tsx|json|md|css|html)$/.test(ext) && fs.existsSync(prettier)) {
    cmd = prettier; args = ['--write', abs];
  } else if (ext === '.py') {
    cmd = 'ruff'; args = ['format', abs];
  } else if (ext === '.go') {
    cmd = 'gofmt'; args = ['-w', abs];
  }
  if (cmd) spawnSync(cmd, args, { cwd: root, stdio: 'ignore', timeout: 10000 });
});
