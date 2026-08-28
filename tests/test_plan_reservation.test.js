'use strict';
/** 02o.5 — Plan-number reservation: every 0N[X]-*.md plan file must have a
 *  Plan Registry row in development-plan/README.md (named check script +
 *  named test per the 08-23 determinism ruling). */

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');

test('02o.5: plan reservation check passes on the current tree', () => {
  const out = execFileSync(process.execPath, [
    path.join(REPO, '.agents', 'scripts', 'check_plan_reservation.js')
  ], { encoding: 'utf8', cwd: REPO });
  assert.match(out, /plan files, all registered/);
});
