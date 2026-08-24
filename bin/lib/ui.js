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
		if (!R.dryRun && fs.existsSync(path.join(targetDir, ".agents"))) {
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
				if (fs.existsSync(link)) fs.unlinkSync(link);
			} catch (e) {
				/* ignore */
			}
		}
		console.log("\nInstallation cancelled. No changes were made.");
		process.exit(130);
	});
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
	if (lines.length > 0) {
		process.stdout.write(`\n  \x1b[2m── Current Selections ──\x1b[0m\n`);
		lines.forEach((l) => process.stdout.write(l + "\n"));
		process.stdout.write(`  \x1b[2m────────────────────────\x1b[0m\n`);
	}
}

	return { printSummary, setupSignalHandler, clearScreen, printWizardSummary };
}

module.exports = { createUi };
