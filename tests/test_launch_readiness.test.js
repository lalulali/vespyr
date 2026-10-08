'use strict';
/**
 * test_launch_readiness.test.js — `/launch`'s pre-launch gate.
 *
 * WHY THIS FILE EXISTS
 * `/launch` shipped no mechanical gate at all. Its readiness checklist said "Security review
 * completed" and "Performance benchmarks within thresholds" — neither falsifiable, neither with an
 * exit code. Two concrete gaps were found by measurement rather than opinion:
 *
 * 1. **`security-scan.js` was invoked by zero skills.** A real scanner, an 11-rule spec including
 *    `INJ-SECRET`, and nothing in the pipeline called it. A hardcoded credential is not a launch
 *    checklist row; it is an incident.
 * 2. **The prerequisites were prose.** "qa-signoff.md exists with GO/CONDITIONAL" is literally a
 *    mechanical check and nothing performed it, despite being a named hard NO-GO.
 *
 * The scanner's own calibration was a third finding, fixed in `security/audit-spec.json`: it fired
 * 129 times on this repo, 19 of them on its own adversarial corpus (`evals/security/corpus/**`),
 * and 91 of those on absolute filesystem paths that match its base64 pattern because they are 40+
 * alphanumerics and slashes. A gate that always fires is a gate nobody reads.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, '.agents/scripts/launch_readiness_check.js');

const READY = (rows) => `# Release Readiness

Plain sentence: the feature is ready to ship.

## UTTERLY SATISFIED team gate

| Reviewer | Disposition | Evidence |
|---|---|---|
${rows}

## Notes

Nothing outstanding.
`;

const ALL_SATISFIED = `| @product-manager | \`SATISFIED\` | readiness reviewed |
| @tech-lead | \`SATISFIED\` | plan approved |
| @qa-engineer | \`SATISFIED\` | qa-signoff.md |
| @security-engineer | \`SATISFIED\` | scan clean |
| @devops-engineer | \`SATISFIED\` | rollback rehearsed |`;

const SIGNOFF_GO = `# QA Sign-off

**Verdict:** \`VERDICT: [GO]\`

## Conditions

| # | Condition | Owner | Due | Blocking? |
|---|---|---|---|---|
| — | — | — | — | — |

## Open findings carried forward

| Finding | Severity | Owner | Notes |
|---|---|---|---|
| — | — | — | — |
`;

const SIGNOFF_CONDITIONAL = SIGNOFF_GO
  .replace('[GO]', '[CONDITIONAL]')
  .replace('| — | — | — | — | — |', '| C1 | PDF export fails above 500 rows | @developer | 2026-11-01 | yes |');

const GO_NOGO = `# Go/No-Go

**Verdict:** GO — the scan is clean and two conditions are tracked with owners.
`;

function run(files, args = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'launchready-'));
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body, 'utf8');
  }
  let code = 0;
  let out = '';
  try {
    out = execFileSync('node', [SCRIPT, 'check', '--root', dir, '--json', ...args], { encoding: 'utf8' });
  } catch (e) { code = e.status; out = `${e.stdout || ''}${e.stderr || ''}`; }
  fs.rmSync(dir, { recursive: true, force: true });
  let j = {};
  try { j = JSON.parse(out); } catch { /* non-JSON */ }
  return { code, json: j, failures: j.failures || [], warnings: j.warnings || [] };
}

const COMPLETE = {
  'artifacts/output/06-launch/release-readiness.md': READY(ALL_SATISFIED),
  'artifacts/output/06-launch/go-nogo-decision.md': GO_NOGO,
  'artifacts/output/05-execution/quality/qa-signoff.md': SIGNOFF_GO,
};

// --- absence ------------------------------------------------------------------------------

test('an absent readiness record is a SKIP by default', () => {
  const r = run({});
  assert.strictEqual(r.code, 0);
  assert.strictEqual(r.json.skipped, true);
});

test('--require-readiness turns absence into a FAILURE and never reports ok:true', () => {
  const r = run({}, ['--require-readiness']);
  assert.strictEqual(r.code, 1);
  assert.strictEqual(r.json.ok, false);
  assert.notStrictEqual(r.json.skipped, true);
  assert(r.failures.length > 0, 'a required-but-absent record must still populate failures');
});

// --- the team gate, which was prose on a page nobody could falsify --------------------------

