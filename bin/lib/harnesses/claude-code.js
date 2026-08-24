/**
 * Claude Code harness adapter — .claude -> .agents symlink (+ CLAUDE.md doc
 * generated separately by bootstrapRootDocs in the installer layer).
 * Part of the 02h §10 harness-layer extraction (A2a).
 */
const fs = require("fs");
const path = require("path");

module.exports = {
	id: "claude",
	label: "Claude Code",
	description: "scaffolds .claude -> .agents symlink + CLAUDE.md",

	detectPaths({ targetDir }) {
		return [`${targetDir}/.claude`];
	},

	globalPath({ home }) {
		return `${home}/.claude`;
	},

	methodProbePaths({ targetDir }) {
		return [`${targetDir}/.claude`];
	},

	install(ctx) {
		const fs = require("fs");
		const path = require("path");
		const { targetDir, agentsTarget, method, handleConflict, createLinkOrCopy } = ctx;
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
	},

	summaryLines() {
		return [
			`    ✓ .claude -> .agents              (Claude Code harness)`,
			`    ✓ CLAUDE.md                       (Claude Code project memory)`,
		];
	},
};

module.exports.uninstall = function (ctx) {
	const path = require("path");
	const { getGlobalPath } = require("./index.js");
	const { targetDir, isGlobal, surgicallyCleanupAgentsDir } = ctx;
	const claudePath = isGlobal ? getGlobalPath("claude") : path.join(targetDir, ".claude");
	if (fs.existsSync(claudePath)) {
		surgicallyCleanupAgentsDir(claudePath);
	}
};
