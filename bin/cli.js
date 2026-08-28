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
const { printSummary, setupSignalHandler, clearScreen, printWizardSummary } = uiApi;

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
	removeStaleManifestFiles,
	detectInstalledHarnesses,
	installGitHook,
	setupSignalHandler,
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
function detectRepository() {
	const { execFileSync } = require("child_process");
	try {
		const inRepo = execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
		if (inRepo !== "true") return "Not a git repository (local folder)";
		const remote = execFileSync("git", ["config", "--get", "remote.origin.url"], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
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
	if (R.dryRun) {
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
			for (const h of flags.harnesses) {
				if (!getHarnessAdapter(h)) {
					console.error(
						`Unknown harness: ${h}. Available: ${HARNESS_OPTIONS.map((o) => o.id).join(", ")}`,
					);
					process.exit(1);
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
	const home = os.homedir();
	if (harness === "agents") return path.join(home, ".agents");
	const adapter = getHarnessAdapter(harness);
	if (!adapter || typeof adapter.globalPath !== "function") return null;
	return adapter.globalPath({ home, platform: process.platform });
}

function detectInstalledHarnesses(targetDir, isGlobal) {
	const out = [];
	for (const adapter of HARNESS_ADAPTERS) {
		const found = adapter
			.detectPaths({ targetDir })
			.some((relOrAbs) =>
				fs.existsSync(
					isGlobal ? getGlobalPath(adapter.id) : path.resolve(targetDir, relOrAbs.replace(targetDir + "/", "")),
				),
			);
		if (found) out.push(adapter.id);
	}
	return out;
}

function detectMethod(targetDir, isGlobal) {
	const getPath = (harness, localRel) =>
		isGlobal ? getGlobalPath(harness) : path.join(targetDir, localRel);

	const checkPaths = HARNESS_ADAPTERS.flatMap((a) =>
		a.methodProbePaths({ targetDir }).map((p2) =>
			isGlobal ? getGlobalPath(a.id) : p2,
		),
	);

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

	// 3. Clean up all harness files/folders surgically.
	// Registry-driven (02m): never hardcode the list here — a new adapter
	// must be swept on uninstall without touching this function.
	const allHarnesses = Object.keys(HARNESS_REGISTRY);
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
	if (R.dryRun) {
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
				`Installation failed: ${err.message}. Run with --dry-run to debug, or report at github.com/lalulali/vespyr/issues.${process.env.VESPYR_DEBUG && err.stack ? "\n" + err.stack.split("\n").slice(1, 8).join("\n") : ""}`,
			);
		}

		if (!R.dryRun && R.installed) {
			const agentsTarget = path.join(targetDir, ".agents");
			if (fs.existsSync(agentsTarget)) {
				fs.rmSync(agentsTarget, { recursive: true, force: true });
			}
			for (const link of R.createdLinks) {
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
