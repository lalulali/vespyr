/**
 * test_memory_fixes.test.js — Regression fixtures for the 2026-08-25 fix loop
 * (Epic 02i reopened tasks 3.4-A1/A2, 11.4, R-5 tail, DoD #1).
 *
 * Each test maps 1:1 to a defect demonstrated live on 2026-08-25:
 *   F1  migration silently dropped ## and pre-header content (A1)
 *   F2  purge executed even when capture was partial (A1 gate)
 *   F3  divergent duplicate headers lost bodies (A1 union semantics)
 *   F4  parallel complete calls lost artifacts last-writer-wins (A2)
 *   F5  advance succeeded over the <400-token budget gate (R-5)
 *   F6  session-start clobbered human lines outside the fence (DoD #1)
 *   F7  injected context lacked the spec'd HISTORICAL_MEMORY_DATA boundary (11.4)
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const MIGRATE = path.join(REPO_ROOT, '.agents', 'scripts', 'migrate_memory_v2.js');
const ORCH = path.join(REPO_ROOT, '.agents', 'scripts', 'orchestrator_state.js');
const SESSION_START = path.join(REPO_ROOT, '.agents', 'scripts', 'session_start.js');
const MEMORY_FILTER = path.join(REPO_ROOT, '.agents', 'scripts', 'memory_filter.js');

function mkSandbox(tag) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `nina-fix-${tag}-`));
}

describe('Suite: Memory Fix Loop Regressions (2026-08-25)', () => {
	let tmpDir;
	let oldCwd;

	beforeEach(() => {
		oldCwd = process.cwd();
		tmpDir = mkSandbox('suite');
	});

	afterEach(() => {
		process.chdir(oldCwd);
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it('F1: migration preserves preamble, ## sections, and ### sections (zero loss)', () => {
		const notes = path.join(tmpDir, 'artifacts', 'memory', 'agent-notes');
		fs.mkdirSync(notes, { recursive: true });
		fs.writeFileSync(
			path.join(notes, 'developer-notes.md'),
			[
				'# Developer Notes',
				'CRITICAL-PREHEADER-CONTENT must survive migration',
				'## SubSection',
				'sub content line',
				'### Existing Header',
				'body line'
			].join('\n')
		);

		const { migrateMemory } = require(MIGRATE);
		const result = migrateMemory({ targetDir: tmpDir });

		assert.strictEqual(result.loss_check, 'pass');
		const out = fs.readFileSync(
			path.join(tmpDir, 'artifacts', 'memory', 'patterns-and-conventions.md'),
			'utf8'
		);
		for (const mustExist of [
			'# Developer Notes',
			'CRITICAL-PREHEADER-CONTENT must survive migration',
			'## SubSection',
			'sub content line',
			'body line'
		]) {
			assert.ok(out.includes(mustExist), `lost content: ${mustExist}`);
		}
	});

	it('F2: zero-loss gate aborts and refuses to purge when output would lose lines', () => {
		const memDir = path.join(tmpDir, 'artifacts', 'memory');
		const notes = path.join(memDir, 'agent-notes');
		fs.mkdirSync(notes, { recursive: true });
		fs.writeFileSync(path.join(notes, 'qa-notes.md'), '# QA Notes\nunique-line-alpha\n');

		const { migrateMemory } = require(MIGRATE);
		migrateMemory({ targetDir: tmpDir }); // first pass migrates everything

		// Simulate a hostile regression: re-seed a file whose content the
		// renderer cannot represent (binary-ish line), gate must abort.
		fs.mkdirSync(notes, { recursive: true });
		const poison = '\u0000-null-byte-line\n';
		fs.writeFileSync(path.join(notes, 'poison-notes.md'), poison);

		let failed = false;
		try {
			migrateMemory({ targetDir: tmpDir });
		} catch (err) {
			failed = err.message.startsWith('ZERO_LOSS_GATE');
		}
		assert.ok(failed, 'expected ZERO_LOSS_GATE abort');
		assert.ok(fs.existsSync(notes), 'sources must NOT be purged when the gate fails');
	});

	it('F3: divergent duplicate headers preserve both bodies as variants', () => {
		const memDir = path.join(tmpDir, 'artifacts', 'memory');
		const notes = path.join(memDir, 'agent-notes');
		fs.mkdirSync(notes, { recursive: true });
		fs.writeFileSync(
			path.join(notes, 'architect-notes.md'),
			'### Deployment\nDeploy via Vercel.\n'
		);
		fs.writeFileSync(
			path.join(notes, 'devops-notes.md'),
			'### Deployment\nDeploy via Fly.io.\n'
		);

		const { migrateMemory } = require(migratePath());
		migrateMemory({ targetDir: tmpDir });

		const out = fs.readFileSync(path.join(memDir, 'patterns-and-conventions.md'), 'utf8');
		assert.ok(out.includes('Deploy via Vercel.'), 'first body must survive');
		assert.ok(/Deployment \(variant \d+ from devops-notes\)/.test(out), 'divergent body must migrate as variant');
		assert.ok(out.includes('Deploy via Fly.io.'), 'variant body must survive');
	});

	function migratePath() {
		return MIGRATE;
	}

	it('F4: eight SIMULTANEOUS complete spawns record all eight artifacts (lock works)', () => {
		const { spawn } = require('child_process');
		execFileSync(process.execPath, [path.join(REPO_ROOT, 'bin', 'cli.js'), 'init', '--yes', '--project-name', 'conc', '--target', tmpDir], {
			encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
		});
		const localOrch = path.join(tmpDir, '.agents', 'scripts', 'orchestrator_state.js');
		const orch = fs.existsSync(localOrch) ? localOrch : ORCH;

		execFileSync(process.execPath, [orch, 'session-start', '--agent', 'qa-engineer'], { cwd: tmpDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

		const agents = ['developer', 'code-reviewer', 'architect', 'tech-lead', 'security-engineer', 'qa-engineer', 'product-manager', 'devops-engineer'];
		// TRUE parallelism: spawn all children in the same tick (execFileSync in
		// Promise.all is sequential and proves nothing — Vera's 16-way probe).
		const exits = agents.map((agent, i) => new Promise((resolve) => {
			const p = spawn(process.execPath, [orch, 'complete', '--agent', agent, '--artifact', `art-${i}.md`], { cwd: tmpDir });
			p.on('close', (code) => resolve(code));
		}));
		return Promise.all(exits).then((codes) => {
			for (const c of codes) assert.strictEqual(c, 0, `complete exited ${c}`);
			const state = JSON.parse(fs.readFileSync(path.join(tmpDir, 'artifacts', 'output', 'pipeline-state.json'), 'utf8'));
			assert.strictEqual(Object.keys(state.artifacts || {}).length, agents.length, `every artifact must be recorded (got ${Object.keys(state.artifacts || {}).length})`);
		});
	});

	it('F5: advance FAILS closed over budget with zero partial state writes, succeeds under budget', () => {
		execFileSync(process.execPath, [path.join(REPO_ROOT, 'bin', 'cli.js'), 'init', '--yes', '--project-name', 'budget', '--target', tmpDir], {
			encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
		});
		const localOrch = path.join(tmpDir, '.agents', 'scripts', 'orchestrator_state.js');
		const orch = fs.existsSync(localOrch) ? localOrch : ORCH;

		// Materialize pipeline-state.json (init scaffolds dirs; first orchestrator
		// command persists state).
		execFileSync(process.execPath, [orch, 'session-start', '--agent', 'qa-engineer'], { cwd: tmpDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

		const decisions = path.join(tmpDir, 'artifacts', 'memory', 'active-decisions.md');
		fs.writeFileSync(decisions, '# Active Decisions\n\n' +
			Array.from({ length: 60 }, (_, i) =>
				`### [SECURITY] Decision ${i} [date: 2026-08-25] [agent: @security-engineer]\nFiller rationale for budget pressure.\n**Status:** active\n`
			).join('\n'));

		const statePath = path.join(tmpDir, 'artifacts', 'output', 'pipeline-state.json');
		const beforeRaw = fs.readFileSync(statePath, 'utf8');

		let code = 0;
		try {
			execFileSync(process.execPath, [orch, 'advance'], { cwd: tmpDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
		} catch (e) {
			code = e.status;
		}
		assert.notStrictEqual(code, 0, 'advance must fail closed over budget');
		assert.strictEqual(JSON.parse(fs.readFileSync(statePath, 'utf8')).current_phase, 'validation', 'phase must NOT have advanced');
		assert.strictEqual(fs.readFileSync(statePath, 'utf8'), beforeRaw, 'pipeline state must be byte-identical after blocked advance');

		// Under-budget path still advances.
		fs.writeFileSync(decisions, '# Active Decisions\n');
		const out = JSON.parse(execFileSync(process.execPath, [orch, 'advance'], { cwd: tmpDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
		assert.strictEqual(out.success, true);
		assert.strictEqual(JSON.parse(fs.readFileSync(statePath, 'utf8')).current_phase, 'discovery');
	});

	it('F6: session-start never rewrites human lines outside the machine fence', () => {
		execFileSync(process.execPath, [path.join(REPO_ROOT, 'bin', 'cli.js'), 'init', '--yes', '--project-name', 'fence', '--target', tmpDir], {
			encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
		});
		const ctxPath = path.join(tmpDir, 'artifacts', 'memory', 'project-context.md');
		fs.writeFileSync(ctxPath, [
			'# Project Context',
			'',
			'## [MY NOTES]',
			'Phase: keepme-human',
			'Blockers: 7 human-tracked',
			'Stack: DO-NOT-TOUCH',
			'Repository: human-pinned-url'
		].join('\n'));

		execFileSync(process.execPath, [SESSION_START, '--agent', 'developer'], { cwd: tmpDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

		const after = fs.readFileSync(ctxPath, 'utf8');
		assert.ok(after.includes('keepme-human'), 'human Phase line must survive');
		assert.ok(after.includes('Blockers: 7 human-tracked'), 'human Blockers line must survive');
		assert.ok(after.includes('DO-NOT-TOUCH'), 'human Stack line must survive');
		assert.ok(after.includes('Repository: human-pinned-url'), 'human Repository line must survive');
		assert.ok(after.includes('<!-- BEGIN MACHINE STATE -->'), 'fence must exist');
		assert.ok(after.includes('- Active Phase: validation'), 'fence must carry live values');
	});

	it('F7: memory_filter wraps results in HISTORICAL_MEMORY_DATA passive boundary', () => {
		const memDir = path.join(tmpDir, 'artifacts', 'memory');
		fs.mkdirSync(memDir, { recursive: true });
		fs.writeFileSync(path.join(memDir, 'project-context.md'), '# Project Context\n\n## [IDENTITY]\nUser Nickname: Test\n');
		fs.writeFileSync(
			path.join(memDir, 'active-decisions.md'),
			'### [SECURITY] Authentication token handling [date: 2026-08-25] [agent: @security-engineer]\nAuthentication secrets are scrubbed before writes.\n**Status:** active\n'
		);
		process.chdir(tmpDir);
		const out = JSON.parse(execFileSync(process.execPath, [MEMORY_FILTER, '--agent', 'developer', '--task', 'authentication'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
		process.chdir(oldCwd);
		assert.ok(out.results.length > 0, 'filter must return seeded entry');
		const block = out.results[0].t3_block;
		assert.ok(block.includes('<HISTORICAL_MEMORY_DATA trust_level="T3_PASSIVE_DATA">'), 'opening trust boundary missing');
		assert.ok(block.trim().endsWith('</HISTORICAL_MEMORY_DATA>'), 'closing trust boundary missing');
		assert.ok(block.includes('<!-- T3-DATA:'), 'provenance comment retained inside boundary');
	});
});
