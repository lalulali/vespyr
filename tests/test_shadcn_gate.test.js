#!/usr/bin/env node
/**
 * tests/test_shadcn_gate.test.js — UI stack gate detection (owner request 2026-09-23).
 *
 * Detection is code: stack/MCP/lint states must be evidence-backed, and
 * `verify` must go red when a chosen stack has no @shadcn/lint configured.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', '.agents', 'scripts', 'shadcn_gate.js');

function dir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'shadcn-gate-'));
}

function run(root, sub) {
  return spawnSync(process.execPath, [SCRIPT, sub, '--root', root, '--json'], { encoding: 'utf8' });
}

test('shadcn_gate: no evidence -> stack none; verify is green (nothing to enforce)', () => {
  const root = dir();
  const d = JSON.parse(run(root, 'detect').stdout);
  assert.equal(d.stack, 'none');
  assert.equal(d.mcp, 'absent');
  assert.equal(d.lint, 'absent');
  assert.equal(run(root, 'verify').status, 0);
});

test('shadcn_gate: components.json marks a shadcn stack; verify red without lint', () => {
  const root = dir();
  fs.writeFileSync(path.join(root, 'components.json'), '{"style":"new-york"}', 'utf8');
  const d = JSON.parse(run(root, 'detect').stdout);
  assert.equal(d.stack, 'shadcn');
  assert.deepEqual(d.evidence.stack, ['components.json']);
  const v = run(root, 'verify');
  assert.equal(v.status, 1);
  assert.match(JSON.parse(v.stdout).problems[0], /SETUP\.md/);
});

test('shadcn_gate: tailwindcss dependency marks a tailwind stack', () => {
  const root = dir();
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ devDependencies: { tailwindcss: '^4.0.0' } }), 'utf8');
  const d = JSON.parse(run(root, 'detect').stdout);
  assert.equal(d.stack, 'tailwind');
  assert.equal(run(root, 'verify').status, 1, 'chosen stack without lint must be red');
});

test('shadcn_gate: @shadcn/lint configured via eslint config -> verify green', () => {
  const root = dir();
  fs.writeFileSync(path.join(root, 'components.json'), '{}', 'utf8');
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ devDependencies: { tailwindcss: '^4' } }), 'utf8');
  fs.writeFileSync(
    path.join(root, 'eslint.config.mjs'),
    'import { plugin as shadcn } from "@shadcn/lint";\nexport default [{ plugins: { shadcn }, rules: { "shadcn/no-arbitrary-values": "error" } }];\n',
    'utf8'
  );
  const d = JSON.parse(run(root, 'detect').stdout);
  assert.equal(d.stack, 'shadcn');
  assert.equal(d.lint, 'configured');
  assert.deepEqual(d.evidence.lint, ['eslint.config.mjs']);
  assert.equal(run(root, 'verify').status, 0);
});

test('shadcn_gate: shadcn MCP detected across config locations, with disabled state', () => {
  const root = dir();
  fs.writeFileSync(
    path.join(root, 'opencode.json'),
    JSON.stringify({ mcp: { shadcn: { type: 'local', command: ['npx', 'shadcn@latest', 'mcp'], enabled: true } } }),
    'utf8'
  );
  assert.equal(JSON.parse(run(root, 'detect').stdout).mcp, 'installed');

  fs.writeFileSync(
    path.join(root, 'opencode.json'),
    JSON.stringify({ mcp: { shadcn: { type: 'local', command: ['npx', 'shadcn@latest', 'mcp'], enabled: false } } }),
    'utf8'
  );
  const d = JSON.parse(run(root, 'detect').stdout);
  assert.equal(d.mcp, 'disabled');
  assert.deepEqual(d.evidence.mcp, ['opencode.json#mcp.shadcn']);

  fs.rmSync(path.join(root, 'opencode.json'));
  assert.equal(JSON.parse(run(root, 'detect').stdout).mcp, 'absent');
});

test('shadcn_gate: .mcp.json (other harnesses) counts as installed', () => {
  const root = dir();
  fs.writeFileSync(
    path.join(root, '.mcp.json'),
    JSON.stringify({ mcpServers: { shadcn: { command: 'npx', args: ['shadcn@latest', 'mcp'] } } }),
    'utf8'
  );
  const d = JSON.parse(run(root, 'detect').stdout);
  assert.equal(d.mcp, 'installed');
  assert.deepEqual(d.evidence.mcp, ['.mcp.json#mcpServers.shadcn']);
});
