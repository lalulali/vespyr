#!/usr/bin/env node
/**
 * step0_staleness.js — Step-0 staleness gate for /design (02n.1).
 *
 * Wraps `spec_parity.js baseline check` into the deterministic Step-0 hook:
 *   exit 0  → proceed  (baseline hash fresh, or absent — nothing frozen yet)
 *   exit 1  → BLOCK    (stale / baseline hash field missing on a frozen report / broken)
 *
 * Fail-loud contract (DoD 3): if this script or spec_parity.js cannot run,
 * the Step-0 prompt must HALT — a bypass is a correctness failure, not a skip.
 *
 * Usage:
 *   node .agents/scripts/step0_staleness.js [--report P] [--inventory P] [--root R] [--json]
 */
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCRIPT = process.env.SPEC_PARITY_SCRIPT || path.join(__dirname, 'spec_parity.js');

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

function block(reason) {
  console.error(`[BLOCK] Step-0 staleness gate: ${reason}`);
  console.error('Fix: restore the frozen prototype, or run the step-05d Spike Rollback to re-extract and re-record the baseline hash.');
  process.exit(1);
}

function main() {
  const argv = process.argv.slice(2);

  // `--help` executed the check. Measured: a blind run probing this script's usage got
  // `[OK] Step-0 staleness baseline hash: absent` and could not tell a result from a usage line.
  // A script whose usage probe returns a verdict is a script nobody probes correctly.
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('step0_staleness — freeze/verify the prototype baseline hash before Step 0');
    console.log('');
    console.log('Usage: node step0_staleness.js [--report P] [--inventory P] [--root R] [--json]');
    console.log('');
    console.log('  --report P    where to write the parity report (default artifacts/output/03-strategy/parity-report.md)');
    console.log('  --inventory P prototype inventory to hash (default artifacts/output/03-strategy/prototype-inventory.md)');
    console.log('  --root R      project root (default: cwd)');
    console.log('  --json        machine-readable result');
    console.log('  --help        this message');
    process.exit(0);
  }

  const args = parseArgs(argv);
  const json = Boolean(args.json);

  if (!fs.existsSync(SCRIPT)) {
    block('spec_parity.js is missing — refusing to proceed silently.');
  }

  const cli = [SCRIPT, 'baseline', 'check', '--json'];
  if (args.report) cli.push('--report', String(args.report));
  if (args.inventory) cli.push('--inventory', String(args.inventory));
  if (args.root) cli.push('--root', String(args.root));

  const res = spawnSync(process.execPath, cli, { encoding: 'utf8' });
  if (res.status !== 0 && res.status !== 1) {
    block(`staleness check crashed (exit ${res.status})${res.stderr ? ` — ${res.stderr.trim()}` : ''}`);
  }

  let out;
  try {
    out = JSON.parse(res.stdout);
  } catch {
    block('staleness check produced unparsable output — refusing to proceed.');
  }

  if (!out.ok) {
    block(out.reason || 'baseline hash is not fresh');
  }

  if (json) {
    console.log(JSON.stringify({ ok: true, baseline: out.baseline, report: out.report }, null, 2));
  } else {
    console.log(`[OK] Step-0 staleness baseline hash: ${out.baseline}`);
  }
  process.exit(0);
}

main();
