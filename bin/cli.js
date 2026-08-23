#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

const VERSION = require(path.join(__dirname, "..", "package.json")).version;
const AGENTS_SRC = path.join(__dirname, "..", ".agents");
const IS_TTY = Boolean(process.stdout && process.stdout.isTTY);

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

const HARNESS_OPTIONS = [
	{
		id: "opencode",
		label: "opencode",
		description: "scaffolds .opencode -> .agents symlink",
	},
	{
		id: "claude",
		label: "Claude Code",
		description: "scaffolds .claude -> .agents symlink + CLAUDE.md",
	},
	{
		id: "kiro",
		label: "Kiro Steering & Skills",
		description: "scaffolds .kiro/steering/vespyr-steering.md & .kiro/skills/ symlink",
	},
	// {
	// 	id: "cursor",
	// 	label: "Cursor Rules",
	// 	description: "scaffolds .cursor/rules/*.mdc rules with metadata",
	// },
	// {
	// 	id: "github",
	// 	label: "GitHub Copilot & CLI",
	// 	description: "scaffolds .github/agents/*.yml compiled rules",
	// },
	// {
	// 	id: "windsurf",
	// 	label: "Windsurf",
	// 	description:
	// 		"scaffolds .windsurf/workflows symlink & .windsurfrules symlink",
	// },
];

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

function detectRepository() {
	const { execSync } = require("child_process");
	try {
		const inRepo = execSync("git rev-parse --is-inside-work-tree 2>/dev/null", {
			encoding: "utf8",
		}).trim();
		if (inRepo !== "true") return "Not a git repository (local folder)";
		const remote = execSync("git config --get remote.origin.url 2>/dev/null", {
			encoding: "utf8",
		}).trim();
		return remote || "Local git repository (no remote)";
	} catch {
		return "Not a git repository (local folder)";
	}
}

// post-push hook: refreshes project-context.md (Repository line + CORE fields)
// right after `git push`, via the orchestrator's sync-context command.
const POST_PUSH_HOOK = `#!/bin/sh
# Vespyr: refresh project-context.md after a push.
# Keeps the Repository line in artifacts/memory/project-context.md in sync
# with the remote configured for this repository.
node .agents/scripts/orchestrator_state.js sync-context >/dev/null 2>&1 || true
`;

function installGitHook(targetDir) {
	const gitDir = path.join(targetDir, ".git");
	if (!fs.existsSync(gitDir)) {
		logWarn(
			"No .git directory found — post-push hook not installed. Run \`git init\` then \`npx vespyr --install-git-hook --target .\` to enable it.",
		);
		return false;
	}
	if (dryRun) {
		logDry(`Would install post-push git hook in ${path.join(gitDir, "hooks")}`);
		return true;
	}
	const hooksDir = path.join(gitDir, "hooks");
	if (!fs.existsSync(hooksDir)) {
		fs.mkdirSync(hooksDir, { recursive: true });
	}
	const hookPath = path.join(hooksDir, "post-push");
	const hasVespyrHook =
		fs.existsSync(hookPath) && fs.readFileSync(hookPath, "utf8").includes("orchestrator_state.js sync-context");
	if (fs.existsSync(hookPath) && !hasVespyrHook) {
		logWarn("Existing post-push hook found — Vespyr hook NOT overwritten. Merge it manually.");
		return false;
	}
	fs.writeFileSync(hookPath, POST_PUSH_HOOK, { mode: 0o755 });
	log(`  ✓ post-push git hook installed (${path.relative(process.cwd(), hookPath)})`);
	return true;
}

function parseFlags(argv) {
	const args = argv.slice(2);
	const flags = {
		dryRun: false,
		yes: false,
		target: null,
		harnesses: [],
		version: false,
		help: false,
		syncDocs: false,
		installGitHook: false,
		verify: false,
		audit: false,
		manifest: false,
		json: false,
		spec: null,
		command: null,
		projectName: null,
		userNickname: null,
		stack: null,
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "init") {
			flags.command = "init";
		} else if (arg === "update") {
			flags.command = "update";
		} else if (arg === "verify" || arg === "--verify") {
			flags.verify = true;
			flags.command = "verify";
		} else if (arg === "audit" || arg === "--audit") {
			flags.audit = true;
			flags.command = "audit";
		} else if (arg === "manifest" || arg === "--manifest") {
			flags.manifest = true;
			flags.command = "manifest";
		} else if (arg === "--json") {
			flags.json = true;
		} else if (arg === "--spec") {
			const val = args[++i];
			if (val === undefined || val.startsWith("-")) {
				console.error("Missing value for flag: --spec");
				process.exit(2);
			}
			flags.spec = val;
		} else if (arg === "--dry-run") {
			flags.dryRun = true;
		} else if (arg === "--yes" || arg === "-y") {
			flags.yes = true;
		} else if (arg === "--project-name") {
			const val = args[++i];
			if (val === undefined || val.startsWith("-")) {
				console.error("Missing value for flag: --project-name");
				process.exit(1);
			}
			flags.projectName = val;
		} else if (arg === "--user-nickname") {
			const val = args[++i];
			if (val === undefined || val.startsWith("-")) {
				console.error("Missing value for flag: --user-nickname");
				process.exit(1);
			}
			flags.userNickname = val;
		} else if (arg === "--stack") {
			const val = args[++i];
			if (val === undefined || val.startsWith("-")) {
				console.error("Missing value for flag: --stack");
				process.exit(1);
			}
			flags.stack = val;
		} else if (arg === "--target") {
			const val = args[++i];
			if (val === undefined || val.startsWith("-")) {
				console.error("Missing value for flag: --target");
				process.exit(1);
			}
			flags.target = val;
		} else if (arg === "--harness") {
			const val = args[++i];
			if (val === undefined || val.startsWith("-")) {
				console.error("Missing value for flag: --harness");
				process.exit(1);
			}
			flags.harnesses = val
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
		} else if (arg === "--version" || arg === "-v") {
			flags.version = true;
		} else if (arg === "--help" || arg === "-h") {
			flags.help = true;
		} else if (arg === "--sync-docs") {
			flags.syncDocs = true;
		} else if (arg === "--install-git-hook") {
			flags.installGitHook = true;
		} else {
			console.error(`Unknown flag: ${arg}`);
			process.exit(1);
		}
	}

	return flags;
}

