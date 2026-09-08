#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { detectStack } = require("./lib/detector.js");
const identity = require("../.agents/scripts/lib/identity.js");
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

const {
	ADAPTERS: HARNESS_ADAPTERS,
	HARNESS_OPTIONS,
	REGISTRY: HARNESS_REGISTRY,
	getAdapter: getHarnessAdapter,
} = require("./lib/harnesses/index.js");

const wizardState = {};
const ACTIVE_HARNESS_IDS = new Set(HARNESS_OPTIONS.map((h) => h.id));
const { log, logDry, logError, logWarn } = require("./lib/logger.js");
const { R, R: RUNTIME_STATE, setState, resetRuntimeState } = require("./lib/state.js");
const linkUtils = require("./lib/link-utils.js");
const { createInstaller } = require("./lib/installer.js");
const { createUi } = require("./lib/ui.js");

const uiApi = createUi({ VERSION, ASCII_ART, ADAPTERS: HARNESS_ADAPTERS, IS_TTY, wizardState });
const { printSummary, setupSignalHandler, teardownSignalHandler, clearScreen, printWizardSummary } = uiApi;

const installerApi = createInstaller({
	log,
	logDry,
	logWarn,
	logError,
	askChecklist,
	askSingleChoice,
	askQuestion,
	detectRepository,
	detectMethod,
	performSyncDocs,
	getExistingUserNickname,
	updateUserNickname,
	writeManifest,
	performGenerateManifest,
	buildSourceManifest,
	removeStaleManifestFiles,
	detectInstalledHarnesses,
	installGitHook,
	setupSignalHandler,
	teardownSignalHandler,
	printSummary,
	clearScreen,
	printWizardSummary,
	wizardState,
	ASCII_ART,
	VERSION,
	AGENTS_SRC,
});
const {
	scaffoldArtifacts,
	bootstrapRootDocs,
	writeVersionFile,
	getInstalledVersion,
	installHarnesses,
	uninstallHarnesses,
	surgicallyCleanupAgentsDir,
	removeDirIfEmpty,
	performFreshInstall,
	performUpdate,
	performGlobalInstall,
	performReconfigure,
} = installerApi;

