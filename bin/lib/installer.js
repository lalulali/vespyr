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
		performGenerateManifest,
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
- **Repository**: ${detectRepository(targetDir)}
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

	for (const id of selections) {
		const adapter = getHarnessAdapter(id);
		if (adapter && adapter.dormant) {
			throw new Error(
				`Harness "${id}" is dormant in this release (cleanup-only, see 03c). Remove it from --harness or use uninstall to sweep a legacy install.`,
			);
		}
	}

	for (const adapter of HARNESS_ADAPTERS) {
		if (selections.includes(adapter.id)) {
			await adapter.install(ctx);
		}
	}

	for (const adapter of HARNESS_ADAPTERS) {
		if (typeof adapter.postInstall === "function") {
			await adapter.postInstall(selections, ctx);
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
				try {
					fs.lstatSync(targetAgentPath);
				} catch {
					continue;
				}
				try {
					fs.rmSync(targetAgentPath, { recursive: true, force: true });
				} catch {}
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
				try {
					fs.lstatSync(targetSkillPath);
				} catch {
					continue;
				}
				try {
					fs.rmSync(targetSkillPath, { recursive: true, force: true });
				} catch {}
			}
			removeDirIfEmpty(targetSkillsDir);
		} catch (e) {
			// ignore
		}
	}

	// Delete other core folders surgically: only entries shipped in AGENTS_SRC
	// are removed — user-added files inside these dirs survive. The old code
	// rmSync'd the whole folder, destroying user scripts/templates. Folders
	// with no source dir (commands/) hold only user content by definition,
	// so they are pruned solely when empty.
	const coreFolders = [
		"commands",
		"custom",
		"references",
		"scripts",
		"templates",
	];
	for (const folder of coreFolders) {
		const folderPath = path.join(agentsTarget, folder);
		try {
			fs.lstatSync(folderPath);
		} catch {
			continue;
		}
		let srcEntries = null;
		try {
			const srcFolderPath = path.join(AGENTS_SRC, folder);
			srcEntries = fs.readdirSync(srcFolderPath);
		} catch {
			srcEntries = null;
		}
		if (srcEntries === null) {
			removeDirIfEmpty(folderPath);
			continue;
		}
		for (const entry of srcEntries) {
			const p = path.join(folderPath, entry);
			try {
				fs.lstatSync(p);
			} catch {
				continue;
			}
			try {
				fs.rmSync(p, { recursive: true, force: true });
			} catch {}
		}
		removeDirIfEmpty(folderPath);
	}

	// Delete core files
	const coreFiles = [
		"GUARDRAILS.md",
		"TROUBLESHOOTING.md",
		"skills.md",
		"workflow.md",
		".vespyr-version",
		".vespyr-manifest.json",
		"manifest.json",
		"config.yaml",
		"package.json",
		"package-lock.json",
		".gitignore",
		".DS_Store",
	];
	for (const file of coreFiles) {
		const filePath = path.join(agentsTarget, file);
		try {
			fs.lstatSync(filePath);
		} catch {
			continue;
		}
		try {
			const st = fs.lstatSync(filePath);
			if (st.isDirectory() && !st.isSymbolicLink()) continue;
			fs.unlinkSync(filePath);
		} catch (e) {}
	}

	// Vendored runtime deps: installed by wholesale copy (the update path
	// already overwrites this tree wholesale), so removal is wholesale too.
	try {
		const nm = path.join(agentsTarget, "node_modules");
		try {
			fs.lstatSync(nm);
			fs.rmSync(nm, { recursive: true, force: true });
		} catch {}
	} catch {}

	// Transient runtime state (locks, session pointer, ledger): safe to drop
	// on uninstall — durable memory lives in artifacts/, not here.
	try {
		const stDir = path.join(agentsTarget, "state");
		try {
			fs.lstatSync(stDir);
			fs.rmSync(stDir, { recursive: true, force: true });
		} catch {}
	} catch {}

	// Sweep backup litter (*.bak-*, *.backup.*) so uninstall leaves no
	// poison for a future verify. User content outside these patterns stays.
	try {
		const sweep = (dir) => {
			let entries;
			try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
			for (const ent of entries) {
				const full = path.join(dir, ent.name);
				if (ent.isDirectory() && !ent.isSymbolicLink()) sweep(full);
				else if (ent.isFile() && (ent.name.includes(".bak-") || ent.name.includes(".backup."))) {
					try { fs.unlinkSync(full); } catch {}
				}
			}
		};
		if (fs.existsSync(agentsTarget)) sweep(agentsTarget);
	} catch {}

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
					"Select harness link method (.agents/ core is always copied):",
					[
						"Symlink (Recommended - harness links reference .agents/, updates propagate)",
						"Copy (Static copies of harness files; .agents/ core is still copied)",
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
		fs.cpSync(AGENTS_SRC, agentsTarget, { recursive: true, dereference: true });
		R.installed = true;
	}

	writeVersionFile(targetDir);
	// Pin the just-materialized tree: shipping the repo manifest would
	// fail the first verify (stale hashes + foreign files_root scope).
	// Safe from TOFU: install/update just built this tree from source.
	performGenerateManifest(targetDir, flags);

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
	try {
		if (typeof teardownSignalHandler === "function") teardownSignalHandler();
	} catch {}
}

