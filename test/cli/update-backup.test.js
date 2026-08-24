const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

// 02h §10 B1-B3 evidence fixture: update-mode .bak-YYYYMMDD preservation of
// customized files, no backup noise for untouched files.
describe('update-mode customized-file backups (.bak-YYYYMMDD)', () => {
	let target;
	const CLI = path.join(__dirname, '..', '..', 'bin', 'cli.js');

	beforeEach(() => {
		target = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-bak-'));
		execFileSync(process.execPath, [CLI, 'init', '--target', target, '--harness', 'opencode', '--yes'], { stdio: 'pipe' });
	});

	it('backs up customized files and skips unmodified ones on update', () => {
		const skillPath = path.join(target, '.agents', 'skills', 'shut-up', 'SKILL.md');
		const untouchedPath = path.join(target, '.agents', 'GUARDRAILS.md');
		assert.ok(fs.existsSync(skillPath), 'precondition: shipped file present');

		const customContent = '# my local customization\n';
		fs.writeFileSync(skillPath, customContent);

		execFileSync(process.execPath, [CLI, 'update', '--target', target, '--yes'], { stdio: 'pipe' });

		const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
		const bakPath = `${skillPath}.bak-${today}`;

		assert.ok(fs.existsSync(bakPath), 'customized file must be backed up with .bak-YYYYMMDD suffix');
		assert.strictEqual(fs.readFileSync(bakPath, 'utf8'), customContent, 'backup must preserve the customization verbatim');
		assert.ok(fs.existsSync(skillPath), 'customized file must still be replaced by the shipped version');

		const residue = fs.existsSync(untouchedPath)
			? fs.readdirSync(path.dirname(untouchedPath)).filter((f) => f.startsWith('GUARDRAILS.md.bak'))
			: [];
		assert.deepStrictEqual(residue, [], 'unmodified files must not generate backup noise');
	});
});
