#!/usr/bin/env node
/**
 * tests/test_shadcn_gate.test.js — UI stack gate detection (owner request 2026-09-23).
 *
 * Detection is code: track, stack/MCP/lint states must be evidence-backed.
 * Static HTML is exempt from @shadcn/lint; component tracks must prove it.
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

function run(root, sub, ...args) {
  return spawnSync(process.execPath, [SCRIPT, sub, '--root', root, ...args, '--json'], { encoding: 'utf8' });
}

test('shadcn_gate: no evidence -> stack none; verify requires an explicit track', () => {
  const root = dir();
  const d = JSON.parse(run(root, 'detect').stdout);
  assert.equal(d.stack, 'none');
  assert.equal(d.mcp, 'absent');
  assert.equal(d.lint, 'absent');
  const result = run(root, 'verify');
  assert.equal(result.status, 1);
  assert.match(JSON.parse(result.stdout).problems[0], /explicit --track/);
});

test('shadcn_gate: static-html track passes without @shadcn/lint when the prototype has the Tailwind CDN', () => {
  const root = dir();
  fs.writeFileSync(path.join(root, 'prototype.html'), `<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script><style>:root{--background:#fff;--foreground:#111;--radius:.5rem}#empty{color:red}#populated{color:green}#error{color:red}button:hover{opacity:.8}button:focus{outline:2px solid}button:disabled{opacity:.5}</style>`, 'utf8');
  const result = run(root, 'verify', '--track', 'static-html', '--prototype', 'prototype.html');
  assert.equal(result.status, 0);
  const json = JSON.parse(result.stdout);
  assert.equal(json.track, 'static-html');
  assert.equal(json.lintRequired, false);
  assert.equal(json.pass, true);
});

test('shadcn_gate: static-html track rejects an HTML prototype without a Tailwind CDN', () => {
  const root = dir();
  fs.writeFileSync(path.join(root, 'prototype.html'), '<main>prototype</main>', 'utf8');
  const result = run(root, 'verify', '--track', 'static-html', '--prototype', 'prototype.html');
  assert.equal(result.status, 1);
  assert.match(JSON.parse(result.stdout).problems[0], /Tailwind CDN/);
});

test('shadcn_gate: static-html track rejects missing token/state/React evidence', () => {
  const cases = [
    ['<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script><div id="empty">e</div><div id="populated">p</div><div id="error">x</div><button class="hover focus disabled">go</button>', /custom-property/],
    ['<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script><style>:root{--a:1;--b:2;--c:3}#populated:hover,#error:focus,button:disabled{opacity:.5}</style>', /empty, populated/],
    ['<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script><style>:root{--a:1;--b:2;--c:3}#empty,#populated,#error{color:red}button:hover,button:focus,button:disabled{opacity:.5}</style><script>import React from "react"</script>', /React\/Next/],
  ];
  for (const [source, pattern] of cases) {
    const root = dir();
    fs.writeFileSync(path.join(root, 'prototype.html'), source, 'utf8');
    const result = run(root, 'verify', '--track', 'static-html', '--prototype', 'prototype.html');
    assert.equal(result.status, 1);
    assert.match(JSON.parse(result.stdout).problems.join('\n'), pattern);
  }
});

test('shadcn_gate: nextjs-component track requires component evidence and @shadcn/lint', () => {
  const root = dir();
  const result = run(root, 'verify', '--track', 'nextjs-component');
  assert.equal(result.status, 1);
  assert.match(JSON.parse(result.stdout).problems[0], /Next\.js project/);
});

test('shadcn_gate: nextjs-component track passes with Next.js, Tailwind, and configured shadcn lint', () => {
  const root = dir();
  fs.writeFileSync(path.join(root, 'components.json'), '{}', 'utf8');
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts: { lint: 'node -e "console.log(\'@shadcn/lint lint passed\')"' }, dependencies: { next: '^15', react: '^19' }, devDependencies: { tailwindcss: '^4' } }), 'utf8');
  fs.writeFileSync(path.join(root, 'eslint.config.mjs'), 'import { plugin as shadcn } from "@shadcn/lint";\nexport default [{ plugins: { shadcn }, rules: { "shadcn/no-arbitrary-values": "error" } }];\n', 'utf8');
  fs.mkdirSync(path.join(root, 'components'), { recursive: true });
  fs.writeFileSync(path.join(root, 'components', 'page.tsx'), 'export function Page(){ return <button className="rounded-md">Save</button>; }\n', 'utf8');
  const result = run(root, 'verify', '--track', 'nextjs-component', '--prototype', 'components/page.tsx');
  assert.equal(result.status, 0);
  const json = JSON.parse(result.stdout);
  assert.equal(json.framework, 'nextjs');
  assert.equal(json.lintRequired, true);
  assert.equal(json.pass, true);
});

test('shadcn_gate (CR-1): lint-theater — an echo lint script with NO @shadcn/lint config/dep fails', () => {
  const root = dir();
  fs.writeFileSync(path.join(root, 'components.json'), '{}', 'utf8');
  // Full component stack + a lint script whose STRING contains "@shadcn/lint",
  // but no @shadcn/lint dependency and no lint config with shadcn rule markers.
  // The pre-fix gate treated the script string as execution evidence and passed;
  // the gate must now reject it (script string is not evidence).
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({
    scripts: { lint: 'echo "@shadcn/lint ran"' },
    dependencies: { next: '^15', react: '^19' },
    devDependencies: { tailwindcss: '^4' },
  }), 'utf8');
  fs.mkdirSync(path.join(root, 'components'), { recursive: true });
  fs.writeFileSync(path.join(root, 'components', 'page.tsx'), 'export function Page(){ return <button className="rounded-md">Save</button>; }\n', 'utf8');
  const result = run(root, 'verify', '--track', 'nextjs-component', '--prototype', 'components/page.tsx');
  assert.equal(result.status, 1, 'echo lint-theater must fail without config evidence');
  assert.match(JSON.parse(result.stdout).problems.join('\n'), /@shadcn\/lint configuration evidence/);
});

test('shadcn_gate: components.json marks a shadcn stack; verify red without lint', () => {
  const root = dir();
  fs.writeFileSync(path.join(root, 'components.json'), '{"style":"new-york"}', 'utf8');
  const d = JSON.parse(run(root, 'detect').stdout);
  assert.equal(d.stack, 'shadcn');
  assert.deepEqual(d.evidence.stack, ['components.json']);
  const v = run(root, 'verify', '--track', 'auto');
  assert.equal(v.status, 1);
  assert.match(JSON.parse(v.stdout).problems[0], /explicit --track/);
});

test('shadcn_gate: tailwindcss dependency marks a tailwind stack', () => {
  const root = dir();
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ devDependencies: { tailwindcss: '^4.0.0' } }), 'utf8');
  const d = JSON.parse(run(root, 'detect').stdout);
  assert.equal(d.stack, 'tailwind');
  assert.equal(run(root, 'verify', '--track', 'auto').status, 1, 'auto is detection-only');
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
  assert.equal(run(root, 'verify', '--track', 'auto').status, 1, 'auto is detection-only');
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
