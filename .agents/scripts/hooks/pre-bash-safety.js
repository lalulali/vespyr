#!/usr/bin/env node
'use strict';
const h = require('./lib');
const DESTRUCTIVE = [
  /\brm\s+-[a-z]*[rf][a-z]*\s+\/(?:\*|\s|$)/i,
  /\brm\s+-[a-z]*[rf][a-z]*\s+\/\//i,
  /\brm\s+(?:--recursive|--force)\s+(?:--recursive|--force\s+)?\/(?:\*|\s|$)/i,
  /\brm\s+-[a-z]*[rf][a-z]*\s+(?:~|\$HOME)\b/i,
  /\bmkfs\.?\w*\b/i,
  /\bdiskutil\s+eraseDisk\b/i,
  /\bdd\s+if=.*\bof=\/dev\//i,
  /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;/,
];
h.failClosed(() => {
  if (h.skip('pre:bash:safety')) return;
  const input = h.readInput();
  const tool = h.normalizeTool(input);
  if (tool !== 'Bash') return;
  const cmd = h.commandOf(input);
  const hit = DESTRUCTIVE.find((re) => re.test(cmd));
  if (hit) h.block('[VESPYR-SAFETY] Destructive command blocked: ' + hit.source + '. GUARDRAILS enforced at the harness layer.');
});