function detectState(targetDir) {
	const opencodePath = path.join(targetDir, ".opencode");
	const agentsPath = path.join(targetDir, ".agents");
	const versionPath = path.join(agentsPath, ".vespyr-version");

	const opencodeExists = fs.existsSync(opencodePath);
	const agentsExists = fs.existsSync(agentsPath);

	if (agentsExists && fs.existsSync(versionPath)) {
		return "installed";
	}

	if (agentsExists) {
		return "repair";
	}

	if (opencodeExists) {
		try {
			const stat = fs.lstatSync(opencodePath);
			if (!stat.isSymbolicLink()) {
				return "migrate";
			}
		} catch (e) {
			// ignore
		}
	}

	return "fresh";
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

	const sourcePath = path.isAbsolute(target)
		? target
		: path.resolve(path.dirname(linkPath), target);

	if (method === "copy") {
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
					const normExisting = existing.replace(/\\/g, "/");
					const normTarget = target.replace(/\\/g, "/");
					const normRel = path.relative(path.dirname(linkPath), target).replace(/\\/g, "/");
					const normSource = sourcePath.replace(/\\/g, "/");
					if (
						normExisting === normTarget ||
						normExisting === normRel ||
						normExisting === normSource
					) {
						return;
					}
				}
			} catch (e) {
				/* ignore */
			}
		}

		try {
			const symlinkType = (process.platform === "win32" && type === "dir") ? "junction" : type;
			const symlinkTarget = (process.platform === "win32" && symlinkType === "junction")
				? sourcePath
				: target;

			fs.symlinkSync(symlinkTarget, linkPath, symlinkType);
			createdLinks.push(linkPath);
		} catch (err) {
			if (
				err.code === "EPERM" ||
				err.code === "EACCES" ||
				err.code === "UNKNOWN" ||
				err.code === "EXDEV" ||
				process.platform === "win32"
			) {
				if (type === "dir") {
					fs.cpSync(sourcePath, linkPath, { recursive: true });
					logWarn(`Symlink failed (${err.code || "unsupported"}), copied directory instead: ${linkPath}`);
				} else {
					fs.copyFileSync(sourcePath, linkPath);
					logWarn(`Symlink failed (${err.code || "unsupported"}), copied file instead: ${linkPath}`);
				}
			} else {
				throw err;
			}
		}
	}
}

