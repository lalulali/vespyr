const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('NPX Package Files Manifest Audit', () => {
  const pkgPath = path.join(__dirname, '..', '..', 'package.json');

  it('package.json contains bin/ and .agents/ in files array', () => {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    assert.ok(Array.isArray(pkg.files), 'package.json must contain files array');
    assert.ok(pkg.files.includes('bin/'), 'files array must include "bin/"');
    assert.ok(pkg.files.includes('.agents/'), 'files array must include ".agents/"');
  });

  it('verifies all modular helpers exist under bin/lib/', () => {
    const binLibDir = path.join(__dirname, '..', '..', 'bin', 'lib');
    assert.strictEqual(fs.existsSync(binLibDir), true);
    assert.strictEqual(fs.existsSync(path.join(binLibDir, 'detector.js')), true);
    assert.strictEqual(fs.existsSync(path.join(binLibDir, 'prompts.js')), true);
    assert.strictEqual(fs.existsSync(path.join(binLibDir, 'transpilers.js')), true);
  });

  it('verifies bin/cli.js is executable and can be required as a module', () => {
    const cli = require('../../bin/cli.js');
    assert.ok(typeof cli.parseFlags === 'function');
    assert.ok(typeof cli.detectState === 'function');
  });
});
