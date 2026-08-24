const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { writeFileSync, writeJsonSync, readJsonSync } = require('../../.agents/scripts/lib/fs_atomic.js');
const { findWorkspaceRoot } = require('../../.agents/scripts/lib/workspace.js');
const { parseFrontmatter, serializeFrontmatter } = require('../../.agents/scripts/lib/frontmatter.js');

// 02h T5.6 evidence fixture: behavioral verification of the centralized engine
// runtime helpers (.agents/scripts/lib/) that Task 5.5 adopted across scripts.
describe('.agents/scripts/lib runtime helper contracts', () => {
  let tmp;
  it('setup temp workspace', () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-lib-test-'));
    assert.ok(fs.existsSync(tmp));
  });

  describe('fs_atomic', () => {
    it('writes text through parent-dir creation and leaves zero .tmp residue', () => {
      const target = path.join(tmp, 'nested', 'dir', 'file.txt');
      writeFileSync(target, 'hello atomic');
      assert.strictEqual(fs.readFileSync(target, 'utf8'), 'hello atomic');
      const residue = fs.readdirSync(path.join(tmp, 'nested', 'dir')).filter((f) => f.includes('.tmp'));
      assert.deepStrictEqual(residue, [], 'no .tmp files may survive a successful write');
    });

    it('throws when the parent path is invalid and creates no partial output', () => {
      const blocker = path.join(tmp, 'blocker.txt');
      fs.writeFileSync(blocker, 'x');
      const badTarget = path.join(blocker, 'child', 'out.txt'); // ENOTDIR: blocker is a file
      assert.throws(() => writeFileSync(badTarget, 'y'));
      assert.strictEqual(fs.existsSync(badTarget), false, 'failed write must not materialize the target');
      const residue = fs.readdirSync(tmp).filter((f) => f.includes('.tmp'));
      assert.deepStrictEqual(residue, [], 'failed write must clean up temp files');
    });

    it('round-trips JSON with trailing newline and typed values', () => {
      const target = path.join(tmp, 'state.json');
      const data = { name: 'vespyr', count: 7, enabled: true, tags: ['a', 'b'] };
      writeJsonSync(target, data);
      const raw = fs.readFileSync(target, 'utf8');
      assert.ok(raw.endsWith('\n'), 'JSON output must end with newline');
      assert.deepStrictEqual(readJsonSync(target), data);
    });

    it('readJsonSync falls back on missing and corrupt files, throws when no fallback is allowed', () => {
      assert.strictEqual(readJsonSync(path.join(tmp, 'missing.json'), 'fb'), 'fb');
      const corrupt = path.join(tmp, 'corrupt.json');
      fs.writeFileSync(corrupt, '{not json');
      assert.strictEqual(readJsonSync(corrupt, 'fb'), 'fb');
      assert.throws(() => readJsonSync(corrupt));
    });
  });

  describe('workspace', () => {
    it('resolves the repo root from a nested directory by locating .agents/', () => {
      const repoRoot = findWorkspaceRoot(__dirname);
      assert.ok(fs.existsSync(path.join(repoRoot, '.agents')), 'resolved root must contain .agents/');
      assert.ok(path.resolve(__dirname).startsWith(repoRoot));
    });

    it('returns the start dir when no workspace marker exists above it', () => {
      const isolated = fs.mkdtempSync(path.join(os.tmpdir(), 'no-marker-'));
      const deep = path.join(isolated, 'a', 'b');
      fs.mkdirSync(deep, { recursive: true });
      assert.strictEqual(findWorkspaceRoot(deep), path.resolve(deep));
    });
  });

  describe('frontmatter', () => {
    it('parses scalars with type coercion, lists as arrays, and strips BOM', () => {
      const doc = '\uFEFF---\nname: grill-me\nversion: 2\nenabled: true\ntags:\n  - alpha\n  - beta\n---\n\nBody line one.\n';
      const parsed = parseFrontmatter(doc);
      assert.strictEqual(parsed.hasFrontmatter, true);
      assert.strictEqual(parsed.frontmatter.name, 'grill-me');
      assert.strictEqual(parsed.frontmatter.version, 2, 'numeric coercion required');
      assert.strictEqual(parsed.frontmatter.enabled, true, 'boolean coercion required');
      assert.deepStrictEqual(parsed.frontmatter.tags, ['alpha', 'beta'], 'list values must parse as arrays');
      assert.ok(parsed.body.startsWith('\nBody line one.'), 'body must follow the closing fence');
    });

    it('reports hasFrontmatter=false for documents without fences', () => {
      const parsed = parseFrontmatter('just text');
      assert.strictEqual(parsed.hasFrontmatter, false);
    });

    it('serializeFrontmatter emits a valid fence block that parses back identically', () => {
      const fm = { name: 'x', version: 3 };
      const out = serializeFrontmatter(fm, 'Body\n');
      assert.ok(out.startsWith('---\n'));
      const reparsed = parseFrontmatter(out);
      assert.strictEqual(reparsed.frontmatter.name, 'x');
      assert.strictEqual(reparsed.frontmatter.version, 3);
      assert.ok(reparsed.body.endsWith('Body\n'));
    });
  });
});
