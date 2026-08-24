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
		if (!dryRun) {
			fs.rmSync(targetCommands, { recursive: true, force: true });
		} else {
			logDry(
				`Would remove commands folder from ${agentsTarget} because opencode is not selected`,
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
