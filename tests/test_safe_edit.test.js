'use strict';

/**
 * Tests for lib/safe_edit.js and the migration scripts that use it.
 *
 * WHY THIS FILE EXISTS
 * On 2026-09-30 an audit found five one-shot migration scripts that located
 * their insertion point with an anchor and then called `content.replace(anchor, …)`.
 * `String.prototype.replace` returns the ORIGINAL STRING UNCHANGED when the
 * search string is absent. So a file missing the anchor was rewritten
 * byte-identical, the script printed `OK: <name>`, and it incremented its
 * success counter.
 *
 * Proven, not theorised: `add-socratic-stance.js` was pointed at an agent file
 * with no `## Delegation Contract` heading. It printed
 * "OK: architect / Added Socratic Stance to 1 agent(s)." and the file's SHA-256
 * was identical before and after.
 *
 * These tests pin the fix. Each one fails against the old code.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SCRIPTS = path.join(ROOT, '.agents', 'scripts');
const SAFE_EDIT = path.join(SCRIPTS, 'lib', 'safe_edit.js');
const { insertBefore, insertAfter, replaceAnchor, editFile, countOccurrences, anchorProblem } = require(SAFE_EDIT);

const MIGRATIONS = [
  'add-socratic-stance.js',
  'add-citation-protocol.js',
  'add-step-tracker-calls.js',
  'add-pipeline-bookkeeping.js',
  'add-identity-block.js',
];

// ---------------------------------------------------------------------------
// The helper
// ---------------------------------------------------------------------------

test('SAFE-1: insertBefore fails when the anchor is missing, and does not fabricate content', () => {
  const before = '# Doc\n\nsome body\n';
  const r = insertBefore(before, '## Delegation Contract', 'BLOCK\n\n');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'anchor-missing');
  assert.strictEqual(r.content, before, 'content must be returned untouched on failure');
  assert.strictEqual(r.changed, false);
});

test('SAFE-2: insertBefore inserts at the anchor when it is present', () => {
  const r = insertBefore('a\n## Delegation Contract\nb\n', '## Delegation Contract', 'BLOCK\n\n');
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.content, 'a\nBLOCK\n\n## Delegation Contract\nb\n');
});

test('SAFE-3: an ambiguous anchor is a failure, not a guess', () => {
  // A migration that picks one of two identical headings is a coin flip, and the
  // wrong pick is invisible in the diff until someone reads the whole file.
  const doc = '## Process\nx\n## Process\ny\n';
  const r = insertBefore(doc, '## Process', 'Z\n', {});
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /anchor-ambiguous/);
  // Explicit opt-in still works for callers who know what they want.
  const all = insertBefore(doc, '## Process', 'Z\n', { all: true });
  assert.strictEqual(all.ok, true);
});

test('SAFE-4: an edit that changes nothing is a failure', () => {
  // The second silent-no-op: the replace "succeeded" but produced identical
  // bytes. Reporting OK there is the same lie as the missing-anchor case.
  const doc = 'a\nb\n';
  const r = insertAfter(doc, 'b', '');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'no-change');
});

test('SAFE-5: insertAfter anchors on the LAST occurrence', () => {
  // Uniqueness still applies: a repeated marker is a file the caller has not
  // thought about, and guessing which one is "last" is how the wrong heading
  // gets the block. Opt in explicitly with { all: true }.
  const ambiguous = insertAfter('x\nMARK\ny\nMARK\nz\n', 'MARK', '!');
  assert.strictEqual(ambiguous.ok, false);
  assert.match(ambiguous.reason, /anchor-ambiguous/);

  const r = insertAfter('x\nMARK\ny\nMARK\nz\n', 'MARK', '!', { all: true });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.content, 'x\nMARK\ny\nMARK!\nz\n');

  const single = insertAfter('x\nMARK\ny\n', 'MARK', '!');
  assert.strictEqual(single.content, 'x\nMARK!\ny\n');
});

test('SAFE-6: replaceAnchor refuses an ambiguous anchor by default', () => {
  const r = replaceAnchor('a A b A c', 'A', 'B');
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /anchor-ambiguous/);
  const all = replaceAnchor('a A b A c', 'A', 'B', { all: true });
  assert.strictEqual(all.ok, true);
  assert.strictEqual(all.content, 'a B b B c');
});

test('SAFE-7: countOccurrences and anchorProblem', () => {
  assert.strictEqual(countOccurrences('aXbXcX', 'X'), 3);
  assert.strictEqual(countOccurrences('abc', 'X'), 0);
  assert.strictEqual(anchorProblem('abc', '', false), 'no-anchor-given');
  assert.strictEqual(anchorProblem('abc', 'Q', false), 'anchor-missing');
  assert.strictEqual(anchorProblem('QQ', 'Q', false), 'anchor-ambiguous (2 matches)');
  assert.strictEqual(anchorProblem('Q', 'Q', false), null);
  assert.strictEqual(anchorProblem('QQ', 'Q', true), null, 'all:true waives the uniqueness guard');
});

// ---------------------------------------------------------------------------
// editFile: never write on a failed edit
// ---------------------------------------------------------------------------

function tmpFile(contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'safeedit-'));
  const p = path.join(dir, 'target.md');
  fs.writeFileSync(p, contents, 'utf8');
  return { dir, file: p };
}

test('SAFE-8: editFile leaves the file byte-identical when the anchor is missing', () => {
  const { file } = tmpFile('---\nname: x\n---\n\n# X\n\nno anchor here\n');
  const before = fs.readFileSync(file);
  const r = editFile(file, (c) => insertBefore(c, '## Delegation Contract', 'BLOCK\n\n'));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'anchor-missing');
  assert.strictEqual(r.changed, false);
  assert.ok(before.equals(fs.readFileSync(file)), 'file must not be rewritten on a failed edit');
});

test('SAFE-9: editFile writes when the edit succeeds, and reports the change', () => {
  const { file } = tmpFile('# X\n\n## Delegation Contract\n\nbody\n');
  const r = editFile(file, (c) => insertBefore(c, '## Delegation Contract', 'BLOCK\n\n'));
  assert.strictEqual(r.ok, true);
  assert.ok(fs.readFileSync(file, 'utf8').includes('BLOCK'));
});

test('SAFE-10: editFile reports a read failure rather than throwing', () => {
  const r = editFile(path.join(os.tmpdir(), 'definitely-not-here-' + process.pid), (c) => ({ ok: true, reason: null, content: c }));
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /read-failed/);
});

// ---------------------------------------------------------------------------
// The migration scripts themselves
// ---------------------------------------------------------------------------

test('SAFE-11: every migration script routes its write through safe_edit', () => {
  // The helper existing is not enough; the scripts must actually use it. A
  // regression that reintroduces a bare `content.replace` + `writeFileSync`
  // would otherwise be invisible.
  for (const name of MIGRATIONS) {
    const p = path.join(SCRIPTS, name);
    assert.ok(fs.existsSync(p), `${name} should exist`);
    const src = fs.readFileSync(p, 'utf8');
    assert.match(src, /require\('\.\/lib\/safe_edit'\)|require\("\.\/lib\/safe_edit"\)/, `${name} must import safe_edit`);
  }
});

test('SAFE-12: no migration script calls writeFileSync directly on a target file', () => {
  // fs.writeFileSync is still used to READ-adjacent scratch in some scripts, so
  // the check is that the direct-write call site is gone from the edit path.
  for (const name of MIGRATIONS) {
    const src = fs.readFileSync(path.join(SCRIPTS, name), 'utf8');
    const directWrites = src.match(/fs\.writeFileSync\(\s*filePath/g) || [];
    assert.strictEqual(directWrites.length, 0, `${name} still writes filePath directly; route it through editFile`);
  }
});

test('SAFE-13: the vulnerable migration scripts exit non-zero on failure', () => {
  // End-to-end: run the real script against a file with no anchor, in a scratch
  // tree, and assert it does not claim success.
  const repoScripts = SCRIPTS;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mig-e2e-'));
  fs.mkdirSync(path.join(dir, 'agents'), { recursive: true });
  fs.cpSync(path.join(repoScripts, 'lib'), path.join(dir, 'lib'), { recursive: true });
  // architect.md with NO '## Delegation Contract' anchor
  const target = path.join(dir, 'agents', 'architect.md');
  fs.writeFileSync(target, '---\nname: architect\n---\n\n# Architect\n\n## Nothing here\n', 'utf8');

  const scriptSrc = fs.readFileSync(path.join(repoScripts, 'add-socratic-stance.js'), 'utf8')
    .replace("path.resolve(__dirname, '..', 'agents')", `'${path.join(dir, 'agents')}'`);
  const scriptPath = path.join(dir, 'mig.js');
  fs.writeFileSync(scriptPath, scriptSrc, 'utf8');

  const before = fs.readFileSync(target);
  const run = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8' });
  const output = (run.stdout || '') + (run.stderr || '');

  assert.notStrictEqual(run.status, 0, 'must exit non-zero when a file cannot be migrated');
  assert.match(output, /anchor-missing/, 'must name the reason');
  assert.doesNotMatch(output, /^OK: architect$/m, 'must NOT report OK for a file it could not migrate');
  assert.ok(before.equals(fs.readFileSync(target)), 'must leave the un-migratable file byte-identical');
});

test('SAFE-14: the same script still migrates a well-formed file and exits 0', () => {
  // The control. Without this, "always fail" would pass test 13.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mig-ok-'));
  fs.mkdirSync(path.join(dir, 'agents'), { recursive: true });
  fs.cpSync(path.join(SCRIPTS, 'lib'), path.join(dir, 'lib'), { recursive: true });
  const target = path.join(dir, 'agents', 'architect.md');
  fs.writeFileSync(target, '---\nname: architect\n---\n\n# Architect\n\n## Delegation Contract\n\nbody\n', 'utf8');

  const scriptSrc = fs.readFileSync(path.join(SCRIPTS, 'add-socratic-stance.js'), 'utf8')
    .replace("path.resolve(__dirname, '..', 'agents')", `'${path.join(dir, 'agents')}'`);
  const scriptPath = path.join(dir, 'mig.js');
  fs.writeFileSync(scriptPath, scriptSrc, 'utf8');

  const run = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8' });
  const output = (run.stdout || '') + (run.stderr || '');
  assert.strictEqual(run.status, 0, `a valid file must migrate cleanly:\n${output}`);
  assert.match(output, /^OK: architect$/m);
  const after = fs.readFileSync(target, 'utf8');
  assert.match(after, /## Socratic Stance/, 'the block must actually be inserted');
  assert.ok(after.includes('## Delegation Contract'), 'the anchor must survive the insertion');
});

test('SAFE-15: safe_edit.js itself parses (a nested block comment once broke it)', () => {
  // A `/* … */` written inside the JSDoc header terminated the comment early and
  // the module failed to load — while `node --check` on the CALLING scripts still
  // passed, because the syntax error lived in the required file. So check it.
  const res = spawnSync(process.execPath, ['--check', SAFE_EDIT], { encoding: 'utf8' });
  assert.strictEqual(res.status, 0, `lib/safe_edit.js must parse:\n${res.stderr}`);
});
