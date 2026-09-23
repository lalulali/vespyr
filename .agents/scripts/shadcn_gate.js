#!/usr/bin/env node
/**
 * shadcn_gate.js — UI stack detection & guideline gate for /design
 * (owner request 2026-09-23).
 *
 * Mechanical half of the design UI stack gate: detection is code, asking is
 * prompt. Reports three facts with evidence:
 *   stack — shadcn | tailwind | none  (components.json / shadcn dep / tailwind dep)
 *   mcp   — installed | disabled | absent (shadcn MCP across known config locations)
 *   lint  — configured | absent (@shadcn/lint in eslint/oxlint config or deps)
 *
 *   detect  — always exit 0 (report only)
 *   verify  — exit 1 when a shadcn/Tailwind stack is in play but @shadcn/lint
 *             is not configured (the guideline must be machine-checkable)
 *
 * Sources: https://github.com/shadcn-ui/lint (SETUP.md, rules shadcn/*),
 *          https://ui.shadcn.com/docs/mcp (shadcn MCP server),
 *          https://opencode.ai/docs/mcp-servers (config shape).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const MCP_LOCATIONS = [
  { file: 'opencode.json', key: 'mcp' },
  { file: '.mcp.json', key: 'mcpServers' },
  { file: '.cursor/mcp.json', key: 'mcpServers' },
  { file: '.vscode/mcp.json', key: 'servers' },
];
const LINT_CONFIGS = [
  'eslint.config.mjs', 'eslint.config.js', 'eslint.config.cjs', 'eslint.config.ts',
  '.oxlintrc.json', '.oxlintrc.jsonc',
];
const LINT_MARKERS = /@shadcn\/lint|shadcn\/no-/;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next === undefined || String(next).startsWith('--')) args[key] = true;
      else { args[key] = next; i++; }
    }
  }
  return args;
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function detect(root) {
  const evidence = { stack: [], mcp: [], lint: [] };

  // --- stack ---
  let stack = 'none';
  const pkg = fs.existsSync(path.join(root, 'package.json')) ? readJson(path.join(root, 'package.json')) : null;
  const deps = pkg ? { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) } : {};
  if (fs.existsSync(path.join(root, 'components.json'))) {
    stack = 'shadcn';
    evidence.stack.push('components.json');
  } else if (Object.keys(deps).some((d) => d === 'shadcn' || d.startsWith('@shadcn/'))) {
    stack = 'shadcn';
    evidence.stack.push('package.json shadcn dependency');
  } else if (deps.tailwindcss || Object.keys(deps).some((d) => d.startsWith('@tailwindcss/'))) {
    stack = 'tailwind';
    evidence.stack.push('package.json tailwindcss dependency');
  }

  // --- shadcn MCP ---
  let foundEnabled = false;
  let foundDisabled = false;
  for (const loc of MCP_LOCATIONS) {
    const p = path.join(root, loc.file);
    if (!fs.existsSync(p)) continue;
    const cfg = readJson(p);
    const map = cfg && typeof cfg[loc.key] === 'object' ? cfg[loc.key] : null;
    if (!map) continue;
    for (const [name, entry] of Object.entries(map)) {
      const hit = name.toLowerCase() === 'shadcn' || JSON.stringify(entry || {}).toLowerCase().includes('shadcn');
      if (!hit) continue;
      evidence.mcp.push(`${loc.file}#${loc.key}.${name}`);
      if (entry && entry.enabled === false) foundDisabled = true;
      else foundEnabled = true;
    }
  }
  const mcp = foundEnabled ? 'installed' : foundDisabled ? 'disabled' : 'absent';

  // --- @shadcn/lint ---
  let lint = 'absent';
  if (deps['@shadcn/lint']) {
    lint = 'configured';
    evidence.lint.push('package.json @shadcn/lint dependency');
  } else {
    for (const f of LINT_CONFIGS) {
      const p = path.join(root, f);
      if (fs.existsSync(p) && LINT_MARKERS.test(fs.readFileSync(p, 'utf8'))) {
        lint = 'configured';
        evidence.lint.push(f);
        break;
      }
    }
  }

  return { root, stack, mcp, lint, evidence };
}

function main() {
  const [sub, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  const root = path.resolve(args.root || process.cwd());
  const result = detect(root);

  if (sub === 'detect') {
    if (args.json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`shadcn_gate detect`);
      console.log(`  stack : ${result.stack} (${result.evidence.stack.join(', ') || 'no evidence'})`);
      console.log(`  mcp   : ${result.mcp} (${result.evidence.mcp.join(', ') || 'no config found'})`);
      console.log(`  lint  : ${result.lint} (${result.evidence.lint.join(', ') || 'no config found'})`);
    }
    process.exit(0);
  }

  if (sub === 'verify') {
    const problems = [];
    if (result.stack === 'shadcn' || result.stack === 'tailwind') {
      if (result.lint !== 'configured') {
        problems.push(`stack "${result.stack}" chosen but @shadcn/lint is not configured — read https://github.com/shadcn-ui/lint/blob/main/SETUP.md and set it up`);
      }
    }
    const out = { ...result, pass: problems.length === 0, problems };
    if (args.json) console.log(JSON.stringify(out, null, 2));
    else {
      if (result.stack === 'none') console.log('shadcn_gate verify: no shadcn/Tailwind stack — nothing to enforce');
      else if (out.pass) console.log(`shadcn_gate verify: PASS — stack ${result.stack}, lint ${result.lint}`);
      else for (const p of problems) console.error(`  ✗ ${p}`);
    }
    process.exit(out.pass ? 0 : 1);
  }

  console.error('Usage:\n  node shadcn_gate.js detect [--root R] [--json]\n  node shadcn_gate.js verify [--root R] [--json]');
  process.exit(2);
}

if (require.main === module) main();

module.exports = { detect };
