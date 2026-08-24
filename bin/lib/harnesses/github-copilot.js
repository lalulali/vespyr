/**
 * GitHub Copilot harness adapter (02h §10 A2a; mechanism per 02m WS-D C1/C2=B):
 * Copilot discovers `.agents/skills/` and personas via root AGENTS.md
 * natively — ZERO emission from this CLI. Known caveat (owner field test,
 * 2026-08-24): functional-but-invisible — skills activate but do not appear
 * in autocomplete/picker. The legacy .yml emitter was cut (stale format).
 */
module.exports = {
	id: "github",
	label: "GitHub Copilot",
	description: "adopts root AGENTS.md + ~/.agents skills natively — zero emission",

	detectPaths({ targetDir }) {
		return [`${targetDir}/.github`];
	},

	globalPath({ home }) {
		return require("path").join(home, ".config", "github-copilot");
	},

	methodProbePaths() {
		return [];
	},

	install(ctx) {
		ctx.log(
			"  GitHub Copilot: adopting root AGENTS.md natively — no files emitted.",
		);
	},

	summaryLines() {
		return [`    ✓ GitHub Copilot                  (native AGENTS.md adoption)`];
	},

	uninstall(ctx) {
		// Legacy cleanup: older Vespyr versions emitted .yml agents +
		// copilot-instructions.md. Surgical rules apply (custom files kept).
		const fs = require("fs");
		const path = require("path");
		const { getGlobalPath } = require("./index.js");
		const { targetDir, isGlobal, agentsSrc, removeDirIfEmpty } = ctx;
		const home = require("os").homedir();
		const getPath = (localRel) => (isGlobal ? getGlobalPath("github") : path.join(targetDir, localRel));
		const githubTargetDir = getPath(".github");
		if (!fs.existsSync(githubTargetDir)) return;
		const agentsDir = path.join(githubTargetDir, "agents");
		if (fs.existsSync(agentsDir)) {
			try {
				const stat = fs.lstatSync(agentsDir);
				if (stat.isSymbolicLink()) {
					fs.unlinkSync(agentsDir);
				} else {
					const agentsSrcDir = path.join(agentsSrc, "agents");
					if (fs.existsSync(agentsSrcDir)) {
						const coreAgents = fs
							.readdirSync(agentsSrcDir)
							.filter((f) => f.endsWith(".md"));
						for (const agent of coreAgents) {
							const name = path.basename(agent, ".md");
							const ymlFile = path.join(agentsDir, `${name}.yml`);
							if (fs.existsSync(ymlFile)) fs.unlinkSync(ymlFile);
						}
					}
					removeDirIfEmpty(agentsDir);
				}
			} catch (e) {}
		}
		const copilotInstructions = path.join(githubTargetDir, "copilot-instructions.md");
		if (fs.existsSync(copilotInstructions)) {
			try {
				fs.unlinkSync(copilotInstructions);
			} catch (e) {}
		}
		removeDirIfEmpty(githubTargetDir);
	},
};
