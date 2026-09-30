'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(ROOT, '.agents', 'scripts', 'template_version_guard.js');

function run(args) {
  const res = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
  return { code: res.status, out: res.stdout || '', err: res.stderr || '' };
}

function tmpFile(name, body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tvg-'));
  const p = path.join(dir, name);
  fs.writeFileSync(p, body);
  return p;
}

test('TVG-1: a clean first-generation document (Version: 1) passes', () => {
  const p = tmpFile('requirements.md', [
    '# PRD',
    '**Version:** 1',
    '**Change log:**',
    '- v1: Initial draft',
    '## 1. Executive Summary',
    'Real content.',
  ].join('\n'));
  const r = run(['check', '--file', p]);
  assert.strictEqual(r.code, 0, `expected clean pass, got:\n${r.err}`);
});

test('TVG-2: a legitimately edited document (Version: 3, no leaked metadata) passes — version>1 is NOT a defect', () => {
  const p = tmpFile('requirements.md', [
    '# PRD',
    '**Version:** 3',
    '**Change log:**',
    '- v1: Initial draft',
    '- v2: Added metrics',
    '- v3: Reworked scope',
    '## 1. Executive Summary',
    'Real content.',
  ].join('\n'));
  const r = run(['check', '--file', p]);
  assert.strictEqual(r.code, 0, `version>1 must pass when no template metadata leaked, got:\n${r.err}`);
});

test('TVG-3: a document that copied the "Template Revision History" comment fails', () => {
  const p = tmpFile('requirements.md', [
    '# PRD',
    '<!-- Template Revision History (Vespyr internal — DO NOT copy into the generated document): template v5 -->',
    '**Version:** 5',
    '## 1. Executive Summary',
  ].join('\n'));
  const r = run(['check', '--file', p, '--json']);
  assert.strictEqual(r.code, 1, 'leaked template revision comment must fail');
  const failures = JSON.parse(r.out).failures.join('\n');
  assert.match(failures, /Template Revision History/);
});

test('TVG-4: a document that copied the "DO NOT copy" guard instruction fails', () => {
  const p = tmpFile('design.md', [
    '# Design',
    'DO NOT copy into the generated document',
    '**Version:** 3',
  ].join('\n'));
  const r = run(['check', '--file', p]);
  assert.strictEqual(r.code, 1, 'leaked guard instruction must fail');
});

test('TVG-5: multiple files — one leaked, one clean → overall failure names the leaked one', () => {
  const clean = tmpFile('user-stories.md', '# Stories\n**Version:** 1\n');
  const leaked = tmpFile('requirements.md', '# PRD\n<!-- Template Revision History (Vespyr internal) -->\n**Version:** 5\n');
  const r = run(['check', '--file', clean, '--file', leaked, '--json']);
  assert.strictEqual(r.code, 1);
  const parsed = JSON.parse(r.out);
  assert.strictEqual(parsed.ok, false);
  assert.match(parsed.failures.join('\n'), /requirements\.md/);
  assert.ok(!parsed.failures.join('\n').includes('user-stories.md'), 'clean file must not be flagged');
});

test('TVG-6: usage error (no --file) exits 2', () => {
  const r = run(['check']);
  assert.strictEqual(r.code, 2);
});
