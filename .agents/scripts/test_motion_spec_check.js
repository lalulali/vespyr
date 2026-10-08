#!/usr/bin/env node
/**
 * test_motion_spec_check.js — LAUNCHER. The tests live in tests/test_motion_spec_check.test.js.
 *
 * This file used to BE the suite: 9 hand-rolled checks with their own `runTest()` counter
 * and `prompt()`/`spec()` builders, named `test_*.js` and sitting in `.agents/scripts/`.
 * `tests/run-all.js` only collects `*.test.js` under `tests/`, so none of it ran — not in
 * `npm test`, not in CI. A test suite that never executes protects nothing, and its blind
 * spot was measurable: the `/motion` Phase 3 gate returned exit 0 on a repo with no motion
 * spec at all (reason string: "motion not in scope"), and the property check trusted a
 * prompt's declared `Property(ies)` label while ignoring keyframes that animated `height`
 * and `box-shadow`. Both are now fixed and covered.
 *
 * This path is still referenced by `.agents/manifest.json`, so the file stays — as a
 * launcher. Keeping a second implementation here would just re-introduce drift, which is
 * how the original orphan went unnoticed in the first place.
 */

'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const SUITE = path.join(__dirname, '..', '..', 'tests', 'test_motion_spec_check.test.js');

const res = spawnSync(process.execPath, ['--test', SUITE], { stdio: 'inherit' });
process.exit(res.status === null ? 1 : res.status);