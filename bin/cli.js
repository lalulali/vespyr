#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

const VERSION = "1.7.2";
const AGENTS_SRC = path.join(__dirname, "..", ".agents");
const DEFAULT_SUBAGENT_MODEL = "anthropic/claude-sonnet-4-5";

const ASCII_ART = `
 __  __                                         
/\\ \\/\\ \\                                        
\\ \\ \\ \\ \\     __    ____  _____   __  __  _ __  
 \\ \\ \\ \\ \\  /'__\`\\ /',__\\/\\ '__\`\\/\\ \\/\\ \\/\\\`'__\\
  \\ \\ \\_/ \\/\\  __//\\__, \`\\ \\ \\L\\ \\ \\ \\_\\ \\ \\ \\/ 
   \\ \`\\___/\\ \\____\\/\\____/\\ \\ ,__/\\/\`____ \\ \\_\\ 
    \`\\/__/  \\/____/\\/___/  \\ \\ \\/  \`/___/> \\/_/ 
                            \\ \\_\\     /\\___/    
                             \\/_/     \\/__/`;

// Single source of truth for all harness capabilities. Each harness
// declares an "engine" (primary install slot) and optional "channels"
// (additional files/links). The installer, uninstaller, summary printer,
// and migration detector all derive their behavior from this table —
// no per-harness branching.
//
// Engine / channel fields:
//   type:        "link" | "transpile" | "opencode-config"
//   target:      project-relative path (joined to targetDir at install time)
//   source:      project-relative source path (joined to targetDir)
//   transpiler:  key in TRANSPILERS (only for type:"transpile")
//   ext:         output file extension for uninstall mapping (transpile only)
//   isFile:      hint for link engine — target is a single file, not a dir
//   skipGlobal:  skip this channel during global install
//   globalTarget: explicit global path override (rare; e.g. .windsurfrules
//                 lives outside its harness's normal root folder)
const HARNESS_CONFIG = {
	opencode: {
		label: "opencode",
		description: "scaffolds .opencode -> .agents symlink",
		engine: {
			type: "link",
			target: ".opencode",
			source: ".agents",
			summary: ".opencode -> .agents",
			summaryTag: "opencode harness",
		},
		channels: [
			{
				type: "opencode-config",
				target: "opencode.json",
				summary: "opencode.json",
				summaryTag: "subagent + skill config",
				skipGlobal: true,
			},
		],
	},
	claude: {
		label: "Claude Code",
		description: "scaffolds .claude -> .agents symlink + CLAUDE.md",
		engine: {
			type: "link",
			target: ".claude",
			source: ".agents",
			summary: ".claude -> .agents",
			summaryTag: "Claude Code harness",
		},
		rootDoc: { filename: "CLAUDE.md" },
	},
	cursor: {
		label: "Cursor Rules",
		description: "scaffolds .cursor/rules/*.mdc rules with metadata",
		engine: {
			type: "transpile",
			target: ".cursor/rules",
			source: ".agents/agents",
			transpiler: "cursor",
			ext: "mdc",
			summary: ".cursor/rules/*.mdc",
			summaryTag: "Cursor rules",
		},
	},
	github: {
		label: "GitHub Copilot & CLI",
		description: "scaffolds .github/agents/*.yml compiled rules",
		engine: {
			type: "transpile",
			target: ".github/agents",
			source: ".agents/agents",
			transpiler: "copilot",
			ext: "yml",
			summary: ".github/agents/*.yml",
			summaryTag: "Copilot agents",
		},
		channels: [
			{
				type: "link",
				target: ".github/copilot-instructions.md",
				source: "AGENTS.md",
				isFile: true,
				summary: ".github/copilot-instructions.md",
				summaryTag: "Copilot instructions",
			},
		],
	},
	kiro: {
		label: "Kiro Steering",
		description: "scaffolds .kiro/steering/ manual rule folder",
		engine: {
			type: "link",
			target: ".kiro/steering",
			source: ".agents/agents",
			summary: ".kiro/steering -> agents",
			summaryTag: "Kiro steering",
		},
	},
	windsurf: {
		label: "Windsurf",
		description:
			"scaffolds .windsurf/workflows symlink & .windsurfrules symlink",
		engine: {
			type: "link",
			target: ".windsurf/workflows",
			source: ".agents/skills",
			summary: ".windsurf/workflows -> skills",
			summaryTag: "Windsurf workflows",
		},
		channels: [
			{
				id: "windsurf-rules",
				type: "link",
				target: ".windsurfrules",
				source: ".agents/GUARDRAILS.md",
				isFile: true,
				globalTarget: ".windsurfrules",
				summary: ".windsurfrules -> GUARDRAILS",
				summaryTag: "Windsurf rules",
			},
		],
	},
	hermes: {
		label: "Hermes Agent",
		description: "scaffolds .hermes/skills/ -> .agents/skills (agentskills.io)",
		engine: {
			type: "link",
			target: ".hermes/skills",
			source: ".agents/skills",
			summary: ".hermes/skills",
			summaryTag: "Hermes Agent, agentskills.io",
		},
	},
	openclaw: {
		label: "OpenClaw",
		description:
			"scaffolds .openclaw/workspace/{AGENTS.md,skills/} (agentskills.io)",
		engine: {
			type: "link",
			target: ".openclaw/workspace/skills",
			source: ".agents/skills",
			summary: ".openclaw/workspace/skills",
			summaryTag: "OpenClaw skills, agentskills.io",
		},
		channels: [
			{
				type: "link",
				target: ".openclaw/workspace/AGENTS.md",
				source: "AGENTS.md",
				isFile: true,
				summary: ".openclaw/workspace/AGENTS.md",
				summaryTag: "OpenClaw project memory",
				skipGlobal: true,
			},
		],
	},
};

// Derived: harness options for the wizard
const HARNESS_OPTIONS = Object.entries(HARNESS_CONFIG).map(([id, c]) => ({
	id,
	label: c.label,
	description: c.description,
}));

// Derived: symlink migration specs (one per link-type channel)
const HARNESS_SYMLINK_SPECS = Object.entries(HARNESS_CONFIG).flatMap(
	([id, c]) => {
		const specs = [];
		if (c.engine.type === "link") {
			specs.push({
				id,
				label: c.engine.summary,
				target: c.engine.target,
				source: c.engine.source,
				type: c.engine.isFile ? "file" : "dir",
			});
		}
		for (const ch of c.channels || []) {
			if (ch.type === "link") {
				specs.push({
					id: ch.id || `${id}-${path.basename(ch.target)}`,
					label: ch.summary,
					target: ch.target,
					source: ch.source,
					type: ch.isFile ? "file" : "dir",
				});
			}
		}
		return specs;
	},
);

let createdLinks = [];
let installed = false;
let dryRun = false;

function log(msg) {
	console.log(msg);
}

function logDry(msg) {
	if (dryRun) {
		console.log(`[DRY RUN] ${msg}`);
	}
}

function logError(msg) {
	console.error(`Error: ${msg}`);
}

function logWarn(msg) {
	console.warn(`  ⚠ ${msg}`);
}

function parseFlags(argv) {
	const args = argv.slice(2);
	const flags = {
		dryRun: false,
		yes: false,
		target: null,
		harnesses: [],
		model: null,
		syncDocs: false,
		version: false,
		help: false,
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--dry-run") {
			flags.dryRun = true;
		} else if (arg === "--yes" || arg === "-y") {
			flags.yes = true;
		} else if (arg === "--target") {
			flags.target = args[++i] || null;
		} else if (arg === "--harness") {
			const val = args[++i] || "";
			flags.harnesses = val
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
		} else if (arg === "--model") {
			flags.model = args[++i] || null;
		} else if (arg === "--sync-docs") {
			flags.syncDocs = true;
		} else if (arg === "--version" || arg === "-v") {
			flags.version = true;
		} else if (arg === "--help" || arg === "-h") {
			flags.help = true;
		} else {
			console.error(`Unknown flag: ${arg}`);
			process.exit(1);
		}
	}

	return flags;
}

function detectState(targetDir) {
	const agentsPath = path.join(targetDir, ".agents");
	const versionPath = path.join(agentsPath, ".vespyr-version");
	if (fs.existsSync(agentsPath) && fs.existsSync(versionPath)) {
		return "installed";
	}
	return "fresh";
}

function detectUnlinkedHarnesses(targetDir) {
	return HARNESS_SYMLINK_SPECS.filter((spec) => {
		const target = path.join(targetDir, spec.target);
		try {
			const stat = fs.lstatSync(target);
			return !stat.isSymbolicLink();
		} catch (e) {
			return false;
		}
	});
}

function parseFrontmatter(content) {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) return { data: {}, body: content };

	const data = {};
	const lines = match[1].split(/\r?\n/);

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;

		const kv = trimmed.match(/^(\w[\w\s]*?):\s*(.*)$/);
		if (kv) {
			const key = kv[1].trim();
			let val = kv[2].trim();
			if (
				(val.startsWith('"') && val.endsWith('"')) ||
				(val.startsWith("'") && val.endsWith("'"))
			) {
				val = val.slice(1, -1);
			}
			data[key] = val;
		}
	}

	return { data, body: content.substring(match[0].length).trim() };
}

