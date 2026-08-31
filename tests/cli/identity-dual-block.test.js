const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// 02h §10 D2 evidence fixture: nickname updates must synchronize BOTH the
// `## [IDENTITY]` header block and the markdown-list entry in
// project-context.md (the dual-block identity contract).
describe('dual-block identity sync', () => {
	let target;
	const CLI = path.join(__dirname, '..', '..', 'bin', 'cli.js');

	beforeEach(() => {
		target = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-id-'));
	});

	function exec(args = []) {
		const { execFileSync } = require('child_process');
		execFileSync(process.execPath, [CLI, 'init', '--target', target, ...args], { stdio: 'pipe' });
	}

	it('--user-nickname writes both formats at init', () => {
		exec(['--user-nickname', 'Chris T', '--yes']);
		const ctxPath = path.join(target, 'artifacts', 'memory', 'project-context.md');
		const content = fs.readFileSync(ctxPath, 'utf8');
		assert.ok(content.includes('User Nickname: Chris T'), 'header block must carry nickname');
		assert.ok(content.includes('- **User Nickname**: Chris T'), 'markdown-list must carry nickname');
	});

	it('updateUserNickname syncs both blocks on an installed project', () => {
		exec(['--harness', 'opencode', '--yes']);
		const cli = require('../../bin/cli.js');
		cli.updateUserNickname(target, 'Beta');

		const ctxPath = path.join(target, 'artifacts', 'memory', 'project-context.md');
		const content = fs.readFileSync(ctxPath, 'utf8');
		assert.ok(content.includes('- **User Nickname**: Beta'), 'list format must update');
		assert.ok(!content.includes(': Chris T') && !content.includes(': Alpha'), 'stale nicknames must not survive in any block');
	});
});