function yamlQuote(value) {
	const s = String(value);
	if (/[\r\n]/.test(s)) {
		const lines = s.split(/\r?\n/).map((l) => `  ${l}`);
		return `|\n${lines.join("\n")}`;
	}
	const escaped = s
		.replace(/\\/g, "\\\\")
		.replace(/"/g, '\\"')
		.replace(/[\u0000-\u001f\u007f]/g, (c) =>
			`\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
		);
	return `"${escaped}"`;
}

function transpileCopilotYAML(agentsDir, outputDir) {
	const agentFiles = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md"));
	if (dryRun) {
		logDry(
			`Would create ${agentFiles.length} Copilot YAML files in ${outputDir}`,
		);
		return;
	}

	fs.mkdirSync(outputDir, { recursive: true });

	for (const file of agentFiles) {
		const content = fs.readFileSync(path.join(agentsDir, file), "utf8");
		const { data, body } = parseFrontmatter(content);
		if (!data.description && !body) {
			logWarn(`Skipping ${file}: no frontmatter found`);
			continue;
		}

		const name = path.basename(file, ".md");
		const desc = yamlQuote(data.description || "");

		const yml = [
			`name: ${name}`,
			`description: ${desc}`,
			`instructions: |`,
			...body.split("\n").map((line) => `  ${line}`),
			"",
		].join("\n");

		fs.writeFileSync(path.join(outputDir, `${name}.yml`), yml);
	}
}

function transpileCursorMDC(agentsDir, outputDir) {
	const agentFiles = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md"));
	if (dryRun) {
		logDry(
			`Would create ${agentFiles.length} Cursor MDC files in ${outputDir}`,
		);
		return;
	}

	fs.mkdirSync(outputDir, { recursive: true });

	for (const file of agentFiles) {
		const content = fs.readFileSync(path.join(agentsDir, file), "utf8");
		const { data, body } = parseFrontmatter(content);
		if (!data.description && !body) {
			logWarn(`Skipping ${file}: no frontmatter found`);
			continue;
		}

		const name = path.basename(file, ".md");
		const desc = (data.description || "")
			.replace(/\s+/g, " ")
			.trim()
			.replace(/"/g, '\\"');

		const mdc = [
			"---",
			`description: "${desc}"`,
			'globs: "*"',
			"alwaysApply: false",
			"---",
			"",
			body,
		].join("\n");

		fs.writeFileSync(path.join(outputDir, `${name}.mdc`), mdc);
	}
}

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

	const outputDirs = ["output"];
	const memoryDirs = [
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
	let agentCount = 20;
	if (fs.existsSync(agentsDir)) {
		const agentFiles = fs
			.readdirSync(agentsDir)
			.filter((f) => f.endsWith(".md"));
		agentCount = agentFiles.length || 20;
	}

	const memoryPath = path.join(artifactsDir, "memory");
	const isoDate = new Date().toISOString().split("T")[0];

	fs.writeFileSync(
		path.join(memoryPath, "project-context.md"),
		`# Project Context

## [CORE]
Project: ${projectName} (startup)
Stack: None
Phase: validation
Sprint: none
Blockers: 0

## [IDENTITY]
User Nickname: ${userNickname}

<!-- BEGIN MACHINE STATE -->
## [RUNTIME STATE]
- Stack: None
- Git Branch: none
- Active Phase: validation
- Active Sprint: none
- Blocker Status: 0 active blockers
- Engine Version: 2.0.7
<!-- END MACHINE STATE -->

## Session Activity
_(auto-populated on every session by @memory-controller / orchestrator_state.js)_

## Identity
- **Project Name**: ${projectName}
- **Repository**: ${detectRepository()}
- **User Nickname**: ${userNickname}
- **Created**: ${isoDate}

## Technical
- **Stack**: None (Starting from scratch)
- **Architecture**: Not yet defined
- **Constraints**: None recorded

## Team

- **Operation Mode**: semi-autonomous
- **Active Agents**: ${agentCount} agents

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

function bootstrapRootDocs(targetDir, projectName, selectedHarnesses) {
	const canonicalFile = fs.existsSync(path.join(targetDir, ".agents", "templates", "system", "AGENTS.md.canonical"))
		? path.join(targetDir, ".agents", "templates", "system", "AGENTS.md.canonical")
		: fs.existsSync(path.join(targetDir, ".agents", "templates", "system", "agent.md.canonical"))
		? path.join(targetDir, ".agents", "templates", "system", "agent.md.canonical")
		: fs.existsSync(path.join(AGENTS_SRC, "templates", "system", "AGENTS.md.canonical"))
		? path.join(AGENTS_SRC, "templates", "system", "AGENTS.md.canonical")
		: path.join(AGENTS_SRC, "templates", "system", "agent.md.canonical");

	const canonicalContent = fs.existsSync(canonicalFile)
		? fs.readFileSync(canonicalFile, "utf8").replace(/\{Project Name\}/g, projectName)
		: "";

	const agentsMd = canonicalContent;
	const agentMd = canonicalContent;
	const claudeMd = canonicalContent.replace(/\.agents\//g, ".claude/");

	const agentsPath = path.join(targetDir, "AGENTS.md");
	const agentPath = path.join(targetDir, "agent.md");

	if (dryRun) {
		if (!fs.existsSync(agentsPath)) logDry(`Would create AGENTS.md`);
		if (!fs.existsSync(agentPath)) logDry(`Would create agent.md`);
		if (selectedHarnesses.includes("claude")) logDry(`Would create CLAUDE.md`);
		return;
	}

	if (!fs.existsSync(agentsPath)) fs.writeFileSync(agentsPath, agentsMd);
	if (!fs.existsSync(agentPath)) fs.writeFileSync(agentPath, agentMd);

	if (selectedHarnesses.includes("claude")) {
		const claudePath = path.join(targetDir, "CLAUDE.md");
		if (!fs.existsSync(claudePath)) fs.writeFileSync(claudePath, claudeMd);
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
		const relParts = path.relative(dir, file).split(path.sep);
		if (relParts.includes("node_modules") || relParts.includes(".git")) continue;
		let content = fs.readFileSync(file, "utf8");
		const updated = content.replace(/\.opencode(?=\/|\b)/g, ".agents");
		if (updated !== content) {
			if (dryRun) {
				logDry(`Would update paths in: ${file}`);
			} else {
				fs.writeFileSync(file, updated);
			}
		}
	}
}

function printSummary(targetDir, selections) {
	const agentsDir = path.join(targetDir, ".agents", "agents");
	const count = fs.existsSync(agentsDir)
		? fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md")).length
		: 23;

	const lines = [
		`\n============================================================`,
		`   VESPYR v${VERSION} — Installation Complete`,
		`============================================================`,
		``,
		`  Target:       ${targetDir}`,

		`  Harnesses:    ${selections.harnesses.join(", ") || "core only"}`,
		``,
		`  Created:`,
		`    ✓ .agents/                        (core agent engine)`,
		`    ✓ AGENTS.md                       (harness-agnostic guide)`,
		`    ✓ agent.md                        (agent quick reference)`,
		`    ✓ artifacts/                      (memory + output directories)`,
	];

	if (selections.harnesses.includes("opencode"))
		lines.push(`    ✓ .opencode -> .agents            (opencode harness)`);
	if (selections.harnesses.includes("claude")) {
		lines.push(`    ✓ .claude -> .agents              (Claude Code harness)`);
		lines.push(
			`    ✓ CLAUDE.md                       (Claude Code project memory)`,
		);
	}
	if (selections.harnesses.includes("cursor"))
		lines.push(`    ✓ .cursor/rules/*.mdc             (${count} Cursor rules)`);
	if (selections.harnesses.includes("github"))
		lines.push(`    ✓ .github/agents/*.yml            (${count} Copilot agents)`);
	if (selections.harnesses.includes("windsurf")) {
		lines.push(`    ✓ .windsurf/workflows -> skills   (Windsurf workflows)`);
		lines.push(`    ✓ .windsurfrules -> GUARDRAILS    (Windsurf rules)`);
	}
	if (selections.harnesses.includes("kiro")) {
		lines.push(`    ✓ .kiro/steering/vespyr-steering.md (Kiro steering)`);
		lines.push(`    ✓ .kiro/skills -> skills          (Kiro skills)`);
	}

	lines.push(
		``,
		`  Next steps:`,
		`    1. Run /init to bootstrap your project context`,
		`    2. Type @founder, /validate-idea, or /validate-game-idea "your idea" to stress-test a concept`,
		`    3. Use @help-me for a tailored navigation report`,

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
	if (IS_TTY) process.stdout.write("\x1b[2J\x1b[H");
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
		const promptStr = `\n  ${display}: `;

		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			terminal: true,
		});

		rl.question(promptStr, (answer) => {
			rl.close();
			const result = answer.trim() || defaultVal;
			resolve(result);
		});
	});
}

async function installHarnesses(targetDir, selections, method) {
	const agentsTarget = path.join(targetDir, ".agents");

	if (selections.includes("opencode")) {
		const linkPath = path.join(targetDir, ".opencode");
		handleConflict(linkPath, ".opencode", targetDir, method);
		if (!fs.existsSync(linkPath)) {
			createLinkOrCopy(
				path.relative(targetDir, agentsTarget),
				linkPath,
				"dir",
				method,
			);
		}
	}

	if (selections.includes("claude")) {
		const linkPath = path.join(targetDir, ".claude");
		handleConflict(linkPath, ".claude", targetDir, method);
		if (!fs.existsSync(linkPath)) {
			createLinkOrCopy(
				path.relative(targetDir, agentsTarget),
				linkPath,
				"dir",
				method,
			);
		}
	}

	if (selections.includes("cursor")) {
		const rulesDir = path.join(targetDir, ".cursor", "rules");
		if (!dryRun && !fs.existsSync(rulesDir)) {
			fs.mkdirSync(rulesDir, { recursive: true });
		}
		transpileCursorMDC(path.join(agentsTarget, "agents"), rulesDir);
	}

	if (selections.includes("github")) {
		const agentsOutDir = path.join(targetDir, ".github", "agents");
		if (!dryRun && !fs.existsSync(agentsOutDir)) {
			fs.mkdirSync(agentsOutDir, { recursive: true });
		}
		transpileCopilotYAML(path.join(agentsTarget, "agents"), agentsOutDir);

		const copilotInstructions = path.join(
			targetDir,
			".github",
			"copilot-instructions.md",
		);
		const agentsMdPath = path.join(targetDir, "AGENTS.md");
		if (!fs.existsSync(copilotInstructions)) {
			createLinkOrCopy(
				path.relative(path.join(targetDir, ".github"), agentsMdPath),
				copilotInstructions,
				"file",
				method,
			);
		}
	}

	if (selections.includes("windsurf")) {
		const workflowsDir = path.join(targetDir, ".windsurf", "workflows");
		if (!dryRun) {
			fs.mkdirSync(path.join(targetDir, ".windsurf"), { recursive: true });
		}
		handleConflict(workflowsDir, "windsurf workflows", targetDir, method);
		if (!fs.existsSync(workflowsDir)) {
			createLinkOrCopy(
				path.relative(
					path.join(targetDir, ".windsurf"),
					path.join(agentsTarget, "skills"),
				),
				workflowsDir,
				"dir",
				method,
			);
		}

		const windsurfRules = path.join(targetDir, ".windsurfrules");
		handleConflict(windsurfRules, ".windsurfrules", targetDir, method);
		if (!fs.existsSync(windsurfRules)) {
			createLinkOrCopy(
				path.relative(targetDir, path.join(agentsTarget, "GUARDRAILS.md")),
				windsurfRules,
				"file",
				method,
			);
		}
	}

	if (selections.includes("kiro")) {
		const kiroDir = path.join(targetDir, ".kiro");
		const steeringDir = path.join(kiroDir, "steering");
		const skillsDir = path.join(kiroDir, "skills");

		if (!dryRun) {
			fs.mkdirSync(kiroDir, { recursive: true });
		}

		if (fs.existsSync(steeringDir)) {
			try {
				const stat = fs.lstatSync(steeringDir);
				if (stat.isSymbolicLink()) {
					if (!dryRun) fs.unlinkSync(steeringDir);
				}
			} catch (e) {}
		}

		if (!dryRun && !fs.existsSync(steeringDir)) {
			fs.mkdirSync(steeringDir, { recursive: true });
		}

		handleConflict(skillsDir, "kiro skills", targetDir, method);
		if (!fs.existsSync(skillsDir)) {
			createLinkOrCopy(
				path.relative(kiroDir, path.join(agentsTarget, "skills")),
				skillsDir,
				"dir",
				method,
			);
		}

		const steeringAgentsPath = path.join(steeringDir, "vespyr-steering.md");
		const canonicalSource = fs.existsSync(
			path.join(agentsTarget, "templates", "system", "vespyr-steering.md.canonical"),
		)
			? path.join(agentsTarget, "templates", "system", "vespyr-steering.md.canonical")
			: fs.existsSync(path.join(agentsTarget, "templates", "system", "agent.md.canonical"))
			? path.join(agentsTarget, "templates", "system", "agent.md.canonical")
			: path.join(targetDir, "AGENTS.md");

		handleConflict(
			steeringAgentsPath,
			"kiro steering vespyr-steering.md",
			targetDir,
			method,
		);
		if (!fs.existsSync(steeringAgentsPath)) {
			createLinkOrCopy(
				path.relative(steeringDir, canonicalSource),
				steeringAgentsPath,
				"file",
				method,
			);
		}
	}

	if (!selections.includes("opencode")) {
		const targetCommands = path.join(agentsTarget, "commands");
		if (fs.existsSync(targetCommands)) {
			if (!dryRun) {
				fs.rmSync(targetCommands, { recursive: true, force: true });
			} else {
				logDry(
					`Would remove commands folder from ${agentsTarget} because opencode is not selected`,
				);
			}
		}
	}
}

function handleConflict(linkPath, name, targetDir, method = "symlink") {
	try {
		const stat = fs.lstatSync(linkPath);
		if (stat.isSymbolicLink()) {
			const target = fs.readlinkSync(linkPath);
			const normTarget = target.replace(/\\/g, "/");
			const home = os.homedir().replace(/\\/g, "/");
			if (
				method === "symlink" &&
				(normTarget === ".agents" ||
					normTarget.endsWith("/.agents") ||
					normTarget.includes(".agents/") ||
					normTarget === `${home}/.agents` ||
					normTarget === `${home}/.agents/skills` ||
					normTarget === `${home}/.agents/agents` ||
					normTarget === `${home}/.agents/GUARDRAILS.md`)
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
			throw e;
		}
	}
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
		github: path.join(home, ".config", "github-copilot"),
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
				: path.join(home, ".config", "Cursor", "User", "globalRules"),
	};

	return paths[harness] || null;
}

function detectInstalledHarnesses(targetDir, isGlobal) {
	const getPath = (harness, localRel) =>
		isGlobal ? getGlobalPath(harness) : path.join(targetDir, localRel);
	const out = [];
	if (fs.existsSync(getPath("opencode", ".opencode"))) out.push("opencode");
	if (fs.existsSync(getPath("claude", ".claude"))) out.push("claude");
	if (fs.existsSync(path.join(getPath("cursor", ".cursor"), "rules")))
		out.push("cursor");
	if (fs.existsSync(path.join(getPath("github", ".github"), "agents")))
		out.push("github");
	if (fs.existsSync(path.join(getPath("windsurf", ".windsurf"), "workflows")))
		out.push("windsurf");
	if (
		fs.existsSync(path.join(getPath("kiro", ".kiro"), "steering")) ||
		fs.existsSync(path.join(getPath("kiro", ".kiro"), "skills"))
	)
		out.push("kiro");
	return out;
}

function detectMethod(targetDir, isGlobal) {
	const getPath = (harness, localRel) =>
		isGlobal ? getGlobalPath(harness) : path.join(targetDir, localRel);

	const checkPaths = [
		getPath("opencode", ".opencode"),
		getPath("claude", ".claude"),
		path.join(getPath("windsurf", ".windsurf"), "workflows"),
		path.join(getPath("kiro", ".kiro"), "skills"),
		path.join(getPath("kiro", ".kiro"), "steering", "AGENTS.md"),
	];

	for (const p of checkPaths) {
		if (fs.existsSync(p)) {
			try {
				const stat = fs.lstatSync(p);
				if (stat.isSymbolicLink()) return "symlink";
			} catch (e) {}
		}
	}

	for (const p of checkPaths) {
		if (fs.existsSync(p)) {
			try {
				const stat = fs.lstatSync(p);
				if (!stat.isSymbolicLink()) return "copy";
			} catch (e) {}
		}
	}

	return "symlink";
}

const MANIFEST_EXCLUDE = new Set([
	".DS_Store",
	".vespyr-version",
	".vespyr-manifest.json",
]);

function buildSourceManifest(srcDir) {
	const manifest = [];
	function walk(d, rel) {
		let entries;
		try {
			entries = fs.readdirSync(d, { withFileTypes: true });
		} catch (e) {
			return;
		}
		for (const entry of entries) {
			if (MANIFEST_EXCLUDE.has(entry.name)) continue;
			if (entry.name === ".git" || entry.name === "node_modules") continue;
			const relPath = rel ? `${rel}/${entry.name}` : entry.name;
			if (entry.isDirectory()) {
				walk(path.join(d, entry.name), relPath);
			} else {
				manifest.push(relPath);
			}
		}
	}
	walk(srcDir, "");
	return manifest;
}

function writeManifest(targetDir) {
	if (dryRun) {
		logDry(`Would write manifest file in ${path.join(targetDir, ".agents")}`);
		return;
	}
	const manifest = buildSourceManifest(AGENTS_SRC);
	fs.writeFileSync(
		path.join(targetDir, ".agents", ".vespyr-manifest.json"),
		JSON.stringify(manifest),
	);
}

function removeStaleManifestFiles(targetDir) {
	const agentsTarget = path.join(targetDir, ".agents");
	const manifestPath = path.join(agentsTarget, ".vespyr-manifest.json");
	if (!fs.existsSync(manifestPath)) return;

	let prev;
	try {
		prev = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
	} catch (e) {
		return;
	}
	if (!Array.isArray(prev)) return;

	const next = buildSourceManifest(AGENTS_SRC);
	const nextSet = new Set(next);

	for (const rel of prev) {
		if (nextSet.has(rel)) continue;
		const target = path.resolve(agentsTarget, rel);
		if (!target.startsWith(agentsTarget + path.sep)) continue;
		if (fs.existsSync(target)) {
			try {
				fs.rmSync(target, { recursive: true, force: true });
			} catch (e) {
				// ignore
			}
		}
	}
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
	writeManifest(globalAgentsDir);

	if (!selections.includes("opencode")) {
		const globalCommands = path.join(globalAgentsDir, "commands");
		if (fs.existsSync(globalCommands)) {
			fs.rmSync(globalCommands, { recursive: true, force: true });
		}
	}

	// Create harness links at global paths
	const harnessLinkMap = {
		opencode: { type: "dir", source: path.join(globalAgentsDir) },
		claude: { type: "dir", source: path.join(globalAgentsDir) },
		cursor: {
			type: "dir",
			source: path.join(globalAgentsDir, "agents"),
			output: "rules",
		},
		github: {
			type: "dir",
			source: path.join(globalAgentsDir, "agents"),
			output: "agents",
		},
		windsurf: {
			type: "dir",
			source: path.join(globalAgentsDir, "skills"),
			output: "workflows",
		},
		kiro: {
			type: "dir",
			source: path.join(globalAgentsDir, "skills"),
			output: "skills",
		},
	};

	for (const h of selections) {
		const config = harnessLinkMap[h];
		if (!config) continue;

		const globalTarget = getGlobalPath(h);
		if (!globalTarget) continue;

		if (h === "cursor" || h === "github" || h === "windsurf" || h === "kiro") {
			// These need subdirectory handling
			const parentDir = path.dirname(globalTarget);
			if (!fs.existsSync(parentDir))
				fs.mkdirSync(parentDir, { recursive: true });
			if (!fs.existsSync(globalTarget))
				fs.mkdirSync(globalTarget, { recursive: true });

			if (h === "cursor") {
				const rulesDir = path.join(globalTarget, "rules");
				if (!fs.existsSync(rulesDir))
					fs.mkdirSync(rulesDir, { recursive: true });
				transpileCursorMDC(config.source, rulesDir);
			} else if (h === "github") {
				const agentsDir = path.join(globalTarget, "agents");
				if (!fs.existsSync(agentsDir))
					fs.mkdirSync(agentsDir, { recursive: true });
				transpileCopilotYAML(config.source, agentsDir);
			} else if (h === "windsurf") {
				const workflowsDir = path.join(globalTarget, "workflows");
				handleConflict(workflowsDir, `${h} workflows`, home, method);
				if (!fs.existsSync(workflowsDir)) {
					createLinkOrCopy(config.source, workflowsDir, "dir", method);
				}
				// Also create .windsurfrules
				const windsurfRules = path.join(home, ".windsurfrules");
				handleConflict(windsurfRules, ".windsurfrules", home, method);
				if (!fs.existsSync(windsurfRules)) {
					createLinkOrCopy(
						path.join(globalAgentsDir, "GUARDRAILS.md"),
						windsurfRules,
						"file",
						method,
					);
				}
			} else if (h === "kiro") {
				const skillsDir = path.join(globalTarget, "skills");
				handleConflict(skillsDir, `${h} skills`, home, method);
				if (!fs.existsSync(skillsDir)) {
					createLinkOrCopy(config.source, skillsDir, "dir", method);
				}
				const steeringDir = path.join(globalTarget, "steering");
				if (!fs.existsSync(steeringDir)) {
					fs.mkdirSync(steeringDir, { recursive: true });
				}
				const steeringAgentsPath = path.join(steeringDir, "vespyr-steering.md");
				handleConflict(
					steeringAgentsPath,
					`${h} steering vespyr-steering.md`,
					home,
					method,
				);
				if (!fs.existsSync(steeringAgentsPath)) {
					const canonicalSource = fs.existsSync(
						path.join(globalAgentsDir, "templates", "system", "vespyr-steering.md.canonical"),
					)
						? path.join(globalAgentsDir, "templates", "system", "vespyr-steering.md.canonical")
						: fs.existsSync(path.join(globalAgentsDir, "templates", "system", "agent.md.canonical"))
						? path.join(globalAgentsDir, "templates", "system", "agent.md.canonical")
						: path.join(globalAgentsDir, "AGENTS.md");
					createLinkOrCopy(
						canonicalSource,
						steeringAgentsPath,
						"file",
						method,
					);
				}
			}
		} else {
			// Simple dir symlinks (opencode, claude)
			handleConflict(globalTarget, h, home, method);
			if (!fs.existsSync(globalTarget)) {
				createLinkOrCopy(config.source, globalTarget, "dir", method);
			}
		}
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
					"What should the agent call you? (e.g., Lyor, Laura)",
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
	writeManifest(targetDir);

	const projectName = path.basename(targetDir);
	scaffoldArtifacts(targetDir, projectName, userNickname);
	installGitHook(targetDir);
	bootstrapRootDocs(targetDir, projectName, selections);
	performSyncDocs(targetDir);
	await installHarnesses(targetDir, selections, method);

	if (!dryRun) {
		printSummary(targetDir, { harnesses: selections });
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

	removeStaleManifestFiles(targetDir);
	fs.cpSync(AGENTS_SRC, agentsTarget, { recursive: true });

	writeVersionFile(targetDir);
	writeManifest(targetDir);

	let installedHarnesses = detectInstalledHarnesses(targetDir, false);
	let method = detectMethod(targetDir, false);

	const projectName = path.basename(targetDir);
	bootstrapRootDocs(targetDir, projectName, installedHarnesses);
	performSyncDocs(targetDir);

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
	let prevHarnesses = detectInstalledHarnesses(targetDir, isGlobal);

	let selections = flags.harnesses.length > 0 ? flags.harnesses : [];
	let method = detectMethod(targetDir, isGlobal);
	let userNickname = getExistingUserNickname(targetDir);

	if (!flags.yes) {
		selections = await askChecklist(
			"Select harness integrations to configure:",
			HARNESS_OPTIONS,
			false,
			prevHarnesses,
		);

		const methodChoice = await askSingleChoice(
			"Select installation method:",
			[
				"Symlink (Recommended - references the master folder, allowing prompt updates to automatically propagate)",
				"Copy (Static copy of all agent folders and files)",
			],
		);
		method = methodChoice === 0 ? "symlink" : "copy";

		const contextPath = path.join(
			targetDir,
			"artifacts",
			"memory",
			"project-context.md",
		);
		if (fs.existsSync(contextPath)) {
			userNickname = await askQuestion(
				"What should the agent call you? (e.g., Lyor, Laura)",
				userNickname,
			);
			userNickname = userNickname.replace(/[^a-zA-Z0-9\s\-_.]/g, "") || "User";
			updateUserNickname(targetDir, userNickname);
		}
	}

	// Uninstall deselected harnesses
	const removedHarnesses = prevHarnesses.filter((h) => !selections.includes(h));
	if (removedHarnesses.length > 0) {
		uninstallHarnesses(targetDir, removedHarnesses, isGlobal);
	}

	const projectName = path.basename(targetDir);
	bootstrapRootDocs(targetDir, projectName, selections);
	performSyncDocs(targetDir);

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
		"skills.md",
		"workflow.md",
		".vespyr-version",
		".vespyr-manifest.json",
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

function uninstallHarnesses(targetDir, harnesses, isGlobal) {
	const home = os.homedir();
	const getPath = (harness, localRel) => {
		if (isGlobal) {
			return getGlobalPath(harness);
		}
		return path.join(targetDir, localRel);
	};

	for (const h of harnesses) {
		if (h === "opencode") {
			const opencodePath = getPath("opencode", ".opencode");
			if (fs.existsSync(opencodePath)) {
				surgicallyCleanupAgentsDir(opencodePath);
			}
		}

		if (h === "claude") {
			const claudePath = getPath("claude", ".claude");
			if (fs.existsSync(claudePath)) {
				surgicallyCleanupAgentsDir(claudePath);
			}
		}

		if (h === "cursor") {
			const cursorTargetDir = getPath("cursor", ".cursor");
			if (fs.existsSync(cursorTargetDir)) {
				const rulesDir = path.join(cursorTargetDir, "rules");
				if (fs.existsSync(rulesDir)) {
					try {
						const stat = fs.lstatSync(rulesDir);
						if (stat.isSymbolicLink()) {
							fs.unlinkSync(rulesDir);
						} else {
							const agentsSrcDir = path.join(AGENTS_SRC, "agents");
							if (fs.existsSync(agentsSrcDir)) {
								const coreAgents = fs
									.readdirSync(agentsSrcDir)
									.filter((f) => f.endsWith(".md"));
								for (const agent of coreAgents) {
									const name = path.basename(agent, ".md");
									const mdcFile = path.join(rulesDir, `${name}.mdc`);
									if (fs.existsSync(mdcFile)) {
										fs.unlinkSync(mdcFile);
									}
								}
							}
							removeDirIfEmpty(rulesDir);
						}
					} catch (e) {}
				}
				removeDirIfEmpty(cursorTargetDir);
			}
		}

		if (h === "github") {
			const githubTargetDir = getPath("github", ".github");
			if (fs.existsSync(githubTargetDir)) {
				const agentsDir = path.join(githubTargetDir, "agents");
				if (fs.existsSync(agentsDir)) {
					try {
						const stat = fs.lstatSync(agentsDir);
						if (stat.isSymbolicLink()) {
							fs.unlinkSync(agentsDir);
						} else {
							const agentsSrcDir = path.join(AGENTS_SRC, "agents");
							if (fs.existsSync(agentsSrcDir)) {
								const coreAgents = fs
									.readdirSync(agentsSrcDir)
									.filter((f) => f.endsWith(".md"));
								for (const agent of coreAgents) {
									const name = path.basename(agent, ".md");
									const ymlFile = path.join(agentsDir, `${name}.yml`);
									if (fs.existsSync(ymlFile)) {
										fs.unlinkSync(ymlFile);
									}
								}
							}
							removeDirIfEmpty(agentsDir);
						}
					} catch (e) {}
				}

				const copilotInstructions = path.join(
					githubTargetDir,
					"copilot-instructions.md",
				);
				if (fs.existsSync(copilotInstructions)) {
					try {
						fs.unlinkSync(copilotInstructions);
					} catch (e) {}
				}

				removeDirIfEmpty(githubTargetDir);
			}
		}

		if (h === "windsurf") {
			const windsurfTargetDir = getPath("windsurf", ".windsurf");
			if (fs.existsSync(windsurfTargetDir)) {
				const workflowsDir = path.join(windsurfTargetDir, "workflows");
				if (fs.existsSync(workflowsDir)) {
					try {
						const stat = fs.lstatSync(workflowsDir);
						if (stat.isSymbolicLink()) {
							fs.unlinkSync(workflowsDir);
						} else {
							const skillsSrcDir = path.join(AGENTS_SRC, "skills");
							if (fs.existsSync(skillsSrcDir)) {
								const coreSkills = fs.readdirSync(skillsSrcDir);
								for (const skill of coreSkills) {
									const skillPath = path.join(workflowsDir, skill);
									if (fs.existsSync(skillPath)) {
										fs.rmSync(skillPath, { recursive: true, force: true });
									}
								}
							}
							removeDirIfEmpty(workflowsDir);
						}
					} catch (e) {}
				}
				removeDirIfEmpty(windsurfTargetDir);
			}
			const windsurfRulesPath = isGlobal
				? path.join(home, ".windsurfrules")
				: path.join(targetDir, ".windsurfrules");
			if (fs.existsSync(windsurfRulesPath)) {
				try {
					fs.unlinkSync(windsurfRulesPath);
				} catch (e) {}
			}
		}

		if (h === "kiro") {
			const kiroTargetDir = getPath("kiro", ".kiro");
			if (fs.existsSync(kiroTargetDir)) {
				const skillsDir = path.join(kiroTargetDir, "skills");
				if (fs.existsSync(skillsDir)) {
					try {
						const stat = fs.lstatSync(skillsDir);
						if (stat.isSymbolicLink()) {
							fs.unlinkSync(skillsDir);
						} else {
							const skillsSrcDir = path.join(AGENTS_SRC, "skills");
							if (fs.existsSync(skillsSrcDir)) {
								const coreSkills = fs.readdirSync(skillsSrcDir);
								for (const skill of coreSkills) {
									const skillPath = path.join(skillsDir, skill);
									if (fs.existsSync(skillPath)) {
										fs.rmSync(skillPath, { recursive: true, force: true });
									}
								}
							}
							removeDirIfEmpty(skillsDir);
						}
					} catch (e) {}
				}

				const steeringDir = path.join(kiroTargetDir, "steering");
				if (fs.existsSync(steeringDir)) {
					try {
						const stat = fs.lstatSync(steeringDir);
						if (stat.isSymbolicLink()) {
							fs.unlinkSync(steeringDir);
						} else {
							const vespyrSteering = path.join(steeringDir, "vespyr-steering.md");
							if (fs.existsSync(vespyrSteering)) {
								fs.unlinkSync(vespyrSteering);
							}
							const agentsSrcDir = path.join(AGENTS_SRC, "agents");
							if (fs.existsSync(agentsSrcDir)) {
								const coreAgents = fs
									.readdirSync(agentsSrcDir)
									.filter((f) => f.endsWith(".md"));
								for (const agent of coreAgents) {
									const targetAgentPath = path.join(steeringDir, agent);
									if (fs.existsSync(targetAgentPath)) {
										fs.rmSync(targetAgentPath, {
											recursive: true,
											force: true,
										});
									}
								}
							}
							removeDirIfEmpty(steeringDir);
						}
					} catch (e) {}
				}
				removeDirIfEmpty(kiroTargetDir);
			}
		}
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

async function performMigration(targetDir, flags) {
	log(`\n============================================================`);
	log(`   VESPYR v${VERSION} — Migration Detected`);
	log(`============================================================`);
	log(`An existing .opencode/ directory was found. This appears to be`);
	log(`a pre-v1.7.0 Vespyr installation (cloned repo style).`);
	log(``);
	log(`Vespyr v1.7.0 uses .agents/ as the canonical folder with`);
	log(`optional harness symlinks. We can migrate your setup.\n`);

	if (flags.yes) {
		await executeMigration(targetDir);
		return;
	}

	const choice = await askSingleChoice("Select an action:", [
		"Migrate (Rename .opencode/ to .agents/, create .opencode symlink)",
		"Fresh install (Back up .opencode/ to .opencode.backup/, start fresh)",
		"Cancel (Keep everything as-is)",
	]);

	if (choice === 0) {
		await executeMigration(targetDir);
	} else if (choice === 1) {
		const backupPath = path.join(targetDir, `.opencode.backup.${Date.now()}`);
		if (!dryRun) {
			fs.renameSync(path.join(targetDir, ".opencode"), backupPath);
		}
		log(`  Backed up .opencode/ to ${path.basename(backupPath)}`);
		await performFreshInstall(targetDir, flags);
	} else {
		log(`  Migration cancelled.\n`);
		process.exit(0);
	}
}

async function executeMigration(targetDir) {
	log(`\n  Migrating .opencode/ to .agents/...\n`);

	if (dryRun) {
		logDry(`Would backup .opencode/ to .opencode.backup/`);
		logDry(`Would rename .opencode/ to .agents/`);
		logDry(`Would move tests/ to workspace root`);
		logDry(`Would create .opencode -> .agents symlink`);
		logDry(`Would update .opencode/ references to .agents/ in all files`);
		return;
	}

	const opencodePath = path.join(targetDir, ".opencode");
	const agentsPath = path.join(targetDir, ".agents");
	const backupPath = path.join(targetDir, `.opencode.backup.${Date.now()}`);

	fs.cpSync(opencodePath, backupPath, { recursive: true });
	log(`  Backed up to ${path.basename(backupPath)}`);

	fs.renameSync(opencodePath, agentsPath);
	log(`  Renamed .opencode/ to .agents/`);

	const testsInAgents = path.join(agentsPath, "tests");
	const testsAtRoot = path.join(targetDir, "tests");
	if (fs.existsSync(testsInAgents) && !fs.existsSync(testsAtRoot)) {
		fs.renameSync(testsInAgents, testsAtRoot);
		log(`  Moved tests/ to workspace root`);
	}

	try {
		createLinkOrCopy(".agents", opencodePath, "dir", "symlink");
		log(`  Created .opencode -> .agents link`);
	} catch (e) {
		logWarn(`Could not create .opencode link: ${e.message}`);
	}

	updatePathsInDir(agentsPath);
	log(`  Updated .opencode/ -> .agents/ references in all files`);

	writeVersionFile(targetDir);
	log(`\n  Migration complete.\n`);
}

function performSyncDocs(targetDir) {
	if (dryRun) {
		logDry(`Would sync documentation entry points in ${targetDir}`);
		return;
	}

	const syncScript = path.join(
		targetDir,
		".agents",
		"scripts",
		"sync-entry-points.js",
	);

	if (fs.existsSync(syncScript)) {
		const { execSync } = require("child_process");
		execSync(`"${process.execPath}" "${syncScript}"`, { cwd: targetDir, stdio: "inherit" });

		const validateScript = path.join(
			targetDir,
			".agents",
			"scripts",
			"validate_frontmatter.js",
		);
		if (fs.existsSync(validateScript)) {
			execSync(`"${process.execPath}" "${validateScript}"`, {
				cwd: targetDir,
				stdio: "inherit",
			});
		}
		return;
	}

	// Fallback: template-based approach from agent.md.canonical
	const canonicalFile = fs.existsSync(path.join(targetDir, ".agents", "templates", "system", "AGENTS.md.canonical"))
		? path.join(targetDir, ".agents", "templates", "system", "AGENTS.md.canonical")
		: fs.existsSync(path.join(targetDir, ".agents", "templates", "system", "agent.md.canonical"))
		? path.join(targetDir, ".agents", "templates", "system", "agent.md.canonical")
		: fs.existsSync(path.join(AGENTS_SRC, "templates", "system", "AGENTS.md.canonical"))
		? path.join(AGENTS_SRC, "templates", "system", "AGENTS.md.canonical")
		: path.join(AGENTS_SRC, "templates", "system", "agent.md.canonical");

	if (fs.existsSync(canonicalFile)) {
		const canonicalContent = fs.readFileSync(canonicalFile, "utf8").replace(/\{Project Name\}/g, path.basename(targetDir));
		const agentsPath = path.join(targetDir, "AGENTS.md");
		const agentPath = path.join(targetDir, "agent.md");
		if (!fs.existsSync(agentsPath)) fs.writeFileSync(agentsPath, canonicalContent);
		if (!fs.existsSync(agentPath)) fs.writeFileSync(agentPath, canonicalContent);
	}
}

function generateManifestData(targetDir) {
	const crypto = require("crypto");
	const agentsTarget = path.join(targetDir, ".agents");
	if (!fs.existsSync(agentsTarget)) {
		throw new Error(".agents directory not found");
	}
	const files = {};
	function hashFile(filePath) {
		const buffer = fs.readFileSync(filePath);
		return crypto.createHash("sha256").update(buffer).digest("hex");
	}
	function walk(dir, rel) {
		const entries = fs.readdirSync(dir, { withFileTypes: true });
		for (const ent of entries) {
			if (ent.name === ".DS_Store" || ent.name === "node_modules" || ent.name === ".git") continue;
			if (ent.name === "manifest.json" || ent.name === ".vespyr-manifest.json") continue;
			const full = path.join(dir, ent.name);
			const relPath = rel ? `${rel}/${ent.name}` : ent.name;
			if (ent.isDirectory()) {
				walk(full, relPath);
			} else {
				files[relPath] = hashFile(full);
			}
		}
	}
	walk(agentsTarget, "");
	// N-14 scope extension (closed 2026-08-23): §5.2 puts the verifier binary
	// itself and root lockfiles in manifest scope. Recorded under `files_root`,
	// keyed relative to targetDir. Optional paths (no lockfile in a scaffold)
	// are simply absent — verify checks them only when present.
	const filesRoot = {};
	const ROOT_SCOPE = ["bin/cli.js", "package-lock.json"];
	for (const relPath of ROOT_SCOPE) {
		const full = path.join(targetDir, relPath);
		if (fs.existsSync(full) && fs.statSync(full).isFile()) {
			filesRoot[relPath] = hashFile(full);
		}
	}
	return {
		version: VERSION,
		generated_at: new Date().toISOString(),
		file_count: Object.keys(files).length,
		files,
		files_root: filesRoot,
	};
}

function performGenerateManifest(targetDir, flags) {
	const manifestPath = path.join(targetDir, ".agents", "manifest.json");
	const manifestData = generateManifestData(targetDir);
	if (dryRun) {
		logDry(`Would write manifest to ${manifestPath} (${manifestData.file_count} files)`);
		return;
	}
	fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2) + "\n", "utf8");
	if (flags.json) {
		console.log(JSON.stringify({ ok: true, manifest: manifestPath, file_count: manifestData.file_count }));
	} else {
		log(`[OK] Generated manifest at ${manifestPath} (${manifestData.file_count} files).`);
	}
}

function performVerify(targetDir, flags) {
	const crypto = require("crypto");
	const agentsTarget = path.join(targetDir, ".agents");
	const manifestPath = path.join(agentsTarget, "manifest.json");
	const jsonMode = flags.json;

	const failClosed = (message) => {
		if (jsonMode) {
			process.stdout.write(JSON.stringify({ exit: 2, fault: message }) + "\n");
		} else {
			console.error(`FAIL-CLOSED: ${message}`);
		}
		process.exitCode = 2;
	};

	if (!fs.existsSync(agentsTarget)) {
		failClosed(".agents directory not found");
		return;
	}

	// N-12 (Victor, fresh audit 2026-08-23): a MISSING manifest is fail-closed.
	// Auto-generating from the current tree verifies the tree against itself —
	// a tampered tree plus a deleted manifest passes clean (TOFU with no OOB
	// check, violating DoD #13/#17). Baselines are created ONLY via the
	// explicit `vespyr manifest` command with a human-reviewed diff.
	if (!fs.existsSync(manifestPath)) {
		failClosed(
			"FAULT-5: manifest missing (.agents/manifest.json) — refusing to verify without a pinned baseline. Create one explicitly via `vespyr manifest` and review the diff."
		);
		return;
	}

	let manifest;
	try {
		manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
	} catch (e) {
		failClosed(`FAULT-4: Corrupt manifest (${e.message})`);
		return;
	}

	if (!manifest || typeof manifest.files !== "object") {
		failClosed("FAULT-4: Invalid manifest schema");
		return;
	}

	const mismatches = [];
	const missing = [];
	const extra = [];
	let verifiedCount = 0;

	for (const [relPath, expectedHash] of Object.entries(manifest.files)) {
		const fullPath = path.join(agentsTarget, relPath);
		if (!fs.existsSync(fullPath)) {
			missing.push(relPath);
			continue;
		}
		const buffer = fs.readFileSync(fullPath);
		const actualHash = crypto.createHash("sha256").update(buffer).digest("hex");
		if (actualHash !== expectedHash) {
			mismatches.push({ path: relPath, expected: expectedHash, actual: actualHash });
		} else {
			verifiedCount++;
		}
	}

	// N-14 scope extension (closed 2026-08-23): verify files_root entries
	// (bin/cli.js, root lockfiles). Present in manifest but missing/modified
	// on disk = verification failure.
	const rootMismatches = [];
	const rootMissing = [];
	if (manifest.files_root && typeof manifest.files_root === "object") {
		for (const [relPath, expectedHash] of Object.entries(manifest.files_root)) {
			const full = path.join(targetDir, relPath);
			if (!fs.existsSync(full)) {
				rootMissing.push(relPath);
				continue;
			}
			const buffer = fs.readFileSync(full);
			const actualHash = crypto.createHash("sha256").update(buffer).digest("hex");
			if (actualHash !== expectedHash) {
				rootMismatches.push({ path: relPath, expected: expectedHash, actual: actualHash });
			} else {
				verifiedCount++;
			}
		}
	}

	// N-14a (Scout/Victor): iterating manifest.files alone is blind to PLANTED
	// files absent from the manifest. Reverse-walk the tree with the same
	// exclusion set as generateManifestData so anything unlisted fails verify.
	const MANIFEST_EXCLUSIONS = new Set([".DS_Store", "node_modules", ".git", "manifest.json", ".vespyr-manifest.json"]);
	let walkFault = null;
	const walkExtra = (dir, rel) => {
		let entries;
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch (e) {
			// O-1 (Victor): an unreadable directory during verification is a
			// tool fault, not an "extra file" — fail closed, never exit 1.
			walkFault = `unreadable directory during verification: ${rel || ".agents/"} (${e.code || e.message})`;
			return;
		}
		for (const ent of entries) {
			if (MANIFEST_EXCLUSIONS.has(ent.name)) continue;
			const full = path.join(dir, ent.name);
			const relPath = rel ? `${rel}/${ent.name}` : ent.name;
			if (ent.isDirectory()) {
				walkExtra(full, relPath);
			} else if (!Object.prototype.hasOwnProperty.call(manifest.files, relPath)) {
				extra.push({ path: relPath, detail: "not in manifest" });
			}
		}
	};
	walkExtra(agentsTarget, "");

	// O-1: unreadable directory surfaced by the reverse-walk = fail closed.
	if (walkFault) {
		failClosed(walkFault);
		return;
	}

	const isClean =
		mismatches.length === 0 &&
		missing.length === 0 &&
		extra.length === 0 &&
		rootMismatches.length === 0 &&
		rootMissing.length === 0;

	if (jsonMode) {
		process.stdout.write(
			JSON.stringify({
				exit: isClean ? 0 : 1,
				verified: verifiedCount,
				missing,
				mismatches,
				extra,
				files_root: { missing: rootMissing, mismatches: rootMismatches },
			}, null, 2) + "\n"
		);
	} else {
		if (isClean) {
			log(`[OK] All ${verifiedCount} files verified against manifest.`);
		} else {
			if (missing.length > 0) {
				console.error(`[FAIL] ${missing.length} missing file(s):`);
				for (const m of missing) console.error(`  - missing: ${m}`);
			}
			if (mismatches.length > 0) {
				console.error(`[FAIL] ${mismatches.length} hash mismatch(es):`);
				for (const m of mismatches) console.error(`  - tampered/modified: ${m.path}`);
			}
			if (extra.length > 0) {
				console.error(`[FAIL] ${extra.length} file(s) not in manifest:`);
				for (const m of extra) console.error(`  - unplanted/unlisted: ${m.path}${m.detail ? ` (${m.detail})` : ""}`);
			}
			if (rootMissing.length > 0) {
				console.error(`[FAIL] ${rootMissing.length} root-scope file(s) missing:`);
				for (const m of rootMissing) console.error(`  - missing: ${m}`);
			}
			if (rootMismatches.length > 0) {
				console.error(`[FAIL] ${rootMismatches.length} root-scope hash mismatch(es):`);
				for (const m of rootMismatches) console.error(`  - tampered/modified: ${m.path}`);
			}
		}
	}

	process.exitCode = isClean ? 0 : 1;
}

function performAudit(targetDir, flags) {
	const scanScript = path.join(__dirname, "..", ".agents", "scripts", "security-scan.js");
	const defaultSpec = path.join(__dirname, "..", "artifacts", "docs", "strategy", "development-plan", "security", "audit-spec.json");
	const specPath = flags.spec || (fs.existsSync(defaultSpec) ? defaultSpec : null);

	if (!specPath || !fs.existsSync(specPath)) {
		if (flags.json) {
			console.log(JSON.stringify({ exit: 2, error: "FAULT-1: Missing audit-spec.json (use --spec <path>)" }));
		} else {
			console.error("FAIL-CLOSED: FAULT-1: Missing audit-spec.json (use --spec <path>)");
		}
		process.exit(2);
	}

	const { execFileSync } = require("child_process");
	const args = [scanScript, "--dir", targetDir, "--spec", specPath];
	if (flags.json) args.push("--json");

	try {
		const out = execFileSync("node", args, { encoding: "utf8", stdio: flags.json ? ["pipe", "pipe", "pipe"] : "inherit" });
		if (flags.json) process.stdout.write(out);
		process.exit(0);
	} catch (e) {
		if (flags.json && e.stdout) {
			process.stdout.write(e.stdout);
		}
		process.exit(e.status == null ? 2 : e.status);
	}
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

	const choice = await askSingleChoice("Select an action:", [
		"Update Vespyr (Sync latest agent prompts, scripts, and skills)",
		"Reconfigure (Re-run interactive setup / add or remove harnesses)",
		"Uninstall Vespyr (Cleanly remove all Vespyr folders and files)",
	]);

	if (choice === 0) {
		await performUpdate(targetDir, flags);
	} else if (choice === 1) {
		await performReconfigure(targetDir, flags);
	} else if (choice === 2) {
		await performUninstall(targetDir);
	}
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
vespyr v${VERSION} — AI Agent Team Installer & Integrity Engine

Usage: npx vespyr [command] [options]

Commands:
  verify               Verify integrity of .agents/ against pinned manifest
  audit                Run supply-chain security and content integrity scan
  manifest             Generate .agents/manifest.json checksums file

Options:
  --dry-run            Preview all actions without making changes
  --yes, -y            Skip all interactive prompts, use defaults
  --target <path>      Specify installation directory
  --harness <names>    Pre-select harness(es), comma-separated
  --spec <path>        Custom path to audit-spec.json (for audit)
  --json               Output machine-readable JSON results
  --version, -v        Print version and exit
  --help, -h           Print usage and exit
  --sync-docs          Sync documentation entry points
  --install-git-hook   Install post-push hook (refreshes project-context after git push)

Examples:
  npx vespyr                          Interactive install
  npx vespyr verify                   Check integrity against manifest
  npx vespyr audit                    Run security scanner
  npx vespyr --yes                    Install with defaults
  npx vespyr --harness opencode,claude  Pre-select harnesses
  npx vespyr --target ./my-project    Install to specific directory
`);
		process.exit(0);
	}

	let targetDir = flags.target ? path.resolve(flags.target) : process.cwd();

	if (flags.verify) {
		performVerify(targetDir, flags);
		return;
	}

	if (flags.audit) {
		performAudit(targetDir, flags);
		return;
	}

	if (flags.manifest) {
		performGenerateManifest(targetDir, flags);
		return;
	}

	if (flags.syncDocs) {
		performSyncDocs(targetDir);
		process.exit(0);
	}

	if (flags.installGitHook) {
		const ok = installGitHook(targetDir);
		process.exit(ok ? 0 : 1);
	}

	if (IS_TTY) log(ASCII_ART);

	const state = detectState(targetDir);

	try {
		if (state === "installed") {
			await showActionMenu(targetDir, flags);
		} else if (state === "migrate") {
			await performMigration(targetDir, flags);
		} else if (state === "repair") {
			log(`\n============================================================`);
			log(`   VESPYR v${VERSION} — Repairing Installation`);
			log(`============================================================`);
			log(`An existing .agents/ directory was found but the version marker`);
			log(`is missing. Syncing the latest files to repair it.\n`);
			await performUpdate(targetDir, flags);
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

		try {
			process.stdin.setRawMode(false);
		} catch (e) {
			/* ignore */
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
	performUninstall,
	surgicallyCleanupAgentsDir,
	removeDirIfEmpty,
	getExistingUserNickname,
	updateUserNickname,
	uninstallHarnesses,
	performReconfigure,
	performUpdate,
	detectInstalledHarnesses,
	detectMethod,
	buildSourceManifest,
	writeManifest,
	removeStaleManifestFiles,
	yamlQuote,
	installGitHook,
	ASCII_ART,
	VERSION,
	HARNESS_OPTIONS,
};
