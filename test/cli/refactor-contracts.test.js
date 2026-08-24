const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

// 02h §10 A2b verification fixtures (architect round F1–F7 closure):
// interactive-render contract, dry-run purity, registry-driven uninstall dispatch.
const repoRoot = path.join(__dirname, '..', '..', '');
const CLI = path.join(repoRoot, 'bin', 'cli.js');

describe('extraction contract fixtures', () => {
	it('interactive-render smoke: every ui fn executes without ReferenceError', () => {
		const { createUi } = require('../../bin/lib/ui.js');
		const ui = createUi({
			VERSION: 'test', ASCII_ART: 'art',
			IS_TTY: false,
			wizardState: { harnesses: ['opencode'], scope: 'Project-level', target: '/x', method: 'symlink', name: 'T' },
		});
		assert.doesNotThrow(() => { ui.clearScreen(); });
		assert.doesNotThrow(() => { ui.printWizardSummary(); });
	});

	it('dry-run e2e: exit 0 and ZERO writes into target', () => {
		const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-dry-'));
		try {
			const out = execFileSync(process.execPath, [CLI, 'init', '--target', target, '--harness', 'opencode,claude,kiro', '--yes', '--dry-run'], { stdio: 'pipe' });
			assert.ok(out.toString().includes('[DRY RUN]'));
			const created = fs.readdirSync(target);
			assert.deepStrictEqual(created, [], `dry-run must not write anything, found: ${created}`);
		} finally {
			fs.rmSync(target, { recursive: true, force: true });
		}
	});

	it('uninstall dispatches through the adapter registry (per-shape sweep)', () => {
		const cli = require('../../bin/cli.js');
		for (const shape of ['opencode', 'claude', 'kiro', 'github', 'cursor', 'windsurf']) {
			const dir = fs.mkdtempSync(path.join(os.tmpdir(), `vespyr-un-${shape}-`));
			try {
				execFileSync(process.execPath, [CLI, 'init', '--target', dir, '--harness', shape, '--yes'], { stdio: 'pipe' });
				cli.uninstallHarnesses(dir, [shape], false);
				const residue = fs.readdirSync(dir).filter((f) =>
					f.startsWith(`.${shape === 'github' ? 'github' : shape}`));
				assert.deepStrictEqual(residue, [], `${shape}: artifacts must be swept`);
			} finally {
				fs.rmSync(dir, { recursive: true, force: true });
			}
		}
	});

	it('--harness validation rejects unknown ids', () => {
		const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-h-'));
		try {
			let failed = false;
			try {
				execFileSync(process.execPath, [CLI, 'init', '--target', target, '--harness', 'nope', '--yes'], { stdio: 'pipe' });
			} catch (e) {
				failed = e.status === 1 && e.stderr.toString().includes('Unknown harness: nope');
			}
			assert.ok(failed, 'unknown harness must exit 1 with named error');
		} finally {
			fs.rmSync(target, { recursive: true, force: true });
		}
	});
});
