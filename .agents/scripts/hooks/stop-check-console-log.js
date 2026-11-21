#!/usr/bin/env node
'use strict';
const h = require('./lib');
h.failClosed(() => {
  if (h.skip('stop:check-console-log')) return;
  const input = h.readInput();
  const text = String(input.last_assistant_message || input.lastAssistantMessage || input.response || JSON.stringify(input));
  if (!/\bconsole\.log\s*\(/.test(text)) return;
  const msg = '[VESPYR-CONSOLE-LOG] Change added console.log — remove it or justify it.';
  if (h.blockOnWarnings()) h.block(msg);
  h.warn(msg);
});
