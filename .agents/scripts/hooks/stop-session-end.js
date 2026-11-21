#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const h = require('./lib');
h.failClosed(() => {
  if (h.skip('stop:session-end')) return;
  const input = h.readInput();
  const root = h.rootOf(input);
  // F2.15.a: record [INSTINCT: INS-NNN] citations before the session closes.
  h.logInstinctCitations(input);

  // Background self-learning: one Tier-1 episode per session, plus a digest
  // refresh at most once a day. Promotion stays human-gated in /self-learning.
  // Prefer the installed project's copy; fall back to the script bundled next
  // to this hook (same file in a normal install, but works in test sandboxes).
  const installedLearn = path.join(root, '.agents', 'scripts', 'self_learn.js');
  const learn = fs.existsSync(installedLearn) ? installedLearn : path.join(__dirname, '..', 'self_learn.js');
  if (fs.existsSync(learn)) {
    const message = String(input.last_assistant_message || input.lastAssistantMessage || '');
    const title = message.split(/(?<=[.!?])\s+/)[0].slice(0, 120) || 'session outcome';
    spawnSync(process.execPath, [learn, 'auto-capture',
      `--root=${root}`,
      `--agent=${h.agentOf(input) || 'developer'}`,
      `--title=${title}`,
      '--context=automatic Stop-hook capture',
      '--outcome=session ended',
      `--summary=${message.slice(0, 400)}`,
    ], { cwd: root, stdio: 'ignore', timeout: 5000 });
  }

  const script = path.join(root, '.agents', 'scripts', 'orchestrator_state.js');
  if (!fs.existsSync(script)) return;
  spawnSync(process.execPath, [script, 'session-write', '--agent', h.agentOf(input) || 'developer'], {
    cwd: root, stdio: 'ignore', timeout: 30000,
  });
});
