/**
 * CLI presentation layer (02h §10 A2b): summary rendering, signal handling,
 * screen helpers. Extracted verbatim from bin/cli.js; constants injected via
 * createUi(); runtime state via lib/state.js.
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { R } = require("./state.js");
const { log } = require("./logger.js");
const { ADAPTERS: HARNESS_ADAPTERS } = require("./harnesses/index.js");

function createUi({ VERSION, ASCII_ART, IS_TTY = process.stdout.isTTY, wizardState = {} }) {
function printSummary(targetDir, selections) {
	const agentsDir = path.join(targetDir, ".agents", "agents");
	let count = 0;
	try {
		count = fs.existsSync(agentsDir)
			? fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md")).length
			: 0;
	} catch {
		count = 0;
	}

	const createdLines = [];
	const exists = (rel) => {
		try {
			return fs.existsSync(path.join(targetDir, rel));
		} catch {
			return false;
		}
	};
	// Only claim what is actually on disk — a skipped scaffold (existing
	// artifacts/, dry-run, partial install) must not print phantom ✓ lines.
	if (exists(".agents")) createdLines.push(`    ✓ .agents/                        (core agent engine)`);
	if (exists("AGENTS.md")) createdLines.push(`    ✓ AGENTS.md                       (harness-agnostic guide)`);
	if (exists("agent.md")) createdLines.push(`    ✓ agent.md                        (agent quick reference)`);
	if (exists("artifacts")) createdLines.push(`    ✓ artifacts/                      (memory + output directories)`);

	const lines = [
		`\n============================================================`,
		`   VESPYR v${VERSION} — Installation Complete`,
		`============================================================`,
		``,
		`  Target:       ${targetDir}`,

		`  Harnesses:    ${selections.harnesses.join(", ") || "core only"}`,
		``,
		`  Created:`,
		...createdLines,
	];

	for (const adapter of HARNESS_ADAPTERS) {
		if (
			selections.harnesses.includes(adapter.id) &&
			typeof adapter.summaryLines === "function"
		) {
			for (const line of adapter.summaryLines({ count })) lines.push(line);
		}
	}

	lines.push(
		``,
		`  Next steps:`,
		`    1. Run /help-me to bootstrap your project context`,
		`    2. Type @founder or /validate-idea "your idea" to stress-test a concept`,
		`    3. See artifacts/memory/project-context.md for your project state`,

		``,
		`  Docs: https://github.com/lalulali/vespyr`,
		`  Report issues: https://github.com/lalulali/vespyr/issues`,
		`============================================================`,
	);

	console.log(lines.join("\n"));
}

function setupSignalHandler(targetDir, opts = {}) {
	// Scoped rollback: only a FRESH install in THIS session owns .agents/.
	// - Update/reconfigure paths reuse a pre-existing .agents/ — deleting it
	//   on Ctrl-C would destroy user data (P0-5). Guard with R.installed,
	//   which performFreshInstall sets only after it creates the dir.
	// - once (not on) + removable: repeated installs in one process (tests)
	//   must not stack handlers; teardownSignalHandler() removes it.
	// - lstat (not existsSync): created links may already be dangling
	//   (.agents/ swept first) — existsSync would miss them.
	const existedBefore = (() => {
		try {
			fs.lstatSync(path.join(targetDir, ".agents"));
			return true;
		} catch {
			return false;
		}
	})();
	const handler = () => {
		const isFreshSession = !R.dryRun && R.installed && !existedBefore;
		if (isFreshSession) {
			try {
				fs.rmSync(path.join(targetDir, ".agents"), {
					recursive: true,
					force: true,
				});
			} catch (e) {
				/* ignore */
			}
		}
		for (const link of R.createdLinks) {
			try {
				fs.lstatSync(link);
				fs.unlinkSync(link);
			} catch (e) {
				/* ignore — missing, dir-copy fallback, or already swept */
			}
		}
		try {
			for (const link of R.createdLinks) {
				try {
					const st = fs.lstatSync(link);
					if (st.isDirectory() && !st.isSymbolicLink()) {
						fs.rmSync(link, { recursive: true, force: true });
					}
				} catch {
					/* ignore */
				}
			}
		} catch {
			/* ignore */
		}
		if (isFreshSession) {
			console.log("\nInstallation cancelled. Partial fresh-install changes were removed.");
		} else {
			console.log("\nInstallation cancelled. Existing files preserved; partial new files may remain — re-run to repair.");
		}
		process.exit(130);
	};
	process.once("SIGINT", handler);
	setupSignalHandler._handler = handler;
	setupSignalHandler._target = targetDir;
}

function teardownSignalHandler() {
	if (setupSignalHandler._handler) {
		try {
			process.removeListener("SIGINT", setupSignalHandler._handler);
		} catch {
			/* ignore */
		}
		setupSignalHandler._handler = null;
	}
}

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
	if (wizardState.languageArtifacts !== undefined) {
		lines.push(`  Artifacts language: ${wizardState.languageArtifacts}`);
	}
	if (lines.length > 0) {
		process.stdout.write(`\n  \x1b[2m── Current Selections ──\x1b[0m\n`);
		lines.forEach((l) => process.stdout.write(l + "\n"));
		process.stdout.write(`  \x1b[2m────────────────────────\x1b[0m\n`);
	}
}

	return { printSummary, setupSignalHandler, teardownSignalHandler, clearScreen, printWizardSummary };
}

module.exports = { createUi };