function createLinkOrCopy(target, linkPath, type = "dir", method = "symlink") {
	if (dryRun) {
		logDry(`Would create ${type} ${method}: ${linkPath} -> ${target}`);
		return;
	}

	if (method === "copy") {
		const sourcePath = path.isAbsolute(target)
			? target
			: path.resolve(path.dirname(linkPath), target);
		if (type === "dir") {
			fs.cpSync(sourcePath, linkPath, { recursive: true });
		} else {
			fs.copyFileSync(sourcePath, linkPath);
		}
	} else {
		if (fs.existsSync(linkPath)) {
			try {
				const stat = fs.lstatSync(linkPath);
				if (stat.isSymbolicLink()) {
					const existing = fs.readlinkSync(linkPath);
					if (
						existing === target ||
						existing === path.relative(path.dirname(linkPath), target)
					) {
						return;
					}
				}
			} catch (e) {
				/* ignore */
			}
		}

		try {
			fs.symlinkSync(target, linkPath, type);
			createdLinks.push(linkPath);
		} catch (err) {
			if (
				err.code === "EPERM" &&
				type === "file" &&
				process.platform === "win32"
			) {
				fs.copyFileSync(target, linkPath);
				logWarn(`Symlink failed, copied file instead: ${linkPath}`);
			} else {
				throw err;
			}
		}
	}
}