test('a complete readiness record passes the prerequisite checks', () => {
  const r = run(COMPLETE);
  const nonScan = r.failures.filter((f) => !/security scan/.test(f));
  assert.deepStrictEqual(nonScan, [], `prerequisite failures: ${JSON.stringify(nonScan)}`);
});

test('no team-gate table at all is a failure, not an implicit pass', () => {
  // "Verified" is not the same as "absent" — an empty gate is the easiest state to ship.
  const r = run({ ...COMPLETE, 'artifacts/output/06-launch/release-readiness.md': '# Release Readiness\n\nLooks fine.\n' });
  assert(r.failures.some((f) => /no UTTERLY SATISFIED team gate table/.test(f)), JSON.stringify(r.failures));
});

test('an unresolved BLOCKED reviewer is a hard NO-GO', () => {
  const rows = ALL_SATISFIED.replace('| @security-engineer | `SATISFIED` | scan clean |',
    '| @security-engineer | `BLOCKED` | needs a decision on the rate limit |');
  const r = run({ ...COMPLETE, 'artifacts/output/06-launch/release-readiness.md': READY(rows) });
  assert(r.failures.some((f) => /unresolved .*BLOCKED/.test(f) && /security-engineer/.test(f)), JSON.stringify(r.failures));
});

test('an unresolved CHANGES REQUESTED is a hard NO-GO', () => {
  const rows = ALL_SATISFIED.replace('| @tech-lead | `SATISFIED` | plan approved |',
    '| @tech-lead | `CHANGES REQUESTED` | estimate still optimistic |');
  const r = run({ ...COMPLETE, 'artifacts/output/06-launch/release-readiness.md': READY(rows) });
  assert(r.failures.some((f) => /CHANGES REQUESTED/.test(f)), JSON.stringify(r.failures));
});

test('a NOT ACTIVATED reviewer needs a specific out-of-scope reason', () => {
  // Blanket deactivation is how a gate gets quietly emptied.
  const bare = `| @ml-ai-ops | \`NOT ACTIVATED\` | |`;
  const r = run({ ...COMPLETE, 'artifacts/output/06-launch/release-readiness.md': READY(
    ALL_SATISFIED.split('\n').slice(0, -1).concat([bare]).join('\n')
  ) });
  assert(r.failures.some((f) => /NOT ACTIVATED without a specific out-of-scope reason/.test(f)), JSON.stringify(r.failures));

  const ok = READY(ALL_SATISFIED.split('\n').slice(0, -1)
    .concat(['| @ml-ai-ops | `NOT ACTIVATED` | out of scope: no model in this release |']).join('\n'));
  const r2 = run({ ...COMPLETE, 'artifacts/output/06-launch/release-readiness.md': ok });
  assert(!r2.failures.some((f) => /NOT ACTIVATED without/.test(f)), 'a reason must satisfy the check');
});

// --- the sign-off ------------------------------------------------------------------------------

test('a missing qa-signoff.md fails — it is a named hard NO-GO', () => {
  const files = { ...COMPLETE };
  delete files['artifacts/output/05-execution/quality/qa-signoff.md'];
  const r = run(files);
  assert(r.failures.some((f) => /qa-signoff\.md is absent/.test(f)), JSON.stringify(r.failures));
});

test('a [NO-GO] sign-off cannot launch', () => {
  const r = run({ ...COMPLETE, 'artifacts/output/05-execution/quality/qa-signoff.md': SIGNOFF_GO.replace('[GO]', '[NO-GO]') });
  assert(r.failures.some((f) => /\[NO-GO\]/.test(f)), JSON.stringify(r.failures));
});

test('a CONDITIONAL sign-off needs owned and dated conditions', () => {
  const good = run({ ...COMPLETE, 'artifacts/output/05-execution/quality/qa-signoff.md': SIGNOFF_CONDITIONAL });
  assert(!good.failures.some((f) => /condition/.test(f)), JSON.stringify(good.failures));

  const unowned = SIGNOFF_CONDITIONAL.replace('@developer', 'someone');
  const r = run({ ...COMPLETE, 'artifacts/output/05-execution/quality/qa-signoff.md': unowned });
  assert(r.failures.some((f) => /no owner/.test(f)), JSON.stringify(r.failures));
});

// --- the go/no-go record ------------------------------------------------------------------------

