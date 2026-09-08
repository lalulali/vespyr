/**
 * opencode harness adapter — .opencode -> .agents symlink, plus the
 * commands-folder sweep that runs when opencode is NOT selected.
 * Part of the 02h §10 harness-layer extraction (A2a).
 */
const fs = require("fs");
const path = require("path");

module.exports = {
	id: "opencode",
	label: "opencode",
	description: "scaffolds .opencode -> .agents symlink",

	detectPaths({ targetDir }) {
		return [`${targetDir}/.opencode`];
	},

	globalPath({ home }) {
		return `${home}/.opencode`;
	},

	methodProbePaths({ targetDir }) {
		return [`${targetDir}/.opencode`];
	},

	install(ctx) {
		const { targetDir, agentsTarget, method, handleConflict, createLinkOrCopy } = ctx;
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
	},

	summaryLines() {
		return [`    ✓ .opencode -> .agents            (opencode harness)`];
	},

	postInstall(selections, ctx) {
		const { agentsTarget, dryRun, logDry } = ctx;
		if (selections.includes("opencode")) return;
		const targetCommands = path.join(agentsTarget, "commands");
		if (!fs.existsSync(targetCommands)) return;
		// Surgical sweep: remove ONLY core-shipped commands, never
		// user-authored files. The old code rmSync'd the whole folder,
		// destroying user commands alongside core ones.
		let coreCommands = [];
		try {
			const srcCommands = path.join(__dirname, "..", "..", "..", ".agents", "commands");
			if (fs.existsSync(srcCommands)) {
				coreCommands = fs.readdirSync(srcCommands);
			}
		} catch {
			coreCommands = [];
		}
		if (coreCommands.length === 0) return;
		if (!dryRun) {
			for (const entry of coreCommands) {
				const p = path.join(targetCommands, entry);
				try {
					if (fs.existsSync(p) || (() => { try { fs.lstatSync(p); return true; } catch { return false; } })()) {
						fs.rmSync(p, { recursive: true, force: true });
					}
				} catch {
					/* ignore */
				}
			}
			try {
				if (fs.existsSync(targetCommands) && fs.readdirSync(targetCommands).length === 0) {
					fs.rmdirSync(targetCommands);
				}
			} catch {
				/* ignore */
			}
		} else {
			logDry(
				`Would remove core commands from ${agentsTarget} because opencode is not selected (user commands preserved)`,
			);
		}
	},
};

module.exports.uninstall = function (ctx) {
	const path = require("path");
	const { getGlobalPath } = require("./index.js");
	const { targetDir, isGlobal, surgicallyCleanupAgentsDir } = ctx;
	const opencodePath = isGlobal ? getGlobalPath("opencode") : path.join(targetDir, ".opencode");
	if (fs.existsSync(opencodePath)) {
		surgicallyCleanupAgentsDir(opencodePath);
	}
};
