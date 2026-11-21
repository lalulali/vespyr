#!/usr/bin/env node
'use strict';
const h = require('./lib');
h.failClosed(() => {
  if (h.skip('pre:compact:save-state')) return;
  const input = h.readInput();
  h.appendLog(h.rootOf(input), '.agents/state/compact-snapshots.ndjson', {
    event: input.hook_event_name || 'PreCompact',
    agent: h.agentOf(input),
    session: input.session_id || input.conversation_id || null,
    source: input.source || null,
  });
  h.context('Vespyr state snapshot saved before compaction (.agents/state/compact-snapshots.ndjson).');
});
