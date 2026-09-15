'use strict';
/** 02o.5 — Plan-number reservation: every 0N[X]-*.md plan file must have a
 *  Plan Registry row in development-plan/README.md (named check script +
 *  named test per the 08-23 determinism ruling). */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');

// 08-isolation: the dev-plan registry lives in the owner-only artifacts
// workspace, which is untracked after the private-workspace split. A fresh
// clone / CI checkout has no artifacts/ — the registry is then not
// machine-checkable here, so skip loudly rather than failing red. Coverage
// moves to the private repo's own CI (08 plan, Phase 0.2).
const PLAN_DIR = path.join(REPO, 'artifacts', 'docs', 'strategy', 'development-plan');

test('02o.5: plan reservation check passes on the current tree', (t) => {
  if (!fs.existsSync(PLAN_DIR)) {
    return t.skip('private workspace absent (post-purge clone) — registry verified in private-repo CI');
  }
  const out = execFileSync(process.execPath, [
    path.join(REPO, '.agents', 'scripts', 'check_plan_reservation.js')
  ], { encoding: 'utf8', cwd: REPO });
  assert.match(out, /plan files, all registered/);
});
