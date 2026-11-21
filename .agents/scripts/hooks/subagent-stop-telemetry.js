#!/usr/bin/env node
'use strict';
const h = require('./lib');
h.failClosed(() => {
  if (h.skip('subagent:stop:telemetry')) return;
  const input = h.readInput();
  h.appendLog(h.rootOf(input), 'artifacts/telemetry/hook-events.ndjson', {
    type: 'subagent-stop',
    subagent_type: input.subagent_type || input.subagentType || input.agentType || null,
    status: input.status || null,
    session: input.session_id || input.conversation_id || null,
  });
});
