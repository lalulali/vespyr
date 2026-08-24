/**
 * Windsurf harness adapter — DORMANT (post-v2 option per 02m WS-D).
 * NOT installable in this release (moved to 03c pending per-harness research).
 * Retains detect/uninstall so pre-existing Windsurf installs can be cleaned up.
 * Part of the 02h §10 harness-layer extraction (A2a).
 */
const fs = require("fs");
const path = require("path");

module.exports = {
	id: "windsurf",
	label: "Windsurf",
	description: "scaffolds .windsurf/workflows symlink & .windsurfrules symlink",
	dormant: true,
	legacyCleanupOnly: true,

	detectPaths({ targetDir }) {
		return [`${targetDir}/.windsurf/workflows`];
	},

	globalPath({ home }) {
		return `${home}/.windsurf`;
	},

	methodProbePaths({ targetDir }) {
		return [`${targetDir}/.windsurf/workflows`];
	},

};

module.exports.uninstall = function uninstallHarnessShape(ctx) {
	const fs = require("fs");
	const path = require("path");
	const { getGlobalPath } = require("./index.js");
	const { targetDir, isGlobal, agentsSrc, removeDirIfEmpty } = ctx;
	const home = require("os").homedir();
	const getPath = (localRel) => (isGlobal ? getGlobalPath("windsurf") : path.join(targetDir, localRel));
		const windsurfTargetDir = getPath(".windsurf");
		if (fs.existsSync(windsurfTargetDir)) {
			const workflowsDir = path.join(windsurfTargetDir, "workflows");
			if (fs.existsSync(workflowsDir)) {
				try {
					const stat = fs.lstatSync(workflowsDir);
					if (stat.isSymbolicLink()) {
						fs.unlinkSync(workflowsDir);
					} else {
						const skillsSrcDir = path.join(agentsSrc, "skills");
						if (fs.existsSync(skillsSrcDir)) {
							const coreSkills = fs.readdirSync(skillsSrcDir);
							for (const skill of coreSkills) {
								const skillPath = path.join(workflowsDir, skill);
								if (fs.existsSync(skillPath)) {
									fs.rmSync(skillPath, { recursive: true, force: true });
								}
							}
						}
						removeDirIfEmpty(workflowsDir);
					}
				} catch (e) {}
			}
			removeDirIfEmpty(windsurfTargetDir);
		}
		const windsurfRulesPath = isGlobal
			? path.join(home, ".windsurfrules")
			: path.join(targetDir, ".windsurfrules");
		if (fs.existsSync(windsurfRulesPath)) {
			try {
				fs.unlinkSync(windsurfRulesPath);
			} catch (e) {}
		}
};
