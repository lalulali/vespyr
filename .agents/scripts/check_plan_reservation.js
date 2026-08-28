#!/usr/bin/env node
/**
 * check_plan_reservation.js — Dev-plan number reservation check (02o.5)
 *
 * Every plan file in artifacts/docs/strategy/development-plan/ matching
 * ^\d{2}[a-z]?- must have a row in the Plan Registry section of that
 * directory's README.md. A plan number referenced anywhere without a
 * committed file + registry row is an unreserved claim — the exact failure
 * that let the 2026-08-28 concurrent session renumber the 02-series
 * silently.
 *
 * Exit 0 = all plan files registered. Exit 1 = unregistered files listed.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DIR = path.join(process.cwd(), 'artifacts', 'docs', 'strategy', 'development-plan');
const README = path.join(DIR, 'README.md');

function main() {
  if (!fs.existsSync(DIR) || !fs.existsSync(README)) {
    console.error('check_plan_reservation: development-plan dir or README.md missing');
    process.exit(1);
  }
  const files = fs.readdirSync(DIR)
    .filter(f => /^\d{2}[a-z]?-.*\.md$/.test(f))
    .sort();
  const readme = fs.readFileSync(README, 'utf8');

  const missing = files.filter(f => !readme.includes(f));
  if (missing.length > 0) {
    console.error('Unregistered plan file(s) — add each to the Plan Registry in development-plan/README.md:');
    for (const f of missing) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`✓ plan reservation check: ${files.length} plan files, all registered`);
  process.exit(0);
}

main();
