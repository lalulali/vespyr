/**
 * Cursor harness adapter — DORMANT (post-v2 option per 02m WS-D).
 * NOT installable in this release (moved to 03c pending per-harness research).
 * Retains detect/uninstall so pre-existing Cursor installs can be cleaned up.
 * Part of the 02h §10 harness-layer extraction (A2a).
 */
const fs = require("fs");
const path = require("path");

module.exports = {
	id: "cursor",
	label: "Cursor Rules",
	description: "scaffolds .cursor/rules/*.mdc rules with metadata",
	dormant: true,
	legacyCleanupOnly: true,

	detectPaths({ targetDir }) {
		return [`${targetDir}/.cursor/rules`];
	},

	globalPath({ home, platform }) {
		return platform === "darwin"
			? path.join(home, "Library", "Application Support", "Cursor", "User", "globalRules")
			: path.join(home, ".config", "Cursor", "User", "globalRules");
	},

	methodProbePaths() {
		return [];
	},

};

module.exports.uninstall = function uninstallHarnessShape(ctx) {
	const fs = require("fs");
	const path = require("path");
	const { getGlobalPath } = require("./index.js");
	const { targetDir, isGlobal, agentsSrc, removeDirIfEmpty } = ctx;
	const home = require("os").homedir();
	const getPath = (localRel) => (isGlobal ? getGlobalPath("cursor") : path.join(targetDir, localRel));
		const cursorTargetDir = getPath(".cursor");
		if (fs.existsSync(cursorTargetDir)) {
			const rulesDir = path.join(cursorTargetDir, "rules");
			if (fs.existsSync(rulesDir)) {
				try {
					const stat = fs.lstatSync(rulesDir);
					if (stat.isSymbolicLink()) {
						fs.unlinkSync(rulesDir);
					} else {
						const agentsSrcDir = path.join(agentsSrc, "agents");
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
};
