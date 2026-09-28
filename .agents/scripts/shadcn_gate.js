#!/usr/bin/env node
/**
 * shadcn_gate.js — UI stack detection & guideline gate for /design
 * (owner request 2026-09-23).
 *
 * Mechanical half of the design prototype-track gate: detection is code, asking
 * is prompt. Supports static-html prototypes (shadcn-flavored visual language,
 * no React requirement) and nextjs-component prototypes (real component stack
 * plus @shadcn/lint). Reports:
 *   track — static-html | nextjs-component | auto
 *   framework — nextjs | react | none  (package.json evidence)
 *   stack — shadcn | tailwind | none  (components.json / shadcn dep / tailwind dep)
 *   mcp   — installed | disabled | absent (shadcn MCP across known config locations)
 *   lint  — configured | absent (@shadcn/lint in eslint/oxlint config or deps)
 *
 *   detect  — always exit 0 (report only)
 *   verify  — exit 1 when a component track is selected but its stack/lint
 *             evidence is missing; static-html is exempt from @shadcn/lint
 *
 * Sources: https://github.com/shadcn-ui/lint (SETUP.md, rules shadcn/*),
 *          https://ui.shadcn.com/docs/mcp (shadcn MCP server),
 *          https://opencode.ai/docs/mcp-servers (config shape).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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
const TRACKS = new Set(['auto', 'static-html', 'nextjs-component']);

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
  const evidence = { stack: [], framework: [], mcp: [], lint: [] };

  // --- stack ---
  let stack = 'none';
  const pkg = fs.existsSync(path.join(root, 'package.json')) ? readJson(path.join(root, 'package.json')) : null;
  const deps = pkg ? { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) } : {};

  // --- framework ---
  let framework = 'none';
  if (deps.next) {
    framework = 'nextjs';
    evidence.framework.push('package.json next dependency');
  } else if (deps.react) {
    framework = 'react';
    evidence.framework.push('package.json react dependency');
  }

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

  return { root, framework, stack, mcp, lint, evidence };
}

function walkSourceFiles(root) {
  const files = [];
  const skip = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'coverage']);
  function visit(dir) {
    if (files.length >= 2000) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!skip.has(entry.name)) visit(full);
      } else if (/\.(tsx|jsx|vue|svelte)$/i.test(entry.name)) {
        files.push(full);
      }
    }
  }
  visit(root);
  return files;
}

function validateStatic(root, prototypeArg) {
  const problems = [];
  const evidence = { source: null, tokenVariables: 0, criticalStates: [], feedback: [] };
  if (!prototypeArg) {
    problems.push('track "static-html" requires --prototype pointing to a local HTML source');
    return { problems, evidence };
  }
  const prototype = path.resolve(root, prototypeArg);
  if (!fs.existsSync(prototype) || !/\.html?$/i.test(prototype)) {
    problems.push('track "static-html" requires an existing .html or .htm prototype');
    return { problems, evidence };
  }
  const source = fs.readFileSync(prototype, 'utf8');
  evidence.source = prototype;
  if (!/@tailwindcss\/browser|cdn\.tailwindcss\.com/i.test(source)) {
    problems.push('track "static-html" requires a Tailwind CDN reference in the prototype');
  }
  evidence.tokenVariables = (source.match(/--[a-z0-9-]+\s*:/gi) || []).length;
  if (evidence.tokenVariables < 3) problems.push('static-html prototype needs at least three CSS custom-property token declarations');
  for (const state of ['empty', 'populated', 'error']) {
    if (new RegExp(state, 'i').test(source)) evidence.criticalStates.push(state);
  }
  for (const feedback of ['hover', 'focus', 'disabled', 'aria-busy', 'prefers-reduced-motion']) {
    if (new RegExp(feedback, 'i').test(source)) evidence.feedback.push(feedback);
  }
  if (evidence.criticalStates.length < 3) problems.push('static-html prototype must expose empty, populated, and error states');
  if (evidence.feedback.length < 2) problems.push('static-html prototype needs observable focus/hover/disabled/loading feedback');
  if (/\b(?:import\s+(?:React|from\s+['"]react)|ReactDOM|createRoot\s*\(|from\s+['"]next\/)/i.test(source)) {
    problems.push('static-html prototype must not silently contain a React/Next implementation');
  }
  return { problems, evidence };
}

function validateNext(root, prototypeArg) {
  const problems = [];
  const evidence = { source: null, componentFiles: [], lint: null };
  if (!prototypeArg) {
    problems.push('track "nextjs-component" requires --prototype pointing to component source or a project directory');
    return { problems, evidence };
  }
  const prototype = path.resolve(root, prototypeArg);
  if (!fs.existsSync(prototype)) {
    problems.push(`component prototype path does not exist: ${prototype}`);
    return { problems, evidence };
  }
  const pkgPath = path.join(root, 'package.json');
  const pkg = fs.existsSync(pkgPath) ? readJson(pkgPath) : null;
  const deps = pkg ? { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) } : {};
  if (!deps.next || !deps.react) problems.push('nextjs-component requires next and react dependencies');
  if (!fs.existsSync(path.join(root, 'components.json'))) problems.push('nextjs-component requires components.json');
  const files = walkSourceFiles(prototypePathRoot(prototype, root));
  evidence.componentFiles = files.filter((file) => {
    const source = fs.readFileSync(file, 'utf8');
    return /className|class=/.test(source) && /(?:export|function|const\s+\w+\s*=)/.test(source);
  }).slice(0, 10);
  if (evidence.componentFiles.length === 0) problems.push('nextjs-component requires an actual component source file with className/class styling');
  if (!pkg || !pkg.scripts || typeof pkg.scripts.lint !== 'string') {
    problems.push('nextjs-component requires an npm run lint script');
  } else {
    const run = spawnSync('npm', ['run', 'lint', '--silent'], { cwd: root, encoding: 'utf8', timeout: 120000 });
    const output = `${run.stdout || ''}${run.stderr || ''}`.trim();
    evidence.lint = { command: 'npm run lint --silent', status: run.status, signal: run.signal || null, output: output.slice(0, 4000) };
    if (run.error) problems.push(`npm run lint could not execute: ${run.error.message}`);
    else if (run.status !== 0) problems.push('npm run lint failed; component prototype cannot pass the track gate');
    if (!run.error && !/@shadcn\/lint|shadcn\/|eslint|next\s+lint/i.test(`${pkg.scripts.lint}\n${output}`)) {
      problems.push('npm run lint did not provide evidence that shadcn lint rules were executed');
    }
    if (!deps['@shadcn/lint'] && !fs.readdirSync(root).some((name) => LINT_CONFIGS.includes(name) && fs.readFileSync(path.join(root, name), 'utf8').match(LINT_MARKERS))) {
      problems.push('nextjs-component requires @shadcn/lint configuration evidence');
    }
  }
  return { problems, evidence };
}

function prototypePathRoot(prototype, root) {
  try {
    const stat = fs.statSync(prototype);
    return stat.isDirectory() ? prototype : path.dirname(prototype);
  } catch {
    return root;
  }
}

function main() {
  const [sub, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  const track = args.track || 'auto';
  if (!TRACKS.has(track)) {
    console.error(`Unknown prototype track "${track}". Use auto, static-html, or nextjs-component.`);
    process.exit(2);
  }
  const root = path.resolve(args.root || process.cwd());
  const detected = detect(root);
  const result = { ...detected, track };

  if (sub === 'detect') {
    if (args.json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`shadcn_gate detect`);
      console.log(`  track : ${track}`);
      console.log(`  framework : ${result.framework} (${result.evidence.framework.join(', ') || 'no evidence'})`);
      console.log(`  stack : ${result.stack} (${result.evidence.stack.join(', ') || 'no evidence'})`);
      console.log(`  mcp   : ${result.mcp} (${result.evidence.mcp.join(', ') || 'no config found'})`);
      console.log(`  lint  : ${result.lint} (${result.evidence.lint.join(', ') || 'no config found'})`);
    }
    process.exit(0);
  }

  if (sub === 'verify') {
    const problems = [];
    const evidence = {};
    const lintRequired = track !== 'static-html';
    if (track === 'auto') {
      problems.push('verify requires an explicit --track; auto is detection-only');
    } else if (track === 'static-html') {
      const validation = validateStatic(root, typeof args.prototype === 'string' ? args.prototype : '');
      problems.push(...validation.problems);
      evidence.static = validation.evidence;
    } else if (track === 'nextjs-component') {
      if (result.framework !== 'nextjs') problems.push('track "nextjs-component" requires a Next.js project with React and component code');
      if (result.stack !== 'shadcn' && result.stack !== 'tailwind') problems.push('track "nextjs-component" requires Tailwind and shadcn evidence');
      const validation = validateNext(root, typeof args.prototype === 'string' ? args.prototype : '');
      problems.push(...validation.problems);
      evidence.next = validation.evidence;
    }
    if (lintRequired && (result.stack === 'shadcn' || result.stack === 'tailwind') && result.lint !== 'configured') {
      problems.push(`stack "${result.stack}" chosen but @shadcn/lint is not configured — read https://github.com/shadcn-ui/lint/blob/main/SETUP.md and set it up`);
    }
    const out = { ...result, lintRequired, evidence, pass: problems.length === 0, problems };
    if (args.json) console.log(JSON.stringify(out, null, 2));
    else {
      if (out.pass && track === 'static-html') console.log('shadcn_gate verify: PASS — static-html track; @shadcn/lint is not applicable');
      else if (out.pass) console.log(`shadcn_gate verify: PASS — ${track} track; stack ${result.stack}, lint ${result.lint}`);
      else for (const p of problems) console.error(`  ✗ ${p}`);
    }
    process.exit(out.pass ? 0 : 1);
  }

  console.error('Usage:\n  node shadcn_gate.js detect [--root R] [--track auto|static-html|nextjs-component] [--json]\n  node shadcn_gate.js verify --track static-html|nextjs-component [--root R] [--prototype FILE] [--json]');
  process.exit(2);
}

if (require.main === module) main();

module.exports = { detect };
