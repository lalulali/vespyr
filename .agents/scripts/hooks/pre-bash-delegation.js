#!/usr/bin/env node
'use strict';
const h = require('./lib');
h.failClosed(() => {
  if (h.skip('pre:bash:delegation')) return;
  const input = h.readInput();
  if (h.normalizeTool(input) !== 'Bash') return;
  const agent = h.agentOf(input);
  if (!h.isReasoningAgent(agent)) return;
  const justification = h.justificationOf(input);
  h.appendLog(h.rootOf(input), '.agents/state/delegation-log.ndjson', {
    agent, tool: 'bash', args: h.commandOf(input).slice(0, 500), justification, delegated: false,
  });
  if (!justification) h.block('[VESPYR-DELEGATION] Direct bash by @' + agent + ' blocked. Route via a harness subagent or emit [DIRECT-IO-JUSTIFIED: task because reason].');
});
