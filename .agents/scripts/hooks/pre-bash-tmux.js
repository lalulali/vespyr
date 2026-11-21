#!/usr/bin/env node
'use strict';
const h = require('./lib');
const LONG = /\b(npm\s+test|pnpm\s+test|yarn\s+test|pytest|python\s+-m\s+pytest|cargo\s+test|go\s+test|mvn\s+test|gradle\s+test)\b/i;
h.failClosed(() => {
  if (h.skip('pre:bash:tmux')) return;
  const input = h.readInput();
  if (h.normalizeTool(input) !== 'Bash') return;
  if (LONG.test(h.commandOf(input))) h.context('Long-running test detected — consider tmux to free the main thread.');
});
