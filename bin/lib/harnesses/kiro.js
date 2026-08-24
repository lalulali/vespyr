/**
 * Kiro harness adapter — hybrid shape: steering markdown emitted from the
 * canonical template + .kiro/skills symlink into .agents/skills.
 * Part of the 02h §10 harness-layer extraction (A2a).
 */
const fs = require("fs");
const path = require("path");

module.exports = {
	id: "kiro",
	label: "Kiro Steering & Skills",
	description: "scaffolds .kiro/steering/vespyr-steering.md & .kiro/skills/ symlink",

	detectPaths({ targetDir }) {
		return [`${targetDir}/.kiro/steering`, `${targetDir}/.kiro/skills`];
	},

	globalPath({ home }) {
		return `${home}/.kiro`;
	},

	methodProbePaths({ targetDir }) {
		return [
			`${targetDir}/.kiro/skills`,
			`${targetDir}/.kiro/steering/AGENTS.md`,
		];
	},

	install(ctx) {
		const { targetDir, agentsTarget, method, dryRun, handleConflict, createLinkOrCopy } = ctx;
		const kiroDir = path.join(targetDir, ".kiro");
		const steeringDir = path.join(kiroDir, "steering");
		const skillsDir = path.join(kiroDir, "skills");

		if (!dryRun) {
			fs.mkdirSync(kiroDir, { recursive: true });
		}

		if (fs.existsSync(steeringDir)) {
			try {
				const stat = fs.lstatSync(steeringDir);
				if (stat.isSymbolicLink()) {
					if (!dryRun) fs.unlinkSync(steeringDir);
				}
			} catch (e) {}
		}

		if (!dryRun && !fs.existsSync(steeringDir)) {
			fs.mkdirSync(steeringDir, { recursive: true });
		}

		handleConflict(skillsDir, "kiro skills", targetDir, method);
		if (!fs.existsSync(skillsDir)) {
			createLinkOrCopy(
				path.relative(kiroDir, path.join(agentsTarget, "skills")),
				skillsDir,
				"dir",
				method,
			);
		}

		const steeringAgentsPath = path.join(steeringDir, "vespyr-steering.md");
		const canonicalSource = fs.existsSync(
			path.join(agentsTarget, "templates", "system", "vespyr-steering.md.canonical"),
		)
			? path.join(agentsTarget, "templates", "system", "vespyr-steering.md.canonical")
			: fs.existsSync(path.join(agentsTarget, "templates", "system", "agent.md.canonical"))
			? path.join(agentsTarget, "templates", "system", "agent.md.canonical")
			: path.join(targetDir, "AGENTS.md");

		handleConflict(
			steeringAgentsPath,
			"kiro steering vespyr-steering.md",
			targetDir,
			method,
		);
		if (!fs.existsSync(steeringAgentsPath)) {
			createLinkOrCopy(
				path.relative(steeringDir, canonicalSource),
				steeringAgentsPath,
				"file",
				method,
			);
		}
	},

	summaryLines() {
		return [
			`    ✓ .kiro/steering/vespyr-steering.md (Kiro steering)`,
			`    ✓ .kiro/skills -> skills          (Kiro skills)`,
		];
	},
};

module.exports.uninstall = function uninstallHarnessShape(ctx) {
	const fs = require("fs");
	const path = require("path");
	const { getGlobalPath } = require("./index.js");
	const { targetDir, isGlobal, agentsSrc, removeDirIfEmpty } = ctx;
	const home = require("os").homedir();
	const getPath = (localRel) => (isGlobal ? getGlobalPath("kiro") : path.join(targetDir, localRel));
		const kiroTargetDir = getPath(".kiro");
		if (fs.existsSync(kiroTargetDir)) {
			const skillsDir = path.join(kiroTargetDir, "skills");
			if (fs.existsSync(skillsDir)) {
				try {
					const stat = fs.lstatSync(skillsDir);
					if (stat.isSymbolicLink()) {
						fs.unlinkSync(skillsDir);
					} else {
						const skillsSrcDir = path.join(agentsSrc, "skills");
						if (fs.existsSync(skillsSrcDir)) {
							const coreSkills = fs.readdirSync(skillsSrcDir);
							for (const skill of coreSkills) {
								const skillPath = path.join(skillsDir, skill);
								if (fs.existsSync(skillPath)) {
									fs.rmSync(skillPath, { recursive: true, force: true });
								}
							}
						}
						removeDirIfEmpty(skillsDir);
					}
				} catch (e) {}
			}

			const steeringDir = path.join(kiroTargetDir, "steering");
			if (fs.existsSync(steeringDir)) {
				try {
					const stat = fs.lstatSync(steeringDir);
					if (stat.isSymbolicLink()) {
						fs.unlinkSync(steeringDir);
					} else {
						const vespyrSteering = path.join(steeringDir, "vespyr-steering.md");
						if (fs.existsSync(vespyrSteering)) {
							fs.unlinkSync(vespyrSteering);
						}
						const agentsSrcDir = path.join(agentsSrc, "agents");
						if (fs.existsSync(agentsSrcDir)) {
							const coreAgents = fs
								.readdirSync(agentsSrcDir)
								.filter((f) => f.endsWith(".md"));
							for (const agent of coreAgents) {
								const targetAgentPath = path.join(steeringDir, agent);
								if (fs.existsSync(targetAgentPath)) {
									fs.rmSync(targetAgentPath, {
										recursive: true,
										force: true,
									});
								}
							}
						}
						removeDirIfEmpty(steeringDir);
					}
				} catch (e) {}
			}
			removeDirIfEmpty(kiroTargetDir);
		}
};
