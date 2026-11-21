#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const h = require('./lib');
h.failClosed(() => {
  if (h.skip('pre:edit:delegation')) return;
  const input = h.readInput();
  const tool = h.normalizeTool(input);
  if (tool !== 'Write' && tool !== 'Edit') return;
  const agent = h.agentOf(input);
  if (!h.isReasoningAgent(agent)) return;
  const root = h.rootOf(input);
  const rel = h.filePathOf(input);
  const abs = rel ? path.resolve(root, rel) : '';
  const existingLines = abs && fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8').split('\n').length : 0;
  const contentStr = String(input.tool_input?.content || input.toolArgs?.content || '');
  const newLines = contentStr ? contentStr.split('\n').length : 0;
  const lines = tool === 'Write' ? Math.max(existingLines, newLines) : existingLines;
  if (lines < 50) return; // small-file exception (<50 lines stays direct)
  const justification = h.justificationOf(input);
  h.appendLog(root, '.agents/state/delegation-log.ndjson', {
    agent, tool: tool.toLowerCase(), args: rel, justification, delegated: false,
  });
  if (!justification) h.block('[VESPYR-DELEGATION] Direct ' + tool + ' of ' + rel + ' (' + lines + ' lines) by @' + agent + ' blocked. Route via a harness subagent, keep it under 50 lines, or emit [DIRECT-IO-JUSTIFIED: task because reason].');
});
