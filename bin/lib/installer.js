/**
 * Installer orchestration (02h §10 A2b): fresh install, update, global install,
 * reconfigure, artifact scaffolding, harness dispatch, uninstall sweeps.
 * Extracted verbatim from bin/cli.js. Platform helpers injected via
 * createInstaller(deps); harness behavior delegated to bin/lib/harnesses/*.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { R } = require("./state.js");
const PKG = require("../../package.json");
const linkUtils = require("./link-utils.js");
const { detectStack } = require("./detector.js");
const {
	ADAPTERS: HARNESS_ADAPTERS,
	HARNESS_OPTIONS,
	getAdapter: getHarnessAdapter,
	getGlobalPath,
} = require("./harnesses/index.js");

function createInstaller(deps) {
	const {
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
	} = deps;
	const { handleConflict, createLinkOrCopy } = linkUtils;

function scaffoldArtifacts(targetDir, projectName, userNickname = "User", stack = null) {
	const artifactsDir = path.join(targetDir, "artifacts");
	if (fs.existsSync(artifactsDir)) {
		log("  Existing artifacts/ found, skipping.");
		return;
	}

	if (R.dryRun) {
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

	const memoryPath = path.join(artifactsDir, "memory");
	const isoDate = new Date().toISOString().split("T")[0];

	fs.writeFileSync(
		path.join(memoryPath, "project-context.md"),
		`# Project Context

## [CORE]
Project: ${projectName} (startup)
Stack: ${stack || "None"}
Phase: validation
Sprint: none
Blockers: 0

## [IDENTITY]
User Nickname: ${userNickname}

<!-- BEGIN MACHINE STATE -->
## [RUNTIME STATE]
- Stack: ${stack || "None"}
- Git Branch: none
- Active Phase: validation
- Active Sprint: none
- Blocker Status: 0 active blockers
- Engine Version: ${PKG.version}
<!-- END MACHINE STATE -->

## Session Activity
_(auto-populated on every session by @memory-controller / orchestrator_state.js)_

## Identity
- **Project Name**: ${projectName}
- **Repository**: ${detectRepository()}
- **User Nickname**: ${userNickname}
- **Created**: ${isoDate}

## Technical
- **Stack**: ${stack ? stack : "None (Starting from scratch)"}
- **Architecture**: Not yet defined
- **Constraints**: None recorded

## Operation Mode
- **Default**: semi-autonomous

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

	if (R.dryRun) {
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
	if (R.dryRun) {
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

async function installHarnesses(targetDir, selections, method) {
	const agentsTarget = path.join(targetDir, ".agents");
	const ctx = {
		targetDir,
		agentsTarget,
		method,
		selections,
		dryRun: R.dryRun,
		handleConflict,
		createLinkOrCopy,
		log,
		logDry,
		logWarn,
	};

	for (const adapter of HARNESS_ADAPTERS) {
		if (selections.includes(adapter.id)) {
			adapter.install(ctx);
		}
	}

	for (const adapter of HARNESS_ADAPTERS) {
		if (typeof adapter.postInstall === "function") {
			adapter.postInstall(selections, ctx);
		}
	}
}

function uninstallHarnesses(targetDir, harnesses, isGlobal) {
	const ctx = {
		targetDir,
		isGlobal,
		agentsSrc: AGENTS_SRC,
		surgicallyCleanupAgentsDir,
		removeDirIfEmpty,
	};
	for (const h of harnesses) {
		const adapter = getHarnessAdapter(h);
		if (adapter && typeof adapter.uninstall === "function") {
			adapter.uninstall(ctx);
		}
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
		if (R.dryRun) {
			logDry(`Would create directory: ${targetDir}`);
		} else {
			fs.mkdirSync(targetDir, { recursive: true });
		}
	}

	const agentsTarget = path.join(targetDir, ".agents");

	if (R.dryRun) {
		logDry(`Would copy .agents/ to ${agentsTarget}`);
	} else {
		if (!fs.existsSync(agentsTarget)) {
			fs.mkdirSync(agentsTarget, { recursive: true });
		}
		fs.cpSync(AGENTS_SRC, agentsTarget, { recursive: true });
		R.installed = true;
	}

	writeVersionFile(targetDir);
	writeManifest(targetDir);

	const projectName = flags.projectName || path.basename(targetDir);
	if (flags.userNickname) {
		userNickname =
			flags.userNickname.replace(/[^a-zA-Z0-9\s\-_.]/g, "") || "User";
	}
	const resolvedStack = flags.stack || detectStack(targetDir);
	log(`  Stack: ${resolvedStack}${flags.stack ? " (--stack)" : " (auto-detected)"}`);
	scaffoldArtifacts(targetDir, projectName, userNickname, resolvedStack);
	installGitHook(targetDir);
	bootstrapRootDocs(targetDir, projectName, selections);
	performSyncDocs(targetDir);
	await installHarnesses(targetDir, selections, method);

	if (!R.dryRun) {
		printSummary(targetDir, { harnesses: selections });
	}
}

/**
 * B1 (02h §10): before an update overwrites .agents/, any existing file whose
 * content differs from the incoming copy is preserved as `<file>.bak-YYYYMMDD`.
 * Unmodified files produce no backup noise.
 */
function backupCustomizedFiles(agentsTarget, sourceDir) {
	const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
	let backedUp = 0;
	const walk = (srcDir, relDir) => {
		const entries = fs.readdirSync(srcDir, { withFileTypes: true });
		for (const entry of entries) {
			const srcPath = path.join(srcDir, entry.name);
			const relPath = path.join(relDir, entry.name);
			const dstPath = path.join(agentsTarget, relPath);
			if (entry.isDirectory()) {
				walk(srcPath, relPath);
			} else if (entry.isFile()) {
				if (!fs.existsSync(dstPath)) continue;
				try {
					const incoming = fs.readFileSync(srcPath);
					const current = fs.readFileSync(dstPath);
					if (!incoming.equals(current)) {
						const bakPath = `${dstPath}.bak-${today}`;
						if (!fs.existsSync(bakPath)) {
							fs.copyFileSync(dstPath, bakPath);
							backedUp++;
						}
					}
				} catch (e) {}
			}
		}
	};
	if (fs.existsSync(agentsTarget)) walk(sourceDir, "");
	return backedUp;
}

async function performUpdate(targetDir, flags) {
	log(`\n  Updating Vespyr in ${targetDir}...\n`);

	const agentsTarget = path.join(targetDir, ".agents");
	const prevVersion = getInstalledVersion(targetDir);

	if (R.dryRun) {
		logDry(`Would overwrite .agents/ with v${VERSION}`);
		logDry(`Would preserve artifacts/ directory`);
		logDry(`Would recompile all harness files`);
		return;
	}

	if (!fs.existsSync(agentsTarget)) {
		fs.mkdirSync(agentsTarget, { recursive: true });
	}

	const customized = backupCustomizedFiles(agentsTarget, AGENTS_SRC);
	if (customized > 0) {
		log(`  Preserved ${customized} customized file(s) as *.bak-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`);
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

async function performGlobalInstall(selections, method, userNickname) {
	const globalAgentsDir = getGlobalPath("agents");
	const home = os.homedir();

	log(`\n  Installing Vespyr v${VERSION} globally...\n`);

	if (R.dryRun) {
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

			if (h === "kiro") {
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

	return {
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
	};
}

module.exports = { createInstaller };
