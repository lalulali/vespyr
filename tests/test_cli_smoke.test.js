/**
 * test_cli_smoke.test.js — End-to-end smoke regression for the exact two
 * subcommands D1 broke (Epic 02i re-audit, R-5 tail): `init` and `complete`.
 *
 * Asserts exit codes AND parsed-frontmatter counts so installer-level
 * breakage (e.g. the CRLF frontmatter miss reproduced on windows-latest at
 * a632747) can never pass as exit-code-only green again.
 *
 * Runs unskipped on every platform including win32: this fixture IS the
 * Windows regression proof for the 2.0.8 corrective release.
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const CLI = path.join(REPO_ROOT, 'bin', 'cli.js');

// Mirrors validate_frontmatter.js parseFrontmatter (CRLF-tolerant).
const FM_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---/;

describe('Suite: CLI Smoke Regression (D1 surface: init + complete)', () => {
	let tmpDir;
	let oldCwd;

	beforeEach(() => {
		oldCwd = process.cwd();
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vespyr-smoke-'));
	});

	afterEach(() => {
		process.chdir(oldCwd);
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it('init exits 0 and scaffolds >=20 agents whose frontmatter parses under LF and CRLF', () => {
		execFileSync(process.execPath, [CLI, 'init', '--yes', '--project-name', 'smoke-fixture', '--target', tmpDir], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		const agentsDir = path.join(tmpDir, '.agents', 'agents');
		assert.ok(fs.existsSync(agentsDir), 'scaffold must create .agents/agents');
		const agentFiles = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md'));
		assert.ok(agentFiles.length >= 20, `expected >=20 agent files, got ${agentFiles.length}`);

		let parsed = 0;
		for (const f of agentFiles) {
			const content = fs.readFileSync(path.join(agentsDir, f), 'utf8');
			if (FM_PATTERN.test(content)) parsed += 1;
		}
		assert.strictEqual(parsed, agentFiles.length, 'every scaffolded agent must expose frontmatter under CRLF and LF checkouts');
	});

	it('session-start -> session-write -> complete round-trips with exit 0 and intact machine fence', () => {
		execFileSync(process.execPath, [CLI, 'init', '--yes', '--project-name', 'smoke-fixture', '--target', tmpDir], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		const localOrchestrator = path.join(tmpDir, '.agents', 'scripts', 'orchestrator_state.js');
		const orchestratorScript = fs.existsSync(localOrchestrator)
			? localOrchestrator
			: path.join(REPO_ROOT, '.agents', 'scripts', 'orchestrator_state.js');
		const sandboxOpts = { cwd: tmpDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] };

		const startOut = execFileSync(process.execPath, [orchestratorScript, 'session-start', '--agent', 'qa-engineer'], sandboxOpts);
		assert.strictEqual(JSON.parse(startOut).success, true, 'session-start must succeed immediately after init');

		const writeOut = execFileSync(
			process.execPath,
			[orchestratorScript, 'session-write', '--agent', 'qa-engineer', '--worked-on', 'smoke round-trip', '--decisions', 'none'],
			sandboxOpts,
		);
		assert.strictEqual(JSON.parse(writeOut).success, true, 'session-write must succeed');

		const completeOut = execFileSync(
			process.execPath,
			[orchestratorScript, 'complete', '--agent', 'qa-engineer', '--artifact', 'smoke.md'],
			sandboxOpts,
		);
		assert.strictEqual(JSON.parse(completeOut).success, true, 'complete must succeed (D1 crash surface)');

		const context = fs.readFileSync(path.join(tmpDir, 'artifacts', 'memory', 'project-context.md'), 'utf8');
		assert.ok(context.includes('<!-- BEGIN MACHINE STATE -->'), 'machine fence must survive the round trip');
		assert.ok(context.includes('<!-- END MACHINE STATE -->'), 'machine fence must survive the round trip');
	});
});