function transpileCopilotYAML(agentsDir, outputDir, options = {}) {
	const merge = options.merge === true;
	const ext = "yml";
	if (dryRun) {
		const fileCount = fs.existsSync(agentsDir)
			? fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md")).length
			: "vespyr";
		logDry(
			`${merge ? "Would merge" : "Would create"} ${fileCount} Copilot YAML files in ${outputDir}`,
		);
		return { written: 0, preserved: 0 };
	}

	const agentFiles = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md"));

	fs.mkdirSync(outputDir, { recursive: true });

	let written = 0;
	let preserved = 0;
	for (const file of agentFiles) {
		const content = fs.readFileSync(path.join(agentsDir, file), "utf8");
		const { data, body } = parseFrontmatter(content);
		if (!data.description && !body) {
			logWarn(`Skipping ${file}: no frontmatter found`);
			continue;
		}

		const name = path.basename(file, ".md");
		const desc = (data.description || "").replace(/"/g, '\\"');
		const targetFile = path.join(outputDir, `${name}.${ext}`);

		if (merge && fs.existsSync(targetFile)) {
			preserved++;
			continue;
		}

		const yml = [
			`name: ${name}`,
			`description: "${desc}"`,
			`instructions: |`,
			...body.split("\n").map((line) => `  ${line}`),
			"",
		].join("\n");

		fs.writeFileSync(targetFile, yml);
		written++;
	}
	return { written, preserved };
}

function transpileCursorMDC(agentsDir, outputDir, options = {}) {
	const merge = options.merge === true;
	const ext = "mdc";
	if (dryRun) {
		const fileCount = fs.existsSync(agentsDir)
			? fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md")).length
			: "vespyr";
		logDry(
			`${merge ? "Would merge" : "Would create"} ${fileCount} Cursor MDC files in ${outputDir}`,
		);
		return { written: 0, preserved: 0 };
	}

	const agentFiles = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md"));

	fs.mkdirSync(outputDir, { recursive: true });

	let written = 0;
	let preserved = 0;
	for (const file of agentFiles) {
		const content = fs.readFileSync(path.join(agentsDir, file), "utf8");
		const { data, body } = parseFrontmatter(content);
		if (!data.description && !body) {
			logWarn(`Skipping ${file}: no frontmatter found`);
			continue;
		}

		const name = path.basename(file, ".md");
		const desc = (data.description || "").replace(/"/g, '\\"');
		const targetFile = path.join(outputDir, `${name}.${ext}`);

		if (merge && fs.existsSync(targetFile)) {
			preserved++;
			continue;
		}

		const mdc = [
			"---",
			`description: "${desc}"`,
			'globs: "*"',
			"alwaysApply: false",
			"---",
			"",
			body,
		].join("\n");

		fs.writeFileSync(targetFile, mdc);
		written++;
	}
	return { written, preserved };
}

// Transpiler registry — populated after the transpile functions are defined.
const TRANSPILERS = {
	cursor: transpileCursorMDC,
	copilot: transpileCopilotYAML,
};

function scaffoldArtifacts(targetDir, projectName, userNickname = "User") {
	const artifactsDir = path.join(targetDir, "artifacts");
	if (fs.existsSync(artifactsDir)) {
		log("  Existing artifacts/ found, skipping.");
		return;
	}

	if (dryRun) {
		logDry(`Would create artifacts/ directory tree in ${targetDir}`);
		return;
	}

	const outputDirs = [
		"output/00-discovery",
		"output/01-research",
		"output/02-strategy",
		"output/03-architecture",
		"output/04-planning",
		"output/06-launch",
		"output/07-iteration",
		"output/08-incidents",
		"output/09-retro",
	];
	const memoryDirs = [
		"memory/agent-notes",
		"memory/archive",
		"memory/session-summaries",
	];
	const inputDirs = [
		"input/data",
		"input/designs",
		"input/documents",
		"input/example",
		"input/flows",
	];
	const allDirs = [
		"directions",
		"telemetry",
		...inputDirs,
		...outputDirs,
		...memoryDirs,
	];

	for (const dir of allDirs) {
		fs.mkdirSync(path.join(artifactsDir, dir), { recursive: true });
	}

	const agentsDir = path.join(targetDir, ".agents", "agents");
	if (fs.existsSync(agentsDir)) {
		const agentFiles = fs
			.readdirSync(agentsDir)
			.filter((f) => f.endsWith(".md"));
		const pendingDir = path.join(artifactsDir, "memory", "pending-questions");
		fs.mkdirSync(pendingDir, { recursive: true });
		for (const agentFile of agentFiles) {
			const agentName = path.basename(agentFile, ".md");
			fs.mkdirSync(path.join(pendingDir, agentName), { recursive: true });
		}
	}

	const memoryPath = path.join(artifactsDir, "memory");
	const isoDate = new Date().toISOString().split("T")[0];

	fs.writeFileSync(
		path.join(memoryPath, "project-context.md"),
		`# Project Context

## Identity
- **Project Name**: ${projectName}
- **Repository**: None (not a git repository)
- **User Nickname**: ${userNickname}
- **Created**: ${isoDate}

## Technical
- **Stack**: None (Starting from scratch)
- **Architecture**: Not yet defined
- **Constraints**: None recorded

## Team
- **Squad**: full-team
- **Operation Mode**: semi-autonomous
- **Active Agents**: 21 (full-team preset)

## Memory
- **Lessons Learned**: None yet
- **Active Decisions**: None yet
`,
	);

	fs.writeFileSync(
		path.join(memoryPath, "active-decisions.md"),
		"# Active Decisions\n\nNo decisions recorded yet.\n",
	);
	fs.writeFileSync(
		path.join(memoryPath, "patterns-and-conventions.md"),
		"# Patterns & Conventions\n\nNo patterns recorded yet.\n",
	);
	fs.writeFileSync(
		path.join(memoryPath, "lessons-learned.md"),
		"# Lessons Learned\n\nNo lessons recorded yet.\n",
	);
	fs.writeFileSync(
		path.join(memoryPath, "blockers-and-risks.md"),
		"# Blockers & Risks\n\nNo blockers or risks recorded yet.\n",
	);
}

const ROOT_DOC_CONFIGS = [
	{
		filename: "AGENTS.md",
		harnessDir: ".agents",
		selfRef: "this document",
		docLabel: "",
		includeRootOnly: true,
	},
	{
		filename: "agent.md",
		harnessDir: ".agents",
		selfRef: "agent.md",
		docLabel: "",
		includeRootOnly: false,
	},
	{
		filename: "CLAUDE.md",
		harnessDir: ".claude",
		selfRef: "CLAUDE.md",
		docLabel: "CLAUDE.md ",
		includeRootOnly: false,
		requiresHarness: "claude",
	},
];

function renderScaffold(canonical, config) {
	let result = canonical;

	if (config.includeRootOnly) {
		result = result
			.replace(/<!-- BEGIN: ROOT_ONLY -->\n?/g, "")
			.replace(/\n?<!-- END: ROOT_ONLY -->/g, "");
	} else {
		result = result.replace(
			/<!-- BEGIN: ROOT_ONLY -->[\s\S]*?<!-- END: ROOT_ONLY -->\n?/g,
			"",
		);
	}

	result = result.replace(/\[.harness-folder\]/g, config.harnessDir);
	result = result.replace(/\{SELF_REF\}/g, config.selfRef);
	result = result.replace(/\{DOC_LABEL\}/g, config.docLabel);

	return result;
}

function bootstrapRootDocs(targetDir, projectName, selectedHarnesses) {
	const templatesDir = fs.existsSync(
		path.join(targetDir, ".agents", "templates"),
	)
		? path.join(targetDir, ".agents", "templates")
		: path.join(AGENTS_SRC, "templates");
	const canonicalPath = path.join(templatesDir, "AGENTS.md.canonical");
	if (!fs.existsSync(canonicalPath)) {
		logWarn(
			`Canonical template missing at ${canonicalPath} — skipping root docs`,
		);
		return;
	}
	const canonical = fs.readFileSync(canonicalPath, "utf8");

	const docsToWrite = ROOT_DOC_CONFIGS.filter(
		(cfg) =>
			!cfg.requiresHarness || selectedHarnesses.includes(cfg.requiresHarness),
	);

	if (dryRun) {
		for (const cfg of docsToWrite) {
			const target = path.join(targetDir, cfg.filename);
			if (!fs.existsSync(target)) logDry(`Would create ${cfg.filename}`);
		}
		return;
	}

	for (const cfg of docsToWrite) {
		const target = path.join(targetDir, cfg.filename);
		if (fs.existsSync(target)) continue;
		fs.writeFileSync(target, renderScaffold(canonical, cfg), "utf8");
	}
}

function writeVersionFile(targetDir) {
	const versionPath = path.join(targetDir, ".agents", ".vespyr-version");
	if (dryRun) {
		logDry(`Would write version file: ${versionPath}`);
		return;
	}
	const data = { version: VERSION, installed: new Date().toISOString() };
	fs.writeFileSync(versionPath, JSON.stringify(data, null, 2));
}

function getInstalledVersion(targetDir) {
	const versionPath = path.join(targetDir, ".agents", ".vespyr-version");
	if (!fs.existsSync(versionPath)) return null;
	try {
		const data = JSON.parse(fs.readFileSync(versionPath, "utf8"));
		return data.version || null;
	} catch (e) {
		return null;
	}
}

function updatePathsInDir(dir) {
	function walkSync(d) {
		const results = [];
		const entries = fs.readdirSync(d, { withFileTypes: true });
		for (const entry of entries) {
			const full = path.join(d, entry.name);
			if (entry.isDirectory()) {
				results.push(...walkSync(full));
			} else {
				results.push(full);
			}
		}
		return results;
	}

	const files = walkSync(dir);
	for (const file of files) {
		if (!file.endsWith(".md") && !file.endsWith(".js")) continue;
		let content = fs.readFileSync(file, "utf8");
		const updated = content.replace(/\.opencode\//g, ".agents/");
		if (updated !== content) {
			if (dryRun) {
				logDry(`Would update paths in: ${file}`);
			} else {
				fs.writeFileSync(file, updated);
			}
		}
	}
}

function summaryActionMarker(action) {
	if (action === "skipped") return "⚠";
	return "✓";
}

function summaryActionNote(action, fallback) {
	if (action === "merged") return "merged with user content";
	if (action === "skipped") return "skipped (user content preserved)";
	if (action === "unchanged") return "unchanged";
	return fallback || "done";
}

function summaryDefaultNote(channel) {
	if (channel.type === "transpile") return "transpiled";
	if (channel.type === "opencode-config") return "written";
	if (channel.type === "link") {
		// Hermes / OpenClaw skills historically surfaced a "agentskills.io" note
		// when freshly linked; the summaryTag already carries that information.
		return "linked";
	}
	return "done";
}

function pushSummaryLine(lines, channel, action) {
	const marker = summaryActionMarker(action);
	const note = summaryActionNote(action, summaryDefaultNote(channel));
	const summary = (channel.summary || channel.target || "").padEnd(32);
	const tag = channel.summaryTag || "harness";
	lines.push(`    ${marker} ${summary} (${tag} — ${note})`);
}

function printSummary(targetDir, selections, installResults = {}) {
	const lines = [
		`\n============================================================`,
		`   VESPYR v${VERSION} — Installation Complete`,
		`============================================================`,
		``,
		`  Target:       ${targetDir}`,
		`  Squad:        full-team (21 agents)`,
		`  Harnesses:    ${selections.harnesses.join(", ") || "core only"}`,
		``,
		`  Created:`,
		`    ✓ .agents/                        (core agent engine)`,
		`    ✓ AGENTS.md                       (harness-agnostic guide)`,
		`    ✓ agent.md                        (agent quick reference)`,
		`    ✓ artifacts/                      (memory + output directories)`,
	];

	for (const id of selections.harnesses) {
		const config = HARNESS_CONFIG[id];
		const result = installResults[id];
		if (!config || !result) continue;

		pushSummaryLine(lines, config.engine, result.engine);

		const channels = config.channels || [];
		for (let i = 0; i < channels.length; i++) {
			pushSummaryLine(lines, channels[i], result.channels?.[i]);
		}

		if (config.rootDoc) {
			lines.push(
				`    ✓ ${config.rootDoc.filename.padEnd(32)} (${config.label} project memory)`,
			);
		}
	}

	lines.push(
		``,
		`  Next steps:`,
		`    1. Run /init to bootstrap your project context`,
		`    2. Type @founder, /validate-idea, or /validate-game-idea "your idea" to stress-test a concept`,
		`    3. Use @help-me for a tailored navigation report`,
		`    4. Use /squad to view or switch team presets`,
		``,
		`  Docs: https://github.com/lalulali/vespyr`,
		`  Report issues: https://github.com/lalulali/vespyr/issues`,
		`============================================================`,
	);

	console.log(lines.join("\n"));
}

function setupSignalHandler(targetDir) {
	process.on("SIGINT", () => {
		if (!dryRun && fs.existsSync(path.join(targetDir, ".agents"))) {
			try {
				fs.rmSync(path.join(targetDir, ".agents"), {
					recursive: true,
					force: true,
				});
			} catch (e) {
				/* ignore */
			}
		}
		for (const link of createdLinks) {
			try {
				if (fs.existsSync(link)) fs.unlinkSync(link);
			} catch (e) {
				/* ignore */
			}
		}
		console.log("\nInstallation cancelled. No changes were made.");
		process.exit(130);
	});
}

const wizardState = {};

function clearScreen() {
	process.stdout.write("\x1b[2J\x1b[H");
}

function printWizardSummary() {
	const lines = [];
	if (wizardState.harnesses !== undefined) {
		lines.push(
			`  Harnesses: ${wizardState.harnesses.length ? wizardState.harnesses.join(", ") : "core only"}`,
		);
	}
	if (wizardState.scope !== undefined) {
		lines.push(`  Scope:     ${wizardState.scope}`);
	}
	if (wizardState.target !== undefined) {
		lines.push(`  Target:    ${wizardState.target}`);
	}
	if (wizardState.method !== undefined) {
		lines.push(`  Method:    ${wizardState.method}`);
	}
	if (wizardState.name !== undefined) {
		lines.push(`  Name:      ${wizardState.name}`);
	}
	if (lines.length > 0) {
		process.stdout.write(`\n  \x1b[2m── Current Selections ──\x1b[0m\n`);
		lines.forEach((l) => process.stdout.write(l + "\n"));
		process.stdout.write(`  \x1b[2m────────────────────────\x1b[0m\n`);
	}
}

function askChecklist(
	question,
	options,
	showBack = false,
	initialSelections = [],
) {
	return new Promise((resolve) => {
		const selected = options.map((o) => initialSelections.includes(o.id));
		let cursor = 0;
		const totalOptions = options.length + (showBack ? 1 : 0);

		const stdin = process.stdin;
		stdin.setRawMode(true);
		stdin.resume();
		stdin.setEncoding("utf8");

		function render() {
			clearScreen();
			log(ASCII_ART);
			printWizardSummary();
			process.stdout.write(`\n  ${question}\n`);
			process.stdout.write(
				`  \x1b[2m(Space to toggle, Enter to confirm)\x1b[0m\n\n`,
			);
			process.stdout.write(
				`    \x1b[32m✔\x1b[0m Core Agent Directory [Mandatory]\n\n`,
			);
			for (let i = 0; i < options.length; i++) {
				const pointer = i === cursor ? "\x1b[36m❯\x1b[0m" : " ";
				const check = selected[i] ? "\x1b[32m◉\x1b[0m" : "◯";
				process.stdout.write(`    ${pointer} ${check} ${options[i].label}\n`);
				process.stdout.write(`      \x1b[2m${options[i].description}\x1b[0m\n`);
			}
			if (showBack) {
				const pointer = cursor === options.length ? "\x1b[36m❯\x1b[0m" : " ";
				process.stdout.write(`\n    ${pointer} ← Back\n`);
			}
		}

		render();

		function onData(key) {
			if (key === "\u0003") {
				stdin.setRawMode(false);
				stdin.removeListener("data", onData);
				process.exit(130);
			}

			if (key === "\r" || key === "\n") {
				stdin.setRawMode(false);
				stdin.removeListener("data", onData);
				stdin.pause();
				if (showBack && cursor === options.length) {
					clearScreen();
					log(ASCII_ART);
					printWizardSummary();
					process.stdout.write("\n");
					resolve({ back: true });
					return;
				}
				const result = options.filter((_, i) => selected[i]).map((o) => o.id);
				wizardState.harnesses = result;
				clearScreen();
				log(ASCII_ART);
				printWizardSummary();
				process.stdout.write("\n");
				resolve(result);
				return;
			}

			if (key === " ") {
				if (cursor < options.length) {
					selected[cursor] = !selected[cursor];
				}
			}

			if (key === "\x1b[A") cursor = (cursor - 1 + totalOptions) % totalOptions;
			if (key === "\x1b[B") cursor = (cursor + 1) % totalOptions;

			render();
		}

		stdin.on("data", onData);
	});
}

function askSingleChoice(question, choices) {
	return new Promise((resolve) => {
		let cursor = 0;

		const stdin = process.stdin;
		stdin.setRawMode(true);
		stdin.resume();
		stdin.setEncoding("utf8");

		function render() {
			clearScreen();
			log(ASCII_ART);
			printWizardSummary();
			process.stdout.write(`\n  ${question}\n`);
			process.stdout.write(
				`  \x1b[2m(Up/Down to navigate, Enter to confirm)\x1b[0m\n\n`,
			);
			for (let i = 0; i < choices.length; i++) {
				const pointer = i === cursor ? "\x1b[36m❯\x1b[0m" : " ";
				process.stdout.write(`    ${pointer} ${choices[i]}\n`);
			}
		}

		render();

		function onData(key) {
			if (key === "\u0003") {
				stdin.setRawMode(false);
				stdin.removeListener("data", onData);
				process.exit(130);
			}

			if (key === "\r" || key === "\n") {
				stdin.setRawMode(false);
				stdin.removeListener("data", onData);
				stdin.pause();
				clearScreen();
				log(ASCII_ART);
				printWizardSummary();
				process.stdout.write(
					`\n  \x1b[32m✓\x1b[0m ${question.replace(":", "")}: \x1b[1m${choices[cursor]}\x1b[0m\n`,
				);
				resolve(cursor);
				return;
			}

			if (key === "\x1b[A")
				cursor = (cursor - 1 + choices.length) % choices.length;
			if (key === "\x1b[B") cursor = (cursor + 1) % choices.length;

			render();
		}

		stdin.on("data", onData);
	});
}

function askQuestion(question, defaultVal = "") {
	return new Promise((resolve) => {
		clearScreen();
		log(ASCII_ART);
		printWizardSummary();

		const display = defaultVal ? `${question} [${defaultVal}]` : question;
		process.stdout.write(`\n  ${display}: `);

		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			terminal: true,
		});

		rl.on("line", (line) => {
			rl.close();
			const result = line.trim() || defaultVal;
			resolve(result);
		});
	});
}

async function installHarnesses(targetDir, selections, method, model) {
	const ctx = { targetDir, method, model, isGlobal: false };
	const results = {};
	for (const id of selections) {
		results[id] = installHarness(id, ctx);
	}

	// Drop the .agents/commands folder when opencode is not selected
	if (!selections.includes("opencode")) {
		const targetCommands = path.join(targetDir, ".agents", "commands");
		if (fs.existsSync(targetCommands)) {
			if (!dryRun) {
				fs.rmSync(targetCommands, { recursive: true, force: true });
			} else {
				logDry(
					`Would remove commands folder from ${targetDir}/.agents because opencode is not selected`,
				);
			}
		}
	}

	return results;
}

function installOpencodeConfig(targetDir, model) {
	const target = path.join(targetDir, "opencode.json");
	if (fs.existsSync(target)) {
		if (dryRun) {
			logDry(`Would skip opencode.json (already exists)`);
		}
		return "unchanged";
	}

	const templatePath = path.join(
		AGENTS_SRC,
		"templates",
		"opencode.json.template",
	);
	if (!fs.existsSync(templatePath)) {
		logWarn(`opencode.json template missing at ${templatePath} — skipping`);
		return "skipped";
	}

	const resolvedModel = model !== null ? model : DEFAULT_SUBAGENT_MODEL;
	const rendered = fs
		.readFileSync(templatePath, "utf8")
		.replace(/\{DEFAULT_MODEL\}/g, resolvedModel);

	if (dryRun) {
		logDry(`Would write opencode.json (model: ${resolvedModel})`);
		return "created";
	}

	fs.writeFileSync(target, rendered, "utf8");
	log(`  ✓ opencode.json                       (model: ${resolvedModel})`);
	return "created";
}

function handleConflict(linkPath, name, targetDir, method = "symlink") {
	try {
		const stat = fs.lstatSync(linkPath);
		if (stat.isSymbolicLink()) {
			const target = fs.readlinkSync(linkPath);
			if (
				method === "symlink" &&
				(target === ".agents" ||
					target.endsWith("/.agents") ||
					target.includes(".agents/") ||
					target === path.join(os.homedir(), ".agents") ||
					target === path.join(os.homedir(), ".agents", "skills") ||
					target === path.join(os.homedir(), ".agents", "agents") ||
					target === path.join(os.homedir(), ".agents", "GUARDRAILS.md"))
			) {
				return;
			}
			logWarn(`Removing existing symlink ${name} to configure with ${method}.`);
			if (!dryRun) fs.unlinkSync(linkPath);
		} else {
			if (method === "copy" && stat.isDirectory()) {
				// If we want to copy to an existing directory, we enrich it directly
				return;
			}
			const backupPath = `${linkPath}.backup.${Date.now()}`;
			logWarn(
				`Existing ${name} found. Backing up to ${path.basename(backupPath)}`,
			);
			if (!dryRun) {
				fs.renameSync(linkPath, backupPath);
			}
		}
	} catch (e) {
		if (e.code !== "ENOENT") {
			// ignore
		}
	}
}

function enrichHarnessTarget(targetPath, sourcePath, method, label) {
	let existingStat = null;
	try {
		existingStat = fs.lstatSync(targetPath);
	} catch (e) {
		/* does not exist */
	}

	if (!existingStat) {
		const parentDir = path.dirname(targetPath);
		if (!dryRun) {
			fs.mkdirSync(parentDir, { recursive: true });
		}
		if (method === "symlink") {
			if (dryRun) {
				logDry(
					`Would symlink ${targetPath} -> ${path.relative(parentDir, sourcePath)}`,
				);
			} else {
				const sourceStat = fs.statSync(sourcePath);
				createLinkOrCopy(
					path.relative(parentDir, sourcePath),
					targetPath,
					sourceStat.isDirectory() ? "dir" : "file",
					"symlink",
				);
			}
		} else if (!dryRun) {
			if (fs.statSync(sourcePath).isDirectory()) {
				fs.cpSync(sourcePath, targetPath, { recursive: true });
			} else {
				fs.copyFileSync(sourcePath, targetPath);
			}
		} else {
			logDry(`Would copy ${sourcePath} to ${targetPath}`);
		}
		return "created";
	}

	if (existingStat.isSymbolicLink()) {
		const linkTarget = fs.readlinkSync(targetPath);
		const resolved = path.resolve(path.dirname(targetPath), linkTarget);
		if (resolved === path.resolve(sourcePath)) {
			return "unchanged";
		}
		logWarn(
			`${label} is a symlink to "${linkTarget}" — leaving it alone to preserve user content.`,
		);
		return "skipped";
	}

	if (existingStat.isDirectory()) {
		if (method === "symlink") {
			logWarn(
				`${label} already exists as a directory. Vespyr content NOT symlinked. To include vespyr ${existingStat.isDirectory() ? "skills" : "items"} alongside, configure "${sourcePath}" as an external directory in your ${label.split(" ")[0]} config, or rename/remove the existing folder first.`,
			);
			return "skipped";
		}
		const existingItems = fs.readdirSync(targetPath);
		const userOnlyCount = existingItems.filter(
			(name) => !fs.existsSync(path.join(sourcePath, name)),
		).length;
		let copied = 0;
		let skipped = 0;
		const items = fs.readdirSync(sourcePath);
		for (const item of items) {
			const dest = path.join(targetPath, item);
			if (fs.existsSync(dest)) {
				skipped++;
				continue;
			}
			if (!dryRun) {
				fs.cpSync(path.join(sourcePath, item), dest, { recursive: true });
			}
			copied++;
		}
		if (!dryRun) {
			log(
				`  ${label}: merged ${copied} vespyr item(s), kept ${skipped} user-named item(s), preserved ${userOnlyCount} user-only item(s)`,
			);
		} else {
			logDry(
				`Would merge ${copied} vespyr item(s) into ${targetPath}, keep ${skipped} user-named item(s), preserve ${userOnlyCount} user-only item(s)`,
			);
		}
		return "merged";
	}

	logWarn(
		`${label} already exists as a file. Not overwriting. To use vespyr's version, remove or rename the existing file first.`,
	);
	return "skipped";
}

function enrichHarnessTranspileTarget(
	outputDir,
	agentsDir,
	label,
	transpileFn,
) {
	let existingStat = null;
	try {
		existingStat = fs.lstatSync(outputDir);
	} catch (e) {
		/* does not exist */
	}

	if (!existingStat) {
		const parentDir = path.dirname(outputDir);
		if (!dryRun) {
			fs.mkdirSync(parentDir, { recursive: true });
		}
		const result = transpileFn(agentsDir, outputDir);
		if (!dryRun) {
			log(
				`  ${label}: wrote ${result.written} file(s) into ${outputDir}`,
			);
		}
		return "created";
	}

	if (existingStat.isSymbolicLink()) {
		const linkTarget = fs.readlinkSync(outputDir);
		logWarn(
			`${label} is a symlink to "${linkTarget}" — leaving it alone to preserve user content.`,
		);
		return "skipped";
	}

	if (existingStat.isDirectory()) {
		const result = transpileFn(agentsDir, outputDir, { merge: true });
		if (!dryRun) {
			log(
				`  ${label}: merged ${result.written} vespyr file(s), preserved ${result.preserved} user file(s) in ${outputDir}`,
			);
		}
		return "merged";
	}

	logWarn(
		`${label} already exists as a file. Not overwriting. To use vespyr's output, remove or rename the existing file first.`,
	);
	return "skipped";
}

function getGlobalPath(harness) {
	const home = os.homedir();
	const platform = process.platform;

	const paths = {
		opencode: path.join(home, ".opencode"),
		claude: path.join(home, ".claude"),
		agents: path.join(home, ".agents"),
		kiro: path.join(home, ".kiro"),
		windsurf: path.join(home, ".windsurf"),
		github:
			platform === "win32"
				? path.join(home, ".config", "github-copilot")
				: path.join(home, ".config", "github-copilot"),
		cursor:
			platform === "darwin"
				? path.join(
						home,
						"Library",
						"Application Support",
						"Cursor",
						"User",
						"globalRules",
					)
				: platform === "linux"
					? path.join(home, ".config", "Cursor", "User", "globalRules")
					: path.join(home, ".config", "Cursor", "User", "globalRules"),
		hermes: path.join(home, ".hermes"),
		openclaw: path.join(home, ".openclaw", "workspace"),
	};

	return paths[harness] || null;
}

// ---------------------------------------------------------------------------
// Unified harness install engine
//
// All harnesses go through the same code path. Each harness's HARNESS_CONFIG
// entry describes its engine (primary slot) and optional channels (extras).
// These helpers translate those declarations into concrete file operations.
// ---------------------------------------------------------------------------

// Resolve the global install path for a channel under the global install ctx.
// For most harnesses the path is getGlobalPath(harnessId) + the last segment
// of channel.target. For opencode/claude the harness root IS the target.
// For channels with an explicit globalTarget (e.g. .windsurfrules) the
// override is used verbatim relative to home.
function resolveGlobalTarget(channel, harnessId) {
	if (channel.globalTarget) {
		return path.join(os.homedir(), channel.globalTarget);
	}
	const root = getGlobalPath(harnessId);
	if (harnessId === "opencode" || harnessId === "claude") return root;
	return path.join(root, path.basename(channel.target));
}

// Resolve (target, source) absolute paths for a channel under a given ctx.
// ctx: { harnessId, targetDir, isGlobal, globalAgentsDir }
function resolveChannelPaths(channel, ctx) {
	if (!ctx.isGlobal) {
		return {
			target: path.join(ctx.targetDir, channel.target),
			source: path.join(ctx.targetDir, channel.source),
		};
	}
	const source = path.join(
		ctx.globalAgentsDir,
		channel.source.replace(/^\.agents\/?/, ""),
	);
	return { target: resolveGlobalTarget(channel, ctx.harnessId), source };
}

// Apply a single channel (link / transpile / opencode-config) to the install
// context. Returns the action string ("created" | "merged" | "skipped" | ...).
function applyChannel(channel, ctx) {
	switch (channel.type) {
		case "link": {
			const { target, source } = resolveChannelPaths(channel, ctx);
			return enrichHarnessTarget(
				target,
				source,
				ctx.method,
				channel.summaryTag || ctx.harnessId,
			);
		}
		case "transpile": {
			const { target, source } = resolveChannelPaths(channel, ctx);
			return enrichHarnessTranspileTarget(
				target,
				source,
				channel.summaryTag || ctx.harnessId,
				TRANSPILERS[channel.transpiler],
			);
		}
		case "opencode-config":
			return installOpencodeConfig(ctx.targetDir, ctx.model);
		default:
			logWarn(`Unknown channel type for ${ctx.harnessId}: ${channel.type}`);
			return "skipped";
	}
}

// Install a single harness: its engine plus any non-skipped channels.
function installHarness(harnessId, ctx) {
	const config = HARNESS_CONFIG[harnessId];
	if (!config) {
		logWarn(`Unknown harness: ${harnessId}`);
		return null;
	}
	const channelCtx = { ...ctx, harnessId };
	const channels = config.channels || [];
	const visible = ctx.isGlobal
		? channels.filter((ch) => !ch.skipGlobal)
		: channels;
	return {
		engine: applyChannel(config.engine, channelCtx),
		channels: visible.map((ch) => applyChannel(ch, channelCtx)),
	};
}

// Detect which harnesses are currently installed (used by update / reconfigure).
// isGlobal: false → check project-relative targets, true → check global paths.
function detectInstalledHarnesses(targetDir, isGlobal) {
	return Object.keys(HARNESS_CONFIG).filter((id) => {
		const config = HARNESS_CONFIG[id];
		const target = isGlobal
			? resolveGlobalTarget(config.engine, id)
			: path.join(targetDir, config.engine.target);
		return fs.existsSync(target);
	});
}

async function performGlobalInstall(selections, method, userNickname) {
	const globalAgentsDir = getGlobalPath("agents");
	const home = os.homedir();

	log(`\n  Installing Vespyr v${VERSION} globally...\n`);

	if (dryRun) {
		logDry(`Would copy .agents/ to ${globalAgentsDir}`);
		for (const h of selections) {
			const gp = getGlobalPath(h);
			if (gp) logDry(`Would create ${h} link at ${gp}`);
		}
		return;
	}

	// Copy .agents/ to ~/.agents/
	if (!fs.existsSync(globalAgentsDir)) {
		fs.mkdirSync(globalAgentsDir, { recursive: true });
	}
	fs.cpSync(AGENTS_SRC, globalAgentsDir, { recursive: true });

	// Write version file
	const versionPath = path.join(globalAgentsDir, ".vespyr-version");
	const data = {
		version: VERSION,
		installed: new Date().toISOString(),
		global: true,
	};
	fs.writeFileSync(versionPath, JSON.stringify(data, null, 2));

	if (!selections.includes("opencode")) {
		const globalCommands = path.join(globalAgentsDir, "commands");
		if (fs.existsSync(globalCommands)) {
			fs.rmSync(globalCommands, { recursive: true, force: true });
		}
	}

	// Install every selected harness through the same engine used for
	// project installs — only the targetDir and isGlobal flag differ.
	const ctx = {
		targetDir: home,
		method,
		model: null,
		isGlobal: true,
		globalAgentsDir,
	};
	for (const id of selections) {
		installHarness(id, ctx);
	}

	log(`  Global install complete.`);
	log(`  .agents/ installed to: ${globalAgentsDir}`);
	log(`  Harnesses configured: ${selections.join(", ") || "none"}\n`);
}

async function performFreshInstall(targetDir, flags) {
	log(`\n  Installing Vespyr v${VERSION} to ${targetDir}...\n`);

	setupSignalHandler(targetDir);

	let selections = flags.harnesses.length > 0 ? flags.harnesses : [];
	let method = "symlink";
	let userNickname = "User";

	if (!flags.yes) {
		let currentStep = 0;
		const steps = ["harnesses", "scope", "path", "method", "name", "confirm"];

		while (currentStep < steps.length) {
			const step = steps[currentStep];

			if (step === "harnesses") {
				const harnessResult = await askChecklist(
					"Select harness integrations to configure:",
					HARNESS_OPTIONS,
					currentStep > 0,
				);
				if (harnessResult.back) {
					// Can't go back from first step, so just stay here
					continue;
				}
				selections = harnessResult;
				currentStep++;
			} else if (step === "scope") {
				const scopeChoice = await askSingleChoice(
					"Select installation scope:",
					[
						"Project-level (Install in current workspace)",
						"Global (Install in user home/global environment paths)",
						"← Back",
					],
				);
				if (scopeChoice === 2) {
					currentStep--;
				} else {
					wizardState.scope = scopeChoice === 0 ? "Project-level" : "Global";
					currentStep++;
				}
			} else if (step === "path") {
				if (wizardState.scope === "Global") {
					currentStep++;
					continue;
				}
				const pathChoice = await askSingleChoice("Select target directory:", [
					"Current directory (.)",
					"Custom path (Enter a custom folder path)",
					"← Back",
				]);
				if (pathChoice === 2) {
					currentStep--;
				} else if (pathChoice === 1) {
					const customPath = await askQuestion("Enter custom path", ".");
					targetDir = path.resolve(customPath);
					wizardState.target = targetDir;
					currentStep++;
				} else {
					wizardState.target = targetDir;
					currentStep++;
				}
			} else if (step === "method") {
				const methodChoice = await askSingleChoice(
					"Select installation method:",
					[
						"Symlink (Recommended - references the master folder, allowing prompt updates to automatically propagate)",
						"Copy (Static copy of all agent folders and files)",
						"← Back",
					],
				);
				if (methodChoice === 2) {
					currentStep--;
				} else {
					method = methodChoice === 0 ? "symlink" : "copy";
					wizardState.method = method;
					currentStep++;
				}
			} else if (step === "name") {
				userNickname = await askQuestion(
					"What should the agent squad call you? (e.g., Lyor)",
					userNickname || "User",
				);
				userNickname =
					userNickname.replace(/[^a-zA-Z0-9\s\-_.]/g, "") || "User";
				wizardState.name = userNickname;
				currentStep++;
			} else if (step === "confirm") {
				clearScreen();
				log(ASCII_ART);
				log(`\n  \x1b[2m── Configuration ──\x1b[0m`);
				log(
					`  Harnesses: ${selections.length ? selections.join(", ") : "core only"}`,
				);
				log(`  Scope:     ${wizardState.scope}`);
				log(`  Target:    ${targetDir}`);
				log(`  Method:    ${method}`);
				log(`  Name:      ${userNickname}`);
				log(`  \x1b[2m────────────────────\x1b[0m\n`);

				const confirmChoice = await askSingleChoice(
					"Proceed with installation?",
					["Yes, install now", "← Back to edit", "Cancel installation"],
				);
				if (confirmChoice === 0) {
					break;
				} else if (confirmChoice === 1) {
					currentStep = 0;
				} else {
					log("\n  Installation cancelled.\n");
					process.exit(0);
				}
			}
		}
	}

	// Handle global vs project-level install
	if (wizardState.scope === "Global") {
		await performGlobalInstall(selections, method, userNickname);
		return;
	}

	if (!fs.existsSync(targetDir)) {
		if (dryRun) {
			logDry(`Would create directory: ${targetDir}`);
		} else {
			fs.mkdirSync(targetDir, { recursive: true });
		}
	}

	const agentsTarget = path.join(targetDir, ".agents");

	if (dryRun) {
		logDry(`Would copy .agents/ to ${agentsTarget}`);
	} else {
		if (!fs.existsSync(agentsTarget)) {
			fs.mkdirSync(agentsTarget, { recursive: true });
		}
		fs.cpSync(AGENTS_SRC, agentsTarget, { recursive: true });
		installed = true;
	}

	writeVersionFile(targetDir);

	const projectName = path.basename(targetDir);
	scaffoldArtifacts(targetDir, projectName, userNickname);
	bootstrapRootDocs(targetDir, projectName, selections);
	performSyncDocs(targetDir);
	const installResults = await installHarnesses(targetDir, selections, method, flags.model);

	if (!dryRun) {
		printSummary(targetDir, { harnesses: selections }, installResults);
	}
}

async function performUpdate(targetDir, flags) {
	log(`\n  Updating Vespyr in ${targetDir}...\n`);

	const agentsTarget = path.join(targetDir, ".agents");
	const prevVersion = getInstalledVersion(targetDir);

	if (dryRun) {
		logDry(`Would overwrite .agents/ with v${VERSION}`);
		logDry(`Would preserve artifacts/ directory`);
		logDry(`Would recompile all harness files`);
		return;
	}

	if (!fs.existsSync(agentsTarget)) {
		fs.mkdirSync(agentsTarget, { recursive: true });
	}
	fs.cpSync(AGENTS_SRC, agentsTarget, { recursive: true });

	writeVersionFile(targetDir);

	const versionFile = path.join(targetDir, ".agents", ".vespyr-version");
	const installedHarnesses = detectInstalledHarnesses(targetDir, false);

	// Detect method from existing installation
	let method = "symlink";
	const opencodePath = path.join(targetDir, ".opencode");
	const claudePath = path.join(targetDir, ".claude");
	try {
		if (fs.existsSync(opencodePath)) {
			const stat = fs.lstatSync(opencodePath);
			if (!stat.isSymbolicLink()) method = "copy";
		} else if (fs.existsSync(claudePath)) {
			const stat = fs.lstatSync(claudePath);
			if (!stat.isSymbolicLink()) method = "copy";
		}
	} catch (e) {}

	await installHarnesses(targetDir, installedHarnesses, method);

	log(`  Updated from v${prevVersion || "unknown"} to v${VERSION}`);
	log(`  Harnesses recompiled: ${installedHarnesses.join(", ") || "none"}`);
	log(`  artifacts/ preserved.\n`);
}

function getExistingUserNickname(targetDir) {
	const contextPath = path.join(
		targetDir,
		"artifacts",
		"memory",
		"project-context.md",
	);
	if (!fs.existsSync(contextPath)) {
		return "User";
	}
	try {
		const content = fs.readFileSync(contextPath, "utf8");
		const match = content.match(/-\s+\*\*User Nickname\*\*:\s*(.*)/i);
		if (match) {
			return match[1].trim();
		}
	} catch (e) {}
	return "User";
}

function updateUserNickname(targetDir, newNickname) {
	const contextPath = path.join(
		targetDir,
		"artifacts",
		"memory",
		"project-context.md",
	);
	if (!fs.existsSync(contextPath)) return;
	try {
		let content = fs.readFileSync(contextPath, "utf8");
		const updated = content.replace(
			/(-\s+\*\*User Nickname\*\*:\s*)(.*)/i,
			`$1${newNickname}`,
		);
		if (updated !== content) {
			fs.writeFileSync(contextPath, updated, "utf8");
		}
	} catch (e) {}
}

async function performReconfigure(targetDir, flags) {
	log(`\n  Reconfiguring Vespyr in ${targetDir}...\n`);

	// 1. Detect if it's a global installation
	const agentsTarget = path.join(targetDir, ".agents");
	let isGlobal = false;
	const versionPath = path.join(agentsTarget, ".vespyr-version");
	if (fs.existsSync(versionPath)) {
		try {
			const data = JSON.parse(fs.readFileSync(versionPath, "utf8"));
			isGlobal = !!data.global;
		} catch (e) {}
	}
	if (!isGlobal && targetDir === os.homedir()) {
		isGlobal = true;
	}

	// Detect previously installed harnesses
	const prevHarnesses = detectInstalledHarnesses(targetDir, isGlobal);

	let selections = flags.harnesses.length > 0 ? flags.harnesses : [];
	let userNickname = getExistingUserNickname(targetDir);

	if (!flags.yes) {
		selections = await askChecklist(
			"Select harness integrations to configure:",
			HARNESS_OPTIONS,
			false,
			prevHarnesses,
		);

		const contextPath = path.join(
			targetDir,
			"artifacts",
			"memory",
			"project-context.md",
		);
		if (fs.existsSync(contextPath)) {
			userNickname = await askQuestion(
				"What should the agent squad call you? (e.g., Lyor)",
				userNickname,
			);
			userNickname = userNickname.replace(/[^a-zA-Z0-9\s\-_.]/g, "") || "User";
			updateUserNickname(targetDir, userNickname);
		}
	}

	// Detect method from existing installation
	let method = "symlink";
	const getPath = (id, defaultSub) => {
		return isGlobal
			? getGlobalPath(id)
			: path.join(targetDir, HARNESS_CONFIG[id]?.engine?.target || defaultSub);
	};
	const opencodePath = getPath("opencode", ".opencode");
	const claudePath = getPath("claude", ".claude");
	try {
		if (fs.existsSync(opencodePath)) {
			const stat = fs.lstatSync(opencodePath);
			if (!stat.isSymbolicLink()) method = "copy";
		} else if (fs.existsSync(claudePath)) {
			const stat = fs.lstatSync(claudePath);
			if (!stat.isSymbolicLink()) method = "copy";
		}
	} catch (e) {}

	// Uninstall deselected harnesses
	const removedHarnesses = prevHarnesses.filter((h) => !selections.includes(h));
	if (removedHarnesses.length > 0) {
		uninstallHarnesses(targetDir, removedHarnesses, isGlobal);
	}

	await installHarnesses(targetDir, selections, method);

	log(
		`  Reconfiguration complete. Harnesses: ${selections.join(", ") || "core only"}\n`,
	);
}

function removeDirIfEmpty(dirPath) {
	try {
		if (fs.existsSync(dirPath)) {
			const stat = fs.lstatSync(dirPath);
			if (stat.isDirectory()) {
				const files = fs.readdirSync(dirPath).filter((f) => f !== ".DS_Store");
				if (files.length === 0) {
					fs.rmSync(dirPath, { recursive: true, force: true });
				}
			}
		}
	} catch (e) {
		// ignore
	}
}

function surgicallyCleanupAgentsDir(agentsTarget) {
	if (!fs.existsSync(agentsTarget)) return;

	try {
		const stat = fs.lstatSync(agentsTarget);
		if (stat.isSymbolicLink()) {
			fs.unlinkSync(agentsTarget);
			return;
		}
	} catch (e) {
		return;
	}

	// Delete core agents
	const agentsSrcDir = path.join(AGENTS_SRC, "agents");
	const targetAgentsDir = path.join(agentsTarget, "agents");
	if (fs.existsSync(agentsSrcDir) && fs.existsSync(targetAgentsDir)) {
		try {
			const coreAgents = fs.readdirSync(agentsSrcDir);
			for (const agent of coreAgents) {
				const targetAgentPath = path.join(targetAgentsDir, agent);
				if (fs.existsSync(targetAgentPath)) {
					fs.rmSync(targetAgentPath, { recursive: true, force: true });
				}
			}
			removeDirIfEmpty(targetAgentsDir);
		} catch (e) {
			// ignore
		}
	}

	// Delete core skills
	const skillsSrcDir = path.join(AGENTS_SRC, "skills");
	const targetSkillsDir = path.join(agentsTarget, "skills");
	if (fs.existsSync(skillsSrcDir) && fs.existsSync(targetSkillsDir)) {
		try {
			const coreSkills = fs.readdirSync(skillsSrcDir);
			for (const skill of coreSkills) {
				const targetSkillPath = path.join(targetSkillsDir, skill);
				if (fs.existsSync(targetSkillPath)) {
					fs.rmSync(targetSkillPath, { recursive: true, force: true });
				}
			}
			removeDirIfEmpty(targetSkillsDir);
		} catch (e) {
			// ignore
		}
	}

	// Delete other core folders
	const coreFolders = [
		"commands",
		"references",
		"scripts",
		"squads",
		"templates",
	];
	for (const folder of coreFolders) {
		const folderPath = path.join(agentsTarget, folder);
		if (fs.existsSync(folderPath)) {
			fs.rmSync(folderPath, { recursive: true, force: true });
		}
	}

	// Delete core files
	const coreFiles = [
		"GUARDRAILS.md",
		"TROUBLESHOOTING.md",
		"delegation-pattern.md",
		"skills.md",
		"workflow.md",
		".vespyr-version",
		".gitignore",
		".DS_Store",
	];
	for (const file of coreFiles) {
		const filePath = path.join(agentsTarget, file);
		if (fs.existsSync(filePath)) {
			try {
				fs.unlinkSync(filePath);
			} catch (e) {}
		}
	}

	// Delete the directory if it is empty
	removeDirIfEmpty(agentsTarget);
}

function uninstallChannel(channel, ctx) {
	const { harnessId, isGlobal, targetDir } = ctx;
	const target = isGlobal
		? resolveGlobalTarget(channel, harnessId)
		: path.join(targetDir, channel.target);

	// lstatSync (not existsSync) — existsSync follows symlinks and would
	// return false for dangling symlinks, e.g. .kiro/steering -> ../.agents/agents
	// after surgicallyCleanupAgentsDir has already removed the target.
	let stat;
	try {
		stat = fs.lstatSync(target);
	} catch (e) {
		return; // target doesn't exist
	}

	// Special case: the opencode/claude engine is the entire .opencode/.claude
	// directory, which mirrors the .agents tree. Use the surgical cleanup so
	// we only remove canonical vespyr items, not anything the user added.
	if (
		channel.type === "link" &&
		channel.source === ".agents" &&
		(harnessId === "opencode" || harnessId === "claude")
	) {
		surgicallyCleanupAgentsDir(target);
		return;
	}

	// Symlink (including dangling) → just unlink
	if (stat.isSymbolicLink()) {
		try {
			fs.unlinkSync(target);
		} catch (e) {}
		removeDirIfEmpty(path.dirname(target));
		return;
	}

	// File (e.g. .windsurfrules, AGENTS.md, copilot-instructions.md) → unlink
	if (stat.isFile()) {
		try {
			fs.unlinkSync(target);
		} catch (e) {}
		removeDirIfEmpty(path.dirname(target));
		return;
	}

	// Directory → surgically remove only the items that came from vespyr
	const sourceRoot = isGlobal ? getGlobalPath("agents") : AGENTS_SRC;
	const sourceSubpath = channel.source.replace(/^\.agents\/?/, "");
	const sourceDir = sourceSubpath
		? path.join(sourceRoot, sourceSubpath)
		: sourceRoot;

	if (fs.existsSync(sourceDir)) {
		const sourceStat = fs.statSync(sourceDir);
		if (sourceStat.isDirectory()) {
			const items = fs.readdirSync(sourceDir);
			for (const item of items) {
				// Transpile channels map source file extensions (e.g. .md → .mdc, .yml)
				const baseName = path.basename(item, path.extname(item));
				const targetName = channel.ext ? `${baseName}.${channel.ext}` : item;
				const itemPath = path.join(target, targetName);
				if (fs.existsSync(itemPath)) {
					try {
						fs.rmSync(itemPath, { recursive: true, force: true });
					} catch (e) {}
				}
			}
		} else {
			try {
				fs.unlinkSync(target);
			} catch (e) {}
		}
	}

	removeDirIfEmpty(target);
	removeDirIfEmpty(path.dirname(target));
}

function uninstallHarnesses(targetDir, harnesses, isGlobal) {
	const home = os.homedir();
	const effectiveTargetDir = isGlobal ? home : targetDir;
	const ctx = { isGlobal, targetDir: effectiveTargetDir };

	for (const id of harnesses) {
		const config = HARNESS_CONFIG[id];
		if (!config) continue;
		const harnessCtx = { ...ctx, harnessId: id };

		uninstallChannel(config.engine, harnessCtx);

		for (const ch of config.channels || []) {
			if (isGlobal && ch.skipGlobal) continue;
			uninstallChannel(ch, harnessCtx);
		}

		// Final cleanup: try to remove the harness's root directory if empty.
		// For opencode/claude the surgical cleanup already removed the engine
		// dir itself, so this is a no-op for them.
		const harnessRoot = isGlobal
			? getGlobalPath(id)
			: path.join(effectiveTargetDir, config.engine.target.split("/")[0]);
		removeDirIfEmpty(harnessRoot);
	}
}

async function performUninstall(targetDir) {
	log(`\n  Uninstalling Vespyr from ${targetDir}...\n`);

	if (dryRun) {
		logDry(`Would delete .agents/`);
		logDry(`Would delete all harness symlinks`);
		logDry(`Would delete AGENTS.md, agent.md, CLAUDE.md`);
		logDry(`Would preserve artifacts/`);
		return;
	}

	// 1. Detect if it's a global installation
	const agentsTarget = path.join(targetDir, ".agents");
	let isGlobal = false;
	const versionPath = path.join(agentsTarget, ".vespyr-version");
	if (fs.existsSync(versionPath)) {
		try {
			const data = JSON.parse(fs.readFileSync(versionPath, "utf8"));
			isGlobal = !!data.global;
		} catch (e) {}
	}
	if (!isGlobal && targetDir === os.homedir()) {
		isGlobal = true;
	}

	// 2. Surgically cleanup .agents directory
	surgicallyCleanupAgentsDir(agentsTarget);

	// 3. Clean up all harness files/folders surgically
	const allHarnesses = [
		"opencode",
		"claude",
		"cursor",
		"github",
		"windsurf",
		"kiro",
		"hermes",
		"openclaw",
	];
	uninstallHarnesses(targetDir, allHarnesses, isGlobal);

	// 4. Delete core root documents
	const filesToRemove = ["AGENTS.md", "agent.md", "CLAUDE.md"];
	for (const file of filesToRemove) {
		const filePath = path.join(targetDir, file);
		if (fs.existsSync(filePath)) {
			try {
				fs.unlinkSync(filePath);
			} catch (e) {}
		}
	}

	log(`  Uninstall complete. artifacts/ preserved.\n`);
}

async function performCopyToSymlinkMigration(targetDir, flags) {
	const unlinked = detectUnlinkedHarnesses(targetDir);

	if (unlinked.length === 0) {
		log(`\n  No copy-style harness folders detected. Nothing to migrate.\n`);
		return;
	}

	log(`\n============================================================`);
	log(`   VESPYR v${VERSION} — Copy → Symlink Migration`);
	log(`============================================================`);
	log(`Detected ${unlinked.length} harness folder(s) that are currently`);
	log(`copies but should be symlinks into .agents/.\n`);

	if (flags.yes) {
		await executeCopyToSymlinkMigration(targetDir, unlinked.map((s) => s.id));
		return;
	}

	const options = unlinked.map((spec) => ({ id: spec.id, label: spec.label }));
	const initialSelections = unlinked.map((s) => s.id);

	const result = await askChecklist(
		"Select harness folders to convert to symlinks:",
		options,
		true,
		initialSelections,
	);

	if (result.back) {
		log(`\n  Migration cancelled.\n`);
		return;
	}

	if (result.length === 0) {
		log(`\n  No folders selected. Nothing to migrate.\n`);
		return;
	}

	await executeCopyToSymlinkMigration(targetDir, result);
}

async function executeCopyToSymlinkMigration(targetDir, selectedIds) {
	log(`\n  Converting copies to symlinks in ${targetDir}...\n`);

	if (dryRun) {
		for (const id of selectedIds) {
			const spec = HARNESS_SYMLINK_SPECS.find((s) => s.id === id);
			if (!spec) continue;
			logDry(`Would convert ${spec.target} → ${spec.source} (${spec.type})`);
		}
		logDry(
			`Would create timestamped .backup of each converted folder before symlinking`,
		);
		return;
	}

	let converted = 0;
	let skipped = 0;
	let failed = 0;

	for (const id of selectedIds) {
		const spec = HARNESS_SYMLINK_SPECS.find((s) => s.id === id);
		if (!spec) continue;

		const target = path.join(targetDir, spec.target);
		const source = path.join(targetDir, spec.source);

		try {
			const stat = fs.lstatSync(target);
			if (stat.isSymbolicLink()) {
				log(`  ${spec.target} is already a symlink, skipping.`);
				skipped++;
				continue;
			}

			if (!fs.existsSync(source)) {
				logWarn(
					`Source ${spec.source} not found — cannot create symlink for ${spec.target}.`,
				);
				skipped++;
				continue;
			}

			const backupPath = `${target}.backup.${Date.now()}`;
			fs.renameSync(target, backupPath);
			log(`  Backed up ${spec.target} → ${path.basename(backupPath)}`);

			const parentDir = path.dirname(target);
			fs.mkdirSync(parentDir, { recursive: true });

			const relSource = path.relative(parentDir, source);
			fs.symlinkSync(relSource, target, spec.type);
			log(`  Created symlink: ${spec.target} → ${relSource}`);
			converted++;
		} catch (e) {
			logError(`  Failed to migrate ${spec.target}: ${e.message}`);
			failed++;
		}
	}

	log(
		`\n  Migration complete. Converted: ${converted}, Skipped: ${skipped}, Failed: ${failed}\n`,
	);
}

async function showActionMenu(targetDir, flags) {
	log(`\n============================================================`);
	log(`   VESPYR v${VERSION} — AI Agent Team CLI`);
	log(`============================================================`);
	log(`Vespyr is already configured in this directory.\n`);

	if (flags.yes) {
		await performUpdate(targetDir, flags);
		return;
	}

	const unlinked = detectUnlinkedHarnesses(targetDir);
	const hasUnlinked = unlinked.length > 0;

	const choices = [
		"Update Vespyr (Sync latest agent prompts, scripts, and skills)",
	];
	if (hasUnlinked) {
		choices.push(
			`Migrate (Convert ${unlinked.length} copied harness folder${unlinked.length === 1 ? "" : "s"} to symlinks)`,
		);
	}
	choices.push(
		"Reconfigure (Re-run interactive setup / add or remove harnesses)",
		"Uninstall Vespyr (Cleanly remove all Vespyr folders and files)",
	);

	const choice = await askSingleChoice("Select an action:", choices);

	if (choice === 0) {
		await performUpdate(targetDir, flags);
	} else if (hasUnlinked && choice === 1) {
		await performCopyToSymlinkMigration(targetDir, flags);
	} else if (
		(hasUnlinked && choice === 2) ||
		(!hasUnlinked && choice === 1)
	) {
		await performReconfigure(targetDir, flags);
	} else {
		await performUninstall(targetDir);
	}
}

function performSyncDocs(targetDir) {
	const syncScript = path.join(
		targetDir,
		".agents",
		"scripts",
		"sync-entry-points.js",
	);

	if (fs.existsSync(syncScript)) {
		const { execSync } = require("child_process");
		execSync(`node "${syncScript}"`, { cwd: targetDir, stdio: "inherit" });

		const validateScript = path.join(
			targetDir, ".agents", "scripts", "validate_frontmatter.js",
		);
		if (fs.existsSync(validateScript)) {
			execSync(`node "${validateScript}"`, { cwd: targetDir, stdio: "inherit" });
		}
		return;
	}

	// Fallback: legacy template-based approach
	const canonicalPath = path.join(
		AGENTS_SRC,
		"templates",
		"AGENTS.md.canonical",
	);
	if (!fs.existsSync(canonicalPath)) {
		logError(`Canonical template not found at ${canonicalPath}`);
		process.exit(1);
	}
	const canonical = fs.readFileSync(canonicalPath, "utf8");

	const written = [];
	for (const cfg of ROOT_DOC_CONFIGS) {
		const target = path.join(targetDir, cfg.filename);
		fs.writeFileSync(target, renderScaffold(canonical, cfg), "utf8");
		written.push(target);
	}
	log(`\n  Synced ${written.length} root doc(s) from canonical:`);
	for (const p of written) log(`    ✓ ${path.relative(targetDir, p)}`);
}

async function main() {
	const flags = parseFlags(process.argv);
	dryRun = flags.dryRun;

	if (flags.version) {
		console.log(VERSION);
		process.exit(0);
	}

	if (flags.help) {
		console.log(`
vespyr v${VERSION} — AI Agent Team Installer

Usage: npx vespyr [options]

Options:
  --dry-run            Preview all actions without making changes
  --yes, -y            Skip all interactive prompts, use defaults
  --target <path>      Specify installation directory
  --harness <names>    Pre-select harness(es), comma-separated
  --model <id>         Default subagent model for opencode.json (default: anthropic/claude-sonnet-4-5)
  --sync-docs          Regenerate root AGENTS.md, agent.md, CLAUDE.md from the canonical template
  --version, -v        Print version and exit
  --help, -h           Print usage and exit

Examples:
  npx vespyr                          Interactive install
  npx vespyr --yes                    Install with defaults
  npx vespyr --harness opencode,claude  Pre-select harnesses
  npx vespyr --model google/gemini-2.5-pro  Override default subagent model
  npx vespyr --target ./my-project    Install to specific directory
  npx vespyr --dry-run                Preview actions
`);
		process.exit(0);
	}

	log(ASCII_ART);

	let targetDir = flags.target ? path.resolve(flags.target) : process.cwd();

	if (flags.syncDocs) {
		await performSyncDocs(targetDir);
		return;
	}

	const state = detectState(targetDir);

	try {
		if (state === "installed") {
			await showActionMenu(targetDir, flags);
		} else {
			log(`\n============================================================`);
			log(`   VESPYR v${VERSION} — AI Agent Team Installer`);
			log(`============================================================\n`);
			await performFreshInstall(targetDir, flags);
		}
	} catch (err) {
		if (err.code === "EACCES" || err.code === "EPERM") {
			logError(
				`Permission denied. Try running with appropriate privileges or check directory ownership.`,
			);
		} else if (err.code === "ENOSPC") {
			logError(`Not enough disk space to complete installation.`);
		} else if (err.code === "ENOENT") {
			logError(
				`The specified path does not exist. Create it first or choose a different directory.`,
			);
		} else {
			logError(
				`Installation failed: ${err.message}. Run with --dry-run to debug, or report at github.com/lalulali/vespyr/issues.`,
			);
		}

		if (!dryRun && installed) {
			const agentsTarget = path.join(targetDir, ".agents");
			if (fs.existsSync(agentsTarget)) {
				fs.rmSync(agentsTarget, { recursive: true, force: true });
			}
			for (const link of createdLinks) {
				if (fs.existsSync(link)) {
					try {
						fs.unlinkSync(link);
					} catch (e) {
						/* ignore */
					}
				}
			}
		}

		process.exit(1);
	}
}

if (require.main === module) {
	main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}

module.exports = {
	parseFlags,
	parseFrontmatter,
	detectState,
	createLinkOrCopy,
	transpileCopilotYAML,
	transpileCursorMDC,
	scaffoldArtifacts,
	bootstrapRootDocs,
	writeVersionFile,
	getInstalledVersion,
	updatePathsInDir,
	printSummary,
	handleConflict,
	enrichHarnessTarget,
	enrichHarnessTranspileTarget,
	performUninstall,
	surgicallyCleanupAgentsDir,
	removeDirIfEmpty,
	getExistingUserNickname,
	updateUserNickname,
	uninstallHarnesses,
	uninstallChannel,
	installHarness,
	applyChannel,
	resolveChannelPaths,
	resolveGlobalTarget,
	detectInstalledHarnesses,
	performReconfigure,
	performUpdate,
	performCopyToSymlinkMigration,
	detectUnlinkedHarnesses,
	ASCII_ART,
	VERSION,
	HARNESS_CONFIG,
	HARNESS_OPTIONS,
	HARNESS_SYMLINK_SPECS,
	TRANSPILERS,
};