/**
 * B1 (02h §10): before an update overwrites .agents/, any existing file whose
 * content differs from the incoming copy is preserved as `<file>.bak-YYYYMMDD`.
 * Unmodified files produce no backup noise. Same-day re-updates append a
 * counter (`bak-YYYYMMDD-1`, `-2`, …) instead of silently skipping the second
 * backup — the old existsSync guard overwrote customized content with no
 * recovery path.
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
						let bakPath = `${dstPath}.bak-${today}`;
						let n = 1;
						while (fs.existsSync(bakPath)) {
							try {
								const prev = fs.readFileSync(bakPath);
								if (prev.equals(current)) break; // identical backup already exists
							} catch {}
							bakPath = `${dstPath}.bak-${today}-${n++}`;
							if (n > 100) break;
						}
						let needsWrite = true;
						try {
							if (fs.existsSync(bakPath) && fs.readFileSync(bakPath).equals(current)) {
								needsWrite = false;
							}
						} catch {}
						if (needsWrite) {
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
	fs.cpSync(AGENTS_SRC, agentsTarget, { recursive: true, dereference: true });

	writeVersionFile(targetDir);
	// Pin the just-materialized tree: shipping the repo manifest would
	// fail the first verify (stale hashes + foreign files_root scope).
	// Safe from TOFU: install/update just built this tree from source.
	performGenerateManifest(targetDir, flags);

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

async function performGlobalInstall(selections, method, userNickname, flags = {}) {
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
	// Pin the just-materialized tree (hashed + legacy manifests). Targeting
	// `home` works because the manifest machinery is layout-agnostic: the
	// agents dir resolves to ~/.agents and the files_root scope is simply
	// absent there. NOTE: never call writeManifest(globalAgentsDir) here — it
	// appends "/.agents" itself and used to crash global installs with ENOENT.
	performGenerateManifest(home, flags);

	if (!selections.includes("opencode")) {
		const globalCommands = path.join(globalAgentsDir, "commands");
		if (fs.existsSync(globalCommands)) {
			try {
				const srcCommands = path.join(AGENTS_SRC, "commands");
				const core = fs.existsSync(srcCommands) ? fs.readdirSync(srcCommands) : [];
				for (const entry of core) {
					try { fs.rmSync(path.join(globalCommands, entry), { recursive: true, force: true }); } catch {}
				}
				if (fs.readdirSync(globalCommands).length === 0) {
					fs.rmSync(globalCommands, { recursive: true, force: true });
				}
			} catch {}
		}
	}

	// Global harness emission delegates to the same adapters as local
	// installs (single geometry owner). The old harnessLinkMap duplicated
	// adapter paths here and drifted: cursor/github/windsurf created empty
	// dirs with no emission, kiro diverged from kiro.js fallback chain.
	const globalCtx = {
		targetDir: home,
		agentsTarget: globalAgentsDir,
		method,
		selections,
		dryRun: R.dryRun,
		handleConflict,
		createLinkOrCopy,
		log,
		logDry,
		logWarn,
	};
	for (const h of selections) {
		const adapter = getHarnessAdapter(h);
		if (!adapter) continue;
		if (adapter.dormant) {
			logWarn(`Skipping dormant harness "${h}" for global install (cleanup-only).`);
			continue;
		}
		if (typeof adapter.install !== "function") continue;
		if (h === "opencode" || h === "claude") {
			const globalTarget = getGlobalPath(h);
			if (!globalTarget) continue;
			handleConflict(globalTarget, h, home, method);
			let needsCreate = false;
			try { fs.lstatSync(globalTarget); } catch { needsCreate = true; }
			if (needsCreate) {
				createLinkOrCopy(globalAgentsDir, globalTarget, "dir", method);
			}
		} else {
			try {
				await adapter.install(globalCtx);
			} catch (e) {
				logWarn(`Global harness "${h}" install failed: ${e.message}`);
			}
		}
	}
	for (const adapter of HARNESS_ADAPTERS) {
		if (typeof adapter.postInstall === "function") {
			try {
				await adapter.postInstall(selections, { ...globalCtx, agentsTarget: globalAgentsDir });
			} catch {}
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

	// --yes without --harness keeps the current set: wiping every harness
	// integration on a bare `reconfigure --yes` would be a surprise.
	let selections = flags.harnesses.length > 0 ? flags.harnesses : prevHarnesses;
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
			"Select harness link method (.agents/ core is always copied):",
			[
				"Symlink (Recommended - harness links reference .agents/, updates propagate)",
				"Copy (Static copies of harness files; .agents/ core is still copied)",
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

	// Refresh .agents/ core so reconfigure also picks up version bumps.
	// Previously reconfigure refreshed docs+harnesses only, leaving stale
	// core files until a separate `update` run.
	if (!R.dryRun && !isGlobal) {
		try {
			backupCustomizedFiles(agentsTarget, AGENTS_SRC);
		} catch {}
		removeStaleManifestFiles(targetDir);
		try {
			fs.cpSync(AGENTS_SRC, agentsTarget, { recursive: true, dereference: true });
		} catch (e) {
			logWarn(`Core refresh during reconfigure failed: ${e.message}`);
		}
		writeVersionFile(targetDir);
		// Pin the just-materialized tree: shipping the repo manifest would
	// fail the first verify (stale hashes + foreign files_root scope).
	// Safe from TOFU: install/update just built this tree from source.
	performGenerateManifest(targetDir, flags);
	}

	const projectName = path.basename(targetDir);
	bootstrapRootDocs(targetDir, projectName, selections);
	// Stale CLAUDE.md: claude harness deselected but doc left behind.
	if (!selections.includes("claude")) {
		const claudePath = path.join(targetDir, "CLAUDE.md");
		try {
			if (fs.existsSync(claudePath)) {
				const content = fs.readFileSync(claudePath, "utf8");
				if (content.includes(".claude/") || content.includes(".agents/") || content.includes("Vespyr")) {
					if (!R.dryRun) fs.unlinkSync(claudePath);
					else logDry(`Would remove stale CLAUDE.md (claude harness deselected)`);
				}
			}
		} catch {}
	}
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
