// T-HOOK-1..5 — 13 lifecycle hooks, env profiles, delegation enforcement,
// fail-closed behavior, and per-harness config emission (03 F2.1–F2.5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = require('../.agents/hooks/hooks.json');
const lib = require('../.agents/scripts/hooks/lib.js');
const adapters = require('../bin/lib/hooks.js');

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-hooks-'));
}

function runHook(name, input, root = tempRoot(), env = {}) {
  const script = path.join(REPO, '.agents', 'scripts', 'hooks', name);
  return spawnSync(process.execPath, [script], {
    cwd: root,
    input: typeof input === 'string' ? input : JSON.stringify({ cwd: root, ...input }),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

function logRows(root, rel = '.agents/state/delegation-log.ndjson') {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

test('registry declares exactly 13 hooks with unique stable IDs', () => {
  assert.equal(registry.hooks.length, 13);
  assert.equal(new Set(registry.hooks.map((h) => h.id)).size, 13);
  for (const h of registry.hooks) {
    assert.ok(fs.existsSync(path.join(REPO, h.script)), `missing script: ${h.script}`);
  }
});

test('T-HOOK-1 — VESPYR_DISABLED_HOOKS removes only the named hook', () => {
  const active = lib.resolveActiveHooks(registry, { VESPYR_DISABLED_HOOKS: 'pre:bash:tmux' });
  assert.equal(active.length, 12);
  assert.ok(!active.includes('pre:bash:tmux'));
  assert.ok(active.includes('pre:bash:safety'));
});

test('T-HOOK-2 — minimal profile is exactly the 4 safety hooks', () => {
  const active = lib.resolveActiveHooks(registry, { VESPYR_HOOK_PROFILE: 'minimal' });
  assert.deepEqual(active.sort(), [...lib.MINIMAL_IDS].sort());
  assert.equal(active.length, 4);
});

test('T-HOOK-3 — strict keeps all 13; * disables all', () => {
  assert.equal(lib.resolveActiveHooks(registry, { VESPYR_HOOK_PROFILE: 'strict' }).length, 13);
  assert.equal(lib.resolveActiveHooks(registry, { VESPYR_DISABLED_HOOKS: '*' }).length, 0);
  assert.equal(lib.blockOnWarnings({ VESPYR_HOOK_PROFILE: 'strict' }), true);
  assert.equal(lib.blockOnWarnings({ VESPYR_HOOK_PROFILE: 'standard' }), false);
});

test('T-HOOK-4 — pre:bash:delegation blocks unjustified direct I/O and logs it', () => {
  const root = tempRoot();
  const r = runHook('pre-bash-delegation.js', {
    hook_event_name: 'PreToolUse', tool_name: 'Bash', agent_type: 'developer',
    tool_input: { command: 'cat src/app.js' },
  }, root);
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /DIRECT-IO-JUSTIFIED/);
  const rows = logRows(root);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].delegated, false);
  assert.equal(rows[0].agent, 'developer');
  assert.equal(rows[0].justification, null);
});

test('T-HOOK-5 — a justification passes and is logged (logged, not trusted)', () => {
  const root = tempRoot();
  const r = runHook('pre-bash-delegation.js', {
    hook_event_name: 'PreToolUse', tool_name: 'Bash', agent_type: 'developer',
    tool_input: { command: 'cat x # [DIRECT-IO-JUSTIFIED: 1 tiny file because faster]' },
  }, root);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const rows = logRows(root);
  assert.equal(rows.length, 1);
  assert.match(rows[0].justification, /1 tiny file because faster/);
});

test('delegation hooks ignore I/O sub-agents and unknown agents', () => {
  const root = tempRoot();
  const r = runHook('pre-bash-delegation.js', {
    hook_event_name: 'PreToolUse', tool_name: 'Bash', agent_type: 'memory-controller',
    tool_input: { command: 'cat x' },
  }, root);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(logRows(root).length, 0);
});

test('disabled delegation hook does not block or log', () => {
  const root = tempRoot();
  const r = runHook('pre-bash-delegation.js', {
    hook_event_name: 'PreToolUse', tool_name: 'Bash', agent_type: 'developer',
    tool_input: { command: 'cat x' },
  }, root, { VESPYR_DISABLED_HOOKS: 'pre:bash:delegation' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(logRows(root).length, 0);
});

test('pre:bash:safety blocks destructive commands, allows ordinary ones', () => {
  const blocked = runHook('pre-bash-safety.js', {
    hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'rm -rf /' },
  });
  assert.equal(blocked.status, 2);
  assert.match(blocked.stderr, /VESPYR-SAFETY/);
  const allowed = runHook('pre-bash-safety.js', {
    hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'npm test' },
  });
  assert.equal(allowed.status, 0);
});

test('a crashing hook fails closed (exit 2), never a silent pass', () => {
  const r = runHook('pre-bash-safety.js', '{not valid json');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /HOOK-FAIL-CLOSED/);
});

test('per-harness emitters write all 13 hooks with the right event names', () => {
  const root = tempRoot();
  const written = adapters.emitHarnessHooks(root, ['claude', 'cursor', 'github', 'opencode']);
  // OpenCode ships its plugin statically; no config is emitted into the .opencode -> .agents symlink.
  assert.equal(written.length, 3);

  const claude = JSON.parse(fs.readFileSync(path.join(root, '.claude', 'settings.json'), 'utf8'));
  assert.equal(Object.values(claude.hooks).flat().reduce((n, g) => n + g.hooks.length, 0), 13);
  assert.ok(claude.hooks.PreToolUse.some((g) => g.matcher === 'Bash'));
  assert.ok(claude.hooks.PreCompact);
  assert.ok(claude.hooks.SubagentStop);

  const cursor = JSON.parse(fs.readFileSync(path.join(root, '.cursor', 'hooks.json'), 'utf8'));
  assert.equal(Object.values(cursor.hooks).flat().length, 13);
  assert.ok(cursor.hooks.subagentStop);
  assert.ok(cursor.hooks.preCompact);
  assert.equal(cursor.hooks.preToolUse[0].failClosed, true);

  const copilot = JSON.parse(fs.readFileSync(path.join(root, '.github', 'hooks', 'vespyr.json'), 'utf8'));
  assert.equal(Object.values(copilot.hooks).flat().length, 13);
  assert.ok(copilot.hooks.preToolUse[0].timeoutSec);

  const plugin = fs.readFileSync(path.join(REPO, '.agents', 'plugins', 'vespyr-hooks.ts'), 'utf8');
  assert.match(plugin, /Plugin\.define/);
  assert.match(plugin, /ctx\.tool\.hook\("execute\.before"/);
  assert.match(plugin, /ctx\.session\.hook\("context"/);
  assert.match(plugin, /pre-bash-safety/);
  assert.doesNotMatch(plugin, /"hooks"\s*:/);
});