test('a missing or verdict-less go-nogo-decision.md fails', () => {
  const files = { ...COMPLETE };
  delete files['artifacts/output/06-launch/go-nogo-decision.md'];
  const r = run(files);
  assert(r.failures.some((f) => /go-nogo-decision\.md is absent/.test(f)), JSON.stringify(r.failures));

  const silent = run({ ...COMPLETE, 'artifacts/output/06-launch/go-nogo-decision.md': '# Go/No-Go\n\nstill thinking about it\n' });
  assert(silent.failures.some((f) => /states no verdict/.test(f)), JSON.stringify(silent.failures));
});

// --- the scanner ------------------------------------------------------------------------------

test('the scan is reported, and a missing rule table is never read as clean', () => {
  const r = run(COMPLETE);
  assert.strictEqual(r.json.scan.ran, false, 'no spec in a temp tree, so the scan cannot run');
  assert(r.warnings.some((w) => /security scan not run/.test(w)),
    `absence of a scan must be announced: ${JSON.stringify(r.warnings)}`);
});

test('--require-scan turns an unrunnable scan into a failure', () => {
  const r = run(COMPLETE, ['--require-scan']);
  assert(r.failures.some((f) => /security scan was required but did not run/.test(f)), JSON.stringify(r.failures));
});

test('a scanner FAILURE is fail-closed, never read as clean', () => {
  // The rule that matters most: "no answer" must not become "no findings".
  const src = fs.readFileSync(SCRIPT, 'utf8');
  assert.match(src, /A scanner failure is never read as clean/);
  // Exit 2 must be routed to `failures` unconditionally, not gated on --require-scan.
  assert.match(src, /failures\.push\(f\);/);
  // The findings branch (exit 1) MAY be downgraded to a warning without --require-scan.
  // The tool-failure branch (exit 2) may NOT: `failures.push(f);` there is unconditional.
  const exit2Block = src.slice(src.indexOf('} else {', src.indexOf('scan.code === 1')));
  const exit2Body = exit2Block.slice(0, exit2Block.indexOf('} else if'));
  assert.match(exit2Body, /failures\.push\(f\)/,
    'exit 2 must go straight to failures');
  assert.ok(!/requireScan/.test(exit2Body),
    'a tool failure must not be downgradable to a warning by any flag');
});

test('the scanner is actually invoked now — it was called by zero skills before', () => {
  const step = fs.readFileSync(path.join(ROOT, '.agents/skills/launch/steps/step-01-readiness-check.md'), 'utf8');
  assert.match(step, /launch_readiness_check\.js check --root \. --require-readiness --require-scan/);
  assert.match(step, /security-scan\.js check\` exits 0/,
    '"Security review completed" is not falsifiable by anyone reading the file');
  const skill = fs.readFileSync(path.join(ROOT, '.agents/skills/launch/SKILL.md'), 'utf8');
  assert.match(skill, /launch_readiness_check\.js check --require-readiness --require-scan` exits 0/);
});

// --- the scanner's own calibration ---------------------------------------------------------------

test('the scanner no longer fires on its own adversarial corpus', () => {
  const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'security/audit-spec.json'), 'utf8'));
  const globs = spec.known_fp_excludes.rules;
  const corpusRules = Object.entries(globs).filter(([, g]) => g.some((x) => /evals\/security\/(corpus|held_out)/.test(x)));
  assert(corpusRules.length === Object.keys(globs).length,
    `every rule must exclude the eval corpus, or the gate fires on its own fixtures: ${corpusRules.length} of ${Object.keys(globs).length}`);
  assert.match(spec.known_fp_excludes.note, /cannot distinguish a long path from base64/,
    'the INJ-OBFUSC calibration problem is named, not hidden');
  assert(globs['INJ-OBFUSC'].some((g) => g.includes('*.ndjson')),
    'absolute paths in telemetry logs are data, not obfuscation');
});

test('the routing table names every item, including the four with no owner', () => {
  const r = fs.readFileSync(path.join(ROOT, '.agents/references/launch-preflight-routing.md'), 'utf8');
  for (const item of ['hardcoded secret', 'missing auth', 'payment flow', 'N+1', 'unhandled error',
    'mobile friendly', 'loading + empty states', 'RLS', 'dead code', 'rate limit', 'privacy policy',
    'meta tags', 'sitemap', 'form accessible', 'error tracking', 'analytics event', 'onboarding emails',
    'senior dev', 'slow pages', 'README']) {
    assert.ok(r.toLowerCase().includes(item.toLowerCase()), `routing omits: ${item}`);
  }
  assert.match(r, /NO OWNER/);
  assert.match(r, /legal-safety-audit/,
    'the privacy policy belongs to a separate skill; duplicating it in /launch is the routing error');
  const step = fs.readFileSync(path.join(ROOT, '.agents/skills/launch/steps/step-01-readiness-check.md'), 'utf8');
  assert.match(step, /launch-preflight-routing\.md/,
    'a routing table nothing reads routes nothing');
});