const { handleConflict, createLinkOrCopy } = linkUtils;
function detectRepository(targetDir) {
	const { execFileSync } = require("child_process");
	const cwd = targetDir && fs.existsSync(targetDir) ? targetDir : process.cwd();
	try {
		const inRepo = execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
			encoding: "utf8",
			cwd,
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
		if (inRepo !== "true") return "Not a git repository (local folder)";
		const remote = execFileSync("git", ["config", "--get", "remote.origin.url"], {
			encoding: "utf8",
			cwd,
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
		return remote || "Local git repository (no remote)";
	} catch {
		return "Not a git repository (local folder)";
	}
}

// pre-push hook: refreshes project-context.md (Repository line + CORE fields)
// via the orchestrator's sync-context command. NOTE: git has no `post-push`
// hook — the previous `hooks/post-push` file never executed. The valid
// client-side hook before a push is `pre-push`.
const VESPYR_HOOK_MARKER = "orchestrator_state.js sync-context";
const PRE_PUSH_HOOK = `#!/bin/sh
# Vespyr: refresh project-context.md before a push (vespyr-managed).
# Keeps the Repository line in artifacts/memory/project-context.md in sync
# with the remote configured for this repository.
node .agents/scripts/orchestrator_state.js sync-context >/dev/null 2>&1 || true
`;
const POST_PUSH_HOOK = PRE_PUSH_HOOK;

function installGitHook(targetDir) {
	const gitDir = path.join(targetDir, ".git");
	if (!fs.existsSync(gitDir)) {
		logWarn(
			"No .git directory found — pre-push hook not installed. Run \`git init\` then \`npx vespyr --install-git-hook --target .\` to enable it.",
		);
		return false;
	}
	if (R.dryRun) {
		logDry(`Would install pre-push git hook in ${path.join(gitDir, "hooks")}`);
		return true;
	}
	const hooksDir = path.join(gitDir, "hooks");
	if (!fs.existsSync(hooksDir)) {
		fs.mkdirSync(hooksDir, { recursive: true });
	}
	// Migrate legacy never-executing hooks/post-push installs.
	try {
		const legacy = path.join(hooksDir, "post-push");
		if (fs.existsSync(legacy)) {
			let legacyContent = "";
			try { legacyContent = fs.readFileSync(legacy, "utf8"); } catch {}
			if (legacyContent.includes(VESPYR_HOOK_MARKER)) {
				fs.unlinkSync(legacy);
				log(`  Removed legacy non-executing post-push hook (superseded by pre-push).`);
			}
		}
	} catch {}
	const hookPath = path.join(hooksDir, "pre-push");
	let hasVespyrHook = false;
	try {
		if (fs.existsSync(hookPath)) {
			const content = fs.readFileSync(hookPath, "utf8");
			// Exact managed-line guard: the file must contain the Vespyr
			// managed header, not just a spoofed substring elsewhere.
			hasVespyrHook = content.includes("# Vespyr:") && content.includes(VESPYR_HOOK_MARKER);
		}
	} catch {}
	if (fs.existsSync(hookPath) && !hasVespyrHook) {
		logWarn("Existing pre-push hook found — Vespyr hook NOT overwritten. Merge it manually.");
		return false;
	}
	fs.writeFileSync(hookPath, PRE_PUSH_HOOK, { mode: 0o755 });
	log(`  ✓ pre-push git hook installed (${path.relative(process.cwd(), hookPath)})`);
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
		uninstall: false,
		reconfigure: false,
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
		} else if (arg === "uninstall") {
			flags.uninstall = true;
			flags.command = "uninstall";
		} else if (arg === "reconfigure") {
			flags.reconfigure = true;
			flags.command = "reconfigure";
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
				process.exit(2);
			}
			flags.projectName = val;
		} else if (arg === "--user-nickname") {
			const val = args[++i];
			if (val === undefined || val.startsWith("-")) {
				console.error("Missing value for flag: --user-nickname");
				process.exit(2);
			}
			flags.userNickname = val;
		} else if (arg === "--stack") {
			const val = args[++i];
			if (val === undefined || val.startsWith("-")) {
				console.error("Missing value for flag: --stack");
				process.exit(2);
			}
			flags.stack = val;
		} else if (arg === "--target") {
			const val = args[++i];
			if (val === undefined || val.startsWith("-")) {
				console.error("Missing value for flag: --target");
				process.exit(2);
			}
			flags.target = val;
		} else if (arg === "--harness") {
			const val = args[++i];
			if (val === undefined || val.startsWith("-")) {
				console.error("Missing value for flag: --harness");
				process.exit(2);
			}
			flags.harnesses = val
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
			for (const h of flags.harnesses) {
				const adapter = getHarnessAdapter(h);
				if (!adapter) {
					console.error(
						`Unknown harness: ${h}. Available: ${HARNESS_OPTIONS.map((o) => o.id).join(", ")}`,
					);
					process.exit(2);
				}
				if (adapter.dormant) {
					console.error(
						`Harness "${h}" is dormant in this release (cleanup-only, no install path). Available: ${HARNESS_OPTIONS.map((o) => o.id).join(", ")}`,
					);
					process.exit(2);
				}
			}
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
			process.exit(2);
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
		// An existing .agents/ is NOT automatically a broken Vespyr install:
		// foreign tools also use .agents/. Only repair when Vespyr
		// fingerprints are present; otherwise surface the conflict instead
		// of silently merging Vespyr files into someone else's directory.
		if (isEmptyDir(agentsPath)) {
			return "fresh";
		}
		if (isVespyrAgentsDir(agentsPath)) {
			return "repair";
		}
		return "foreign";
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

/**
 * Vespyr fingerprints: markers a foreign .agents/ directory would not
 * contain. Generic names (agents/, skills/, workflow.md) are deliberately
 * NOT fingerprints — third-party skills use those too.
 */
function isVespyrAgentsDir(agentsPath) {
	const markers = [
		".vespyr-manifest.json",
		"manifest.json",
		"GUARDRAILS.md",
		"templates",
		path.join("scripts", "orchestrator_state.js"),
	];
	return markers.some((rel) => {
		try {
			return fs.existsSync(path.join(agentsPath, rel));
		} catch {
			return false;
		}
	});
}

function isEmptyDir(dirPath) {
	try {
		const entries = fs.readdirSync(dirPath).filter((f) => f !== ".DS_Store");
		return entries.length === 0;
	} catch {
		return false;
	}
}

/**
 * Renames a foreign .agents/ aside so a fresh install can proceed without
 * destroying it. Mirrors the migration backup naming (.opencode.backup.*).
 */
function backupExistingAgentsDir(targetDir) {
	const agentsPath = path.join(targetDir, ".agents");
	const backupPath = path.join(targetDir, `.agents.backup.${Date.now()}`);
	if (R.dryRun) {
		logDry(`Would back up existing non-Vespyr .agents/ to ${path.basename(backupPath)}`);
		return backupPath;
	}
	fs.renameSync(agentsPath, backupPath);
	return backupPath;
}

function parseFrontmatter(content) {
	const match = content.match(/^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)/);
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







function updatePathsInDir(dir) {
	function walkSync(d) {
		const results = [];
		let entries;
		try {
			entries = fs.readdirSync(d, { withFileTypes: true });
		} catch {
			return results;
		}
		for (const entry of entries) {
			const full = path.join(d, entry.name);
			// Never follow symlinked dirs: a linked .agents/ subtree would
			// rewrite out-of-boundary files and loop on cycles.
			if (entry.isSymbolicLink()) continue;
			if (entry.isDirectory()) {
				results.push(...walkSync(full));
			} else {
				results.push(full);
			}
		}
		return results;
	}

	function replaceOutsideCodeFences(content) {
		// Split on fenced code blocks (``` / ~~~); rewrite prose only so
		// `.opencode` inside code samples stays verbatim.
		const parts = content.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g);
		for (let i = 0; i < parts.length; i += 2) {
			parts[i] = parts[i].replace(/\.opencode(?=\/|\b)/g, ".agents");
		}
		return parts.join("");
	}

	const files = walkSync(dir);
	for (const file of files) {
		if (!file.endsWith(".md") && !file.endsWith(".js")) continue;
		const relParts = path.relative(dir, file).split(path.sep);
		if (relParts.includes("node_modules") || relParts.includes(".git")) continue;
		let content;
		try {
			content = fs.readFileSync(file, "utf8");
		} catch {
			continue;
		}
		const updated = file.endsWith(".md") ? replaceOutsideCodeFences(content) : content.replace(/\.opencode(?=\/|\b)/g, ".agents");
		if (updated !== content) {
			if (R.dryRun) {
				logDry(`Would update paths in: ${file}`);
			} else {
				fs.writeFileSync(file, updated);
			}
		}
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



function getGlobalPath(harness) {
	// Single geometry owner: delegate to the adapter registry (harnesses/index).
	const { getGlobalPath: registryGetGlobalPath } = require("./lib/harnesses/index.js");
	return registryGetGlobalPath(harness);
}

function detectInstalledHarnesses(targetDir, isGlobal) {
	const out = [];
	for (const adapter of HARNESS_ADAPTERS) {
		let paths = [];
		try {
			paths = adapter.detectPaths({ targetDir }) || [];
		} catch {
			paths = [];
		}
		const found = paths.some((relOrAbs) => {
			const check = isGlobal ? getGlobalPath(adapter.id) : relOrAbs;
			if (!check) return false;
			try {
				fs.lstatSync(check);
				return true;
			} catch {
				return false;
			}
		});
		if (found) out.push(adapter.id);
	}
	return out;
}

function detectMethod(targetDir, isGlobal) {
	const checkPaths = HARNESS_ADAPTERS.flatMap((a) => {
		let probes = [];
		try {
			probes = a.methodProbePaths({ targetDir }) || [];
		} catch {
			probes = [];
		}
		return probes.map((p2) => (isGlobal ? getGlobalPath(a.id) : p2)).filter(Boolean);
	});

	// Single pass: any symlink wins (mixed installs read as symlink-first),
	// else any real file/dir reads as copy, else default symlink.
	let sawReal = false;
	for (const p of checkPaths) {
		let stat;
		try {
			stat = fs.lstatSync(p);
		} catch {
			continue;
		}
		if (stat.isSymbolicLink()) return "symlink";
		sawReal = true;
	}
	if (sawReal) return "copy";
	return "symlink";
}

// Single manifest authority (P0-1/P1-3): one exclusion set shared by the
// legacy path-list walk, the hashed-manifest walk, AND the verify
// reverse-walk. Previously three sets drifted (MANIFEST_EXCLUDE vs inline
// lists in generateManifestData vs MANIFEST_EXCLUSIONS), and backup litter
// (*.bak-*, *.backup.*) poisoned every verify after a customized update.
// - manifest.json (self-hash impossible) is always excluded.
// - .vespyr-manifest.json is INCLUDED in the hashed manifest (its hash is
//   verified like any other file) — planting/modifying it is no longer
//   invisible. performGenerateManifest refreshes it first so the two stay
//   in lockstep.
// - .vespyr-version IS hashed (tamper-evident install marker).
// - top-level state/ stays excluded (ADR-006 runtime-writable) in lockstep.
const MANIFEST_EXCLUDE_FILES = new Set([
	".DS_Store",
	"manifest.json",
]);
const MANIFEST_EXCLUDE_DIRS = new Set(["node_modules", ".git"]);
function isBackupLitter(name) {
	return name.includes(".bak-") || name.includes(".backup.");
}
const MANIFEST_EXCLUDE = MANIFEST_EXCLUDE_FILES;

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
			if (MANIFEST_EXCLUDE_FILES.has(entry.name)) continue;
			if (MANIFEST_EXCLUDE_DIRS.has(entry.name)) continue;
			if (isBackupLitter(entry.name)) continue;
			if (entry.isSymbolicLink()) continue;
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
	if (R.dryRun) {
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
	// Single authority: prefer the hashed manifest.json file list; fall back
	// to the legacy path-list .vespyr-manifest.json for pre-unification
	// installs. Both describe the same file universe post-fix.
	let prevList = null;
	const hashedPath = path.join(agentsTarget, "manifest.json");
	try {
		if (fs.existsSync(hashedPath)) {
			const hashed = JSON.parse(fs.readFileSync(hashedPath, "utf8"));
			if (hashed && typeof hashed.files === "object") {
				prevList = Object.keys(hashed.files);
			}
		}
	} catch {}
	if (!prevList) {
		const manifestPath = path.join(agentsTarget, ".vespyr-manifest.json");
		if (!fs.existsSync(manifestPath)) return;
		try {
			prevList = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
		} catch (e) {
			return;
		}
		if (!Array.isArray(prevList)) return;
	}

	const next = buildSourceManifest(AGENTS_SRC);
	const nextSet = new Set(next);

	for (const rel of prevList) {
		if (nextSet.has(rel)) continue;
		// Never delete backup litter or the manifests themselves here —
		// backup sweep and manifest refresh own those paths.
		const base = rel.split("/").pop();
		if (MANIFEST_EXCLUDE_FILES.has(base) || isBackupLitter(base)) continue;
		const target = path.resolve(agentsTarget, rel);
		if (!target.startsWith(agentsTarget + path.sep)) continue;
		// lstat guard: never follow a symlink out of bounds during cleanup.
		try {
			fs.lstatSync(target);
		} catch {
			continue;
		}
		try {
			fs.rmSync(target, { recursive: true, force: true });
		} catch (e) {
			// ignore
		}
	}
}




function getExistingUserNickname(targetDir) {
	// A3: delegates to the canonical dual-block identity reader
	// (.agents/scripts/lib/identity.js) — supersedes the local single-format regex.
	return identity.readUserNickname(targetDir);
}

function updateUserNickname(targetDir, newNickname) {
	// A3: canonical writer syncs BOTH `## [IDENTITY]` header and markdown-list
	// formats atomically via fs_atomic.
	identity.updateUserNickname(newNickname, targetDir);
}





async function performUninstall(targetDir) {
	log(`\n  Uninstalling Vespyr from ${targetDir}...\n`);

	if (R.dryRun) {
		logDry(`Would delete .agents/`);
		logDry(`Would delete all harness symlinks`);
		logDry(`Would delete AGENTS.md, agent.md, CLAUDE.md`);
		logDry(`Would preserve artifacts/`);
		return;
	}

	// State guard: uninstalling a fresh dir is a no-op, and a foreign or
	// legacy-migrate dir must never be swept (its .agents/ belongs to
	// another tool). Only installed/repair states hold Vespyr content.
	const uninstallState = detectState(targetDir);
	if (uninstallState === "fresh") {
		log(`  Nothing to uninstall — no Vespyr installation found in ${targetDir}.\n`);
		return;
	}
	if (uninstallState === "foreign" || uninstallState === "migrate") {
		logError(
			`Refusing to uninstall — .agents/ here belongs to another tool (or a legacy layout). Use \`vespyr init\` to resolve it first.`,
		);
		process.exitCode = 2;
		return;
	}

	// 1. Detect if it's a global installation
	const agentsTarget = path.join(targetDir, ".agents");
	let isGlobal = false;	const versionPath = path.join(agentsTarget, ".vespyr-version");
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

	// 3. Clean up all harness files/folders surgically.
	// Registry-driven (02m): never hardcode the list here — a new adapter
	// must be swept on uninstall without touching this function.
	const allHarnesses = Object.keys(HARNESS_REGISTRY);
	uninstallHarnesses(targetDir, allHarnesses, isGlobal);

	// 4. Delete Vespyr-managed root documents (with backup — the old code
	// destroyed user-edited root docs with no recovery path). A doc without
	// Vespyr markers predates the install (bootstrap never overwrites), so
	// it is left in place.
	const filesToRemove = ["AGENTS.md", "agent.md", "CLAUDE.md"];
	for (const file of filesToRemove) {
		const filePath = path.join(targetDir, file);
		let managed = false;
		try {
			const st = fs.lstatSync(filePath);
			if (st.isFile() && !st.isSymbolicLink()) {
				const content = fs.readFileSync(filePath, "utf8");
				managed = content.includes("Vespyr") || content.includes(".agents/");
			}
		} catch {
			continue;
		}
		if (!managed) {
			log(`  Preserved non-Vespyr ${file} (left in place).`);
			continue;
		}
		try {
			const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
			const bakPath = `${filePath}.uninstall-bak-${stamp}`;
			if (!fs.existsSync(bakPath)) {
				try { fs.copyFileSync(filePath, bakPath); } catch {}
			}
			fs.unlinkSync(filePath);
		} catch (e) {}
	}

	log(`  Uninstall complete. artifacts/ preserved.\n`);
}

/**
 * Foreign .agents/ conflict flow: the directory belongs to another tool, so
 * neither fresh-install-overwrite nor repair-merge may run silently.
 * --yes (or init --yes) backs the foreign dir aside and fresh-installs;
 * interactive asks: backup+fresh (default), merge, or cancel.
 */
async function performForeignConflict(targetDir, flags) {
	log(`\n============================================================`);
	log(`   VESPYR v${VERSION} — Existing .agents/ Detected`);
	log(`============================================================`);
	log(`This directory already contains a .agents/ folder that was NOT`);
	log(`created by Vespyr (no version marker or Vespyr fingerprints).`);
	log(`Vespyr will not merge into it silently.\n`);

	if (flags.yes) {
		const backupPath = backupExistingAgentsDir(targetDir);
		if (!R.dryRun) {
			log(`  Backed up existing .agents/ to ${path.basename(backupPath)}`);
		}
		await performFreshInstall(targetDir, flags);
		return;
	}

	const choice = await askSingleChoice("Select an action:", [
		"Fresh install (Back up existing .agents/ and start fresh)",
		"Merge (Keep existing files, add Vespyr files alongside)",
		"Cancel (Keep everything as-is)",
	]);

	if (choice === 0) {
		const backupPath = backupExistingAgentsDir(targetDir);
		if (!R.dryRun) {
			log(`  Backed up existing .agents/ to ${path.basename(backupPath)}`);
		}
		await performFreshInstall(targetDir, flags);
	} else if (choice === 1) {
		log(`  Merging Vespyr files alongside existing content (collisions backed up as *.bak-*).\n`);
		await performUpdate(targetDir, flags);
	} else {
		log(`  Installation cancelled.\n`);
		process.exit(0);
	}
}

/**
 * Repair flow: a .agents/ with Vespyr fingerprints but no version marker is
 * healed via the update path (backup-on-collision + core refresh).
 */
async function performRepair(targetDir, flags) {
	log(`\n============================================================`);
	log(`   VESPYR v${VERSION} — Repairing Installation`);
	log(`============================================================`);
	log(`An existing .agents/ directory was found but the version marker`);
	log(`is missing. Syncing the latest files to repair it.\n`);
	await performUpdate(targetDir, flags);
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
		if (!R.dryRun) {
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

	if (R.dryRun) {
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
	if (R.dryRun) {
		logDry(`Would sync documentation entry points in ${targetDir}`);
		return false;
	}

	const syncScript = path.join(
		targetDir,
		".agents",
		"scripts",
		"sync-entry-points.js",
	);

	if (!fs.existsSync(syncScript)) {
		// Single-writer rule: the CLI never fabricates entry points from
		// templates. bootstrapRootDocs owns root-doc creation; sync owns
		// derivation. No script == nothing to sync, not an error.
		logWarn("sync-entry-points.js not found — skipping docs sync (root docs left intact).");
		return false;
	}

	// Non-destructive: a sync failure must NEVER throw into main's catch,
	// which would delete .agents/ as a "failed install". Log and continue.
	try {
		const { execFileSync } = require("child_process");
		execFileSync(process.execPath, [syncScript], { cwd: targetDir, stdio: "inherit" });
	} catch (e) {
		logWarn(`Docs sync failed (non-fatal, .agents/ preserved): ${e.message}`);
		return false;
	}

	try {
		const validateScript = path.join(
			targetDir,
			".agents",
			"scripts",
			"validate_frontmatter.js",
		);
		if (fs.existsSync(validateScript)) {
			const { execFileSync } = require("child_process");
			execFileSync(process.execPath, [validateScript], {
				cwd: targetDir,
				stdio: "inherit",
			});
		}
	} catch (e) {
		logWarn(`Frontmatter validation failed (non-fatal): ${e.message}`);
		return false;
	}
	return true;
}

function generateManifestData(targetDir) {
	const crypto = require("crypto");
	const agentsTarget = path.join(targetDir, ".agents");
	if (!fs.existsSync(agentsTarget)) {
		throw new Error(".agents directory not found");
	}
	const files = {};
	function hashFile(filePath) {
		// lstat guard: never hash through a symlink (TOCTOU). Symlinks are
		// recorded as unhashable and fail verify via the reverse-walk guard.
		const st = fs.lstatSync(filePath);
		if (st.isSymbolicLink()) {
			throw new Error(`refusing to hash symlink: ${filePath}`);
		}
		const buffer = fs.readFileSync(filePath);
		return crypto.createHash("sha256").update(buffer).digest("hex");
	}
	function walk(dir, rel) {
		let entries;
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const ent of entries) {
			if (MANIFEST_EXCLUDE_FILES.has(ent.name)) continue;
			if (MANIFEST_EXCLUDE_DIRS.has(ent.name)) continue;
			if (isBackupLitter(ent.name)) continue;
			// ADR-006: only top-level state/ is runtime-writable — excluded from both
			// walks in lockstep. Compensating controls: ledger provenance, MEMORY_LOCK,
			// anchor-swap symlink guard in verify's reverse-walk. Nested state-named
			// entries stay visible to both walks.
			if (rel === "" && ent.name === "state") continue;
			const full = path.join(dir, ent.name);
			const relPath = rel ? `${rel}/${ent.name}` : ent.name;
			// .vespyr-manifest.json IS hashed (single authority) — only the
			// self-referential manifest.json stays excluded via the set above.
			if (ent.isSymbolicLink()) continue;
			if (ent.isDirectory()) {
				walk(full, relPath);
			} else {
				try {
					files[relPath] = hashFile(full);
				} catch {
					// Unreadable/symlink race — skip here; verify fails closed
					// on the same path via its own guards.
				}
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
		try {
			const st = fs.lstatSync(full);
			if (!st.isFile() || st.isSymbolicLink()) continue;
			filesRoot[relPath] = hashFile(full);
		} catch {
			// absent — optional path, simply not recorded
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
	// Dry-run first: hashing requires a materialized tree, which dry-run
	// never creates — generating here would throw and break dry-run installs.
	if (R.dryRun) {
		logDry(`Would refresh .vespyr-manifest.json and write manifest to ${manifestPath}`);
		return;
	}
	// Lockstep refresh: the legacy path-list manifest must describe the same
	// universe the hash manifest pins. Refresh it first so
	// .vespyr-manifest.json's own hash (now covered) is deterministic.
	try {
		writeManifest(targetDir);
	} catch (e) {
		logWarn(`Could not refresh .vespyr-manifest.json before hashing: ${e.message}`);
	}
	const manifestData = generateManifestData(targetDir);
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
		const fullPath = path.resolve(agentsTarget, relPath);
		// Containment guard: a manifest entry escaping .agents/ is a fault.
		if (!fullPath.startsWith(agentsTarget + path.sep) && fullPath !== agentsTarget) {
			mismatches.push({ path: relPath, expected: expectedHash, actual: "path-escape" });
			continue;
		}
		let st;
		try {
			st = fs.lstatSync(fullPath);
		} catch {
			missing.push(relPath);
			continue;
		}
		// P0-2 TOCTOU guard: never read through a symlink. An undeclared
		// symlink at a pinned path is tamper, not content to hash.
		if (st.isSymbolicLink()) {
			if (relPath === "state") { verifiedCount++; continue; }
			extra.push({ path: relPath, detail: "undeclared symlink at pinned path (forward-walk guard)" });
			continue;
		}
		if (!st.isFile()) {
			missing.push(relPath);
			continue;
		}
		let buffer;
		try {
			buffer = fs.readFileSync(fullPath);
		} catch (e) {
			mismatches.push({ path: relPath, expected: expectedHash, actual: `unreadable:${e.code || e.message}` });
			continue;
		}
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
			const full = path.resolve(targetDir, relPath);
			if (!full.startsWith(targetDir + path.sep) && full !== targetDir) {
				rootMismatches.push({ path: relPath, expected: expectedHash, actual: "path-escape" });
				continue;
			}
			let st;
			try {
				st = fs.lstatSync(full);
			} catch {
				rootMissing.push(relPath);
				continue;
			}
			if (st.isSymbolicLink() || !st.isFile()) {
				rootMismatches.push({ path: relPath, expected: expectedHash, actual: "not-a-regular-file" });
				continue;
			}
			let buffer;
			try {
				buffer = fs.readFileSync(full);
			} catch (e) {
				rootMismatches.push({ path: relPath, expected: expectedHash, actual: `unreadable:${e.code || e.message}` });
				continue;
			}
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
	// ADR-006: `state` excluded in lockstep with generate — compensating controls
	// are ledger provenance + MEMORY_LOCK + the anchor-swap symlink guard below.
	// Unified with generateManifestData via MANIFEST_EXCLUDE_* (single authority).
	// .vespyr-manifest.json is NO LONGER excluded — it is a pinned file whose
	// absence from manifest.files is itself an `extra` finding.
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
			const full = path.join(dir, ent.name);
			const relPath = rel ? `${rel}/${ent.name}` : ent.name;
			// ADR-006 anchor-swap guard (before exclusions so an excluded name can
			// never mask a symlink): exactly one declared symlink anchor (state/,
			// the worktree shared-state link) is permitted; any other symlink inside
			// .agents/ fails verify loudly.
			if (ent.isSymbolicLink()) {
				if (relPath === "state") continue;
				extra.push({ path: relPath, detail: "undeclared symlink inside .agents/ (anchor-swap guard)" });
				continue;
			}
			if (MANIFEST_EXCLUDE_FILES.has(ent.name)) continue;
		if (MANIFEST_EXCLUDE_DIRS.has(ent.name)) continue;
		if (isBackupLitter(ent.name)) continue;
			// ADR-006: only top-level state/ is runtime-writable — excluded here;
			// nested state-named entries stay visible to the walk.
			if (rel === "" && ent.name === "state") continue;
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
	const defaultSpec = path.join(__dirname, "..", "security", "audit-spec.json");
	const specPath = flags.spec || (fs.existsSync(defaultSpec) ? defaultSpec : null);

	if (!specPath || !fs.existsSync(specPath)) {
		if (flags.json) {
			console.log(JSON.stringify({ exit: 2, error: "FAULT-1: Missing audit-spec.json (use --spec <path>)" }));
		} else {
			console.error("FAIL-CLOSED: FAULT-1: Missing audit-spec.json (use --spec <path>)");
		}
		process.exitCode = 2;
		return;
	}

	const { execFileSync } = require("child_process");
	const args = [scanScript, "--dir", targetDir, "--spec", specPath];
	if (flags.json) args.push("--json");

	try {
		const out = execFileSync("node", args, { encoding: "utf8", stdio: flags.json ? ["pipe", "pipe", "pipe"] : "inherit" });
		if (flags.json) process.stdout.write(out);
		process.exitCode = 0;
	} catch (e) {
		if (flags.json && e.stdout) {
			process.stdout.write(e.stdout);
		}
		process.exitCode = e.status == null ? 2 : e.status;
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
		if (!flags.yes) {
			const ok = await askSingleChoice(`Uninstall Vespyr from ${targetDir}?`, [
				"Yes, uninstall (core files removed, custom content preserved)",
				"Cancel (keep everything as-is)",
			]);
			if (ok !== 0) {
				log("  Uninstall cancelled.\n");
				return;
			}
		}
		await performUninstall(targetDir);
	}
}

async function main() {
	// 02o.7: `vespyr worktree <create|list|remove> …` — delegate before flag
	// parsing so parallel-session worktree management works from any directory.
	if (process.argv[2] === "worktree") {
		const { execFileSync } = require("child_process");
		const script = path.join(__dirname, "..", ".agents", "scripts", "worktree.js");
		try {
			const out = execFileSync(process.execPath, [script, ...process.argv.slice(3)], {
				cwd: process.cwd(),
				encoding: "utf8",
				stdio: ["pipe", "pipe", "inherit"],
			});
			process.stdout.write(out);
			process.exit(0);
		} catch (e) {
			process.exit(e.status || 1);
		}
	}

	resetRuntimeState();
	const flags = parseFlags(process.argv);
	setState({ dryRun: flags.dryRun });

	if (flags.version) {
		console.log(VERSION);
		process.exit(0);
	}

	if (flags.help) {
		console.log(`
vespyr v${VERSION} — AI Agent Team Installer & Integrity Engine

Usage: npx vespyr [command] [options]

Commands:
  init                 Fresh install into --target (errors if already installed; backs up a non-Vespyr .agents/)
  update               Update an existing install (errors on fresh directories)
  reconfigure          Re-run setup on an existing install (keeps harnesses unless --harness given)
  uninstall            Remove Vespyr core files (custom content preserved; confirms unless --yes)
  verify               Verify integrity of .agents/ against pinned manifest
  audit                Run supply-chain security and content integrity scan
  manifest             Generate .agents/manifest.json checksums file
  worktree <cmd>       Parallel-session worktrees: create <name> | list | remove <name> [--force]

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
  --install-git-hook   Install pre-push hook (refreshes project-context before git push)

Exit codes:
  0  success / verify clean
  1  verify tamper (missing/modified/planted files)
  2  usage error or fail-closed (missing/corrupt manifest, missing spec)

Examples:
  npx vespyr                          Interactive install
  npx vespyr init --yes               Fresh install with defaults
  npx vespyr update --yes             Update existing install
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

	// P1-5: explicit init/update positionals are honored, not ignored.
	// Bare `vespyr` (no positional) keeps legacy detectState dispatch.
	// `init` on an installed dir is idempotent (T0-INIT-01): it refreshes via
	// the update path instead of showing the interactive menu or erroring —
	// project-context/canary content is preserved by the update path.
	if (flags.command === "init" && state === "installed") {
		log(`Already installed — refreshing via update path (idempotent re-init).`);
		try {
			await performUpdate(targetDir, flags);
		} catch (err) {
			logError(`Re-init refresh failed: ${err.message}`);
			process.exit(1);
		}
		try {
			if (typeof teardownSignalHandler === "function") teardownSignalHandler();
		} catch {}
		return;
	}
	if (flags.command === "update" && state === "fresh") {
		logError("Nothing to update — directory is fresh. Use `vespyr init` first.");
		process.exit(2);
	}
	if (flags.command === "update" && state === "migrate") {
		logError("Legacy .opencode/ layout detected — run without args or `vespyr init` to migrate first.");
		process.exit(2);
	}
	if (flags.command === "update" && state === "foreign") {
		logError("No Vespyr installation found — .agents/ belongs to another tool. Use `vespyr init` to back it up and install, not `update`.");
		process.exit(2);
	}
	if (flags.command === "reconfigure" && state !== "installed" && state !== "repair") {
		logError("Cannot reconfigure — no Vespyr installation found. Use `vespyr init` first.");
		process.exit(2);
	}

	try {
		if (flags.command === "init") {
			if (state === "migrate") {
				await performMigration(targetDir, flags);
			} else if (state === "foreign") {
				await performForeignConflict(targetDir, flags);
			} else if (state === "repair") {
				await performRepair(targetDir, flags);
			} else {
				log(`\n============================================================`);
				log(`   VESPYR v${VERSION} — AI Agent Team Installer`);
				log(`============================================================\n`);
				await performFreshInstall(targetDir, flags);
			}
		} else if (flags.command === "update") {
			await performUpdate(targetDir, flags);
		} else if (flags.command === "uninstall") {
			if (!flags.yes && (state === "installed" || state === "repair")) {
				if (!process.stdin.isTTY) {
					logError("Uninstall needs confirmation — re-run with --yes for non-interactive use.");
					process.exit(2);
				}
				const ok = await askSingleChoice(`Uninstall Vespyr from ${targetDir}?`, [
					"Yes, uninstall (core files removed, custom content preserved)",
					"Cancel (keep everything as-is)",
				]);
				if (ok !== 0) {
					log("  Uninstall cancelled.\n");
					try {
						if (typeof teardownSignalHandler === "function") teardownSignalHandler();
					} catch {}
					return;
				}
			}
			await performUninstall(targetDir);
		} else if (flags.command === "reconfigure") {
			await performReconfigure(targetDir, flags);
		} else if (state === "installed") {
			await showActionMenu(targetDir, flags);
		} else if (state === "migrate") {
			await performMigration(targetDir, flags);
		} else if (state === "foreign") {
			await performForeignConflict(targetDir, flags);
		} else if (state === "repair") {
			await performRepair(targetDir, flags);
		} else {
			log(`\n============================================================`);
			log(`   VESPYR v${VERSION} — AI Agent Team Installer`);
			log(`============================================================\n`);
			await performFreshInstall(targetDir, flags);
		}
		try {
			if (typeof teardownSignalHandler === "function") teardownSignalHandler();
		} catch {}
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
				`Installation failed: ${err.message}. Run with --dry-run to debug, or report at github.com/lalulali/vespyr/issues.${process.env.VESPYR_DEBUG && err.stack ? "\n" + err.stack.split("\n").slice(1, 8).join("\n") : ""}`,
			);
		}

		// Fresh-install-only rollback: update partials are never deleted
			// (P1-4) — wiping .agents/ on an update failure destroys user data.
		if (!R.dryRun && R.installed) {
			const agentsTarget = path.join(targetDir, ".agents");
			try {
				fs.lstatSync(agentsTarget);
				fs.rmSync(agentsTarget, { recursive: true, force: true });
			} catch {}
			for (const link of R.createdLinks) {
				try {
					fs.lstatSync(link);
					fs.unlinkSync(link);
				} catch {
					/* missing or already swept */
				}
				try {
					const st = (() => { try { return fs.lstatSync(link); } catch { return null; } })();
					if (st && st.isDirectory() && !st.isSymbolicLink()) {
						fs.rmSync(link, { recursive: true, force: true });
					}
				} catch {}
			}
		}
		try {
			if (typeof teardownSignalHandler === "function") teardownSignalHandler();
		} catch {}

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
	isVespyrAgentsDir,
	backupExistingAgentsDir,
	performForeignConflict,
	createLinkOrCopy,
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
	performGlobalInstall,
	detectInstalledHarnesses,
	detectMethod,
	buildSourceManifest,
	writeManifest,
	performGenerateManifest,
	removeStaleManifestFiles,
	yamlQuote,
	installGitHook,
	ASCII_ART,
	VERSION,
	HARNESS_OPTIONS,
};