/**
 * Product-code scope + reviewed allowlist, wired end-to-end from the launch gate.
 *
 * The gate originally spawned the scanner with no way to reach `--allowlist-file`, so findings a
 * human had already read and accepted came back as blockers. The pressure that creates is the
 * dangerous part: a maintainer who wants green has a reason to delete reviewed fixtures.
 *
 * Guarded here:
 *   - the allowlist is reachable, and OMITTING it is fail-closed (unfiltered = more findings);
 *   - a named-but-missing allowlist never silently degrades into "no allowlist";
 *   - the scan's scope travels with the result, so `ok` can never be read as "the repo passed".
 */
const SCOPE_SPEC = JSON.stringify({
  version: '1.0.0',
  schema: 'security-audit-spec/1',
  pattern_table: [{ harness_dir: 'opencode', config_files: ['**/opencode.json'], scope: 'T0' }],
  pin_store: { npm: [], github_refs: [] },
  rules: [{
    id: 'T-1', label: 'T', path: '**/*.md',
    pattern: 'AKIAIOSFODNN7EXAMPLE', severity: 'high', mode: 'regex', note: 'fixture',
  }],
  scope: {
    product_roots: ['artifacts'],
    root_files: ['security/audit-spec.json'],
    excluded_trees: [{ path: 'artifacts/legacy/**', reason: 'historical output, not shipped' }],
  },
}, null, 2);

const SCOPE_FILES = {
  ...COMPLETE,
  'security/audit-spec.json': SCOPE_SPEC,
  'security/reviewed-allowlist.json': JSON.stringify({ rules: { 'T-1': ['artifacts/app.md'] } }, null, 2),
  'artifacts/app.md': 'key AKIAIOSFODNN7EXAMPLE\n',
  'artifacts/legacy/old.md': 'key AKIAIOSFODNN7EXAMPLE\n',
};

test('a declared excluded_tree is ENFORCED by the scanner behind the gate', () => {
  const r = run(SCOPE_FILES, ['--require-scan', '--scan-allowlist', 'security/reviewed-allowlist.json']);
  assert.strictEqual(r.json.scan.findings, 0);
  assert.deepStrictEqual(r.json.scan.scope.excluded_by_tree, { 'artifacts/legacy/**': 1 },
    'the excluded tree must be removed by the glob itself, not merely declared');
});

test('omitting --scan-allowlist is fail-closed: the reviewed finding returns', () => {
  const r = run(SCOPE_FILES, ['--require-scan']);
  assert.strictEqual(r.json.scan.findings, 1, 'without an allowlist the finding must still fire');
  assert.strictEqual(r.json.scan.allowlist, undefined);
  assert.strictEqual(r.code, 1, 'an unallowlisted finding must block the launch gate');
});

test('--scan-allowlist reaches the scanner and is named in the report', () => {
  const r = run(SCOPE_FILES, ['--require-scan', '--scan-allowlist', 'security/reviewed-allowlist.json']);
  assert.strictEqual(r.json.scan.allowlist, 'security/reviewed-allowlist.json');
  assert.strictEqual(r.json.scan.scope.applied, true);
  assert.deepStrictEqual(r.json.scan.scannedScope, ['artifacts']);
});

test('a named-but-missing allowlist is reported and never read as clean', () => {
  const r = run(SCOPE_FILES, ['--require-scan', '--scan-allowlist', 'security/nope.json']);
  assert.match(r.json.scan.reason || '', /allowlist named but missing/);
  assert.strictEqual(r.json.scan.ran, false);
  assert.strictEqual(r.code, 1);
});

test('the scan scope reaches the report even when the gate is skipped', () => {
  const r = run({});
  assert.strictEqual(r.json.verdict, 'SKIPPED',
    'ok:true on a skip must be distinguishable from a pass by a consumer reading one field');
});
