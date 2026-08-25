/**
 * GitHub Copilot harness adapter (GENERATE-TARGET):
 * Copilot's recommended project targets live under `.github/` —
 * `.github/copilot-instructions.md` (repo-wide instructions) and
 * `.github/skills/<name>/SKILL.md` (Agent Skills). Owner field test
 * (2026-08-25): VS Code Copilot's `/` command picker does NOT discover
 * skills via root-level `.agents/skills`, but DOES resolve them through a
 * symlinked `.github/skills -> ../.agents/skills`. So we emit into
 * `.github/`: a pointer stub to root AGENTS.md plus that skills link
 * (copy method emits a real directory instead). The legacy .yml emitter was cut.
 */
const COPILOT_INSTRUCTIONS_STUB = `<!-- Vespyr-managed — removed on uninstall. Canonical source: ./AGENTS.md -->
# Vespyr

This project uses Vespyr (.agents/). Read \`AGENTS.md\` at the repository root as the instruction baseline before responding. Skills live in \`.agents/skills/\` (linked here as \`.github/skills/\`).
`;

module.exports = {
	id: "github",
	label: "GitHub Copilot",
	description: "scaffolds .github/copilot-instructions.md & .github/skills/ symlink",

	detectPaths({ targetDir }) {
		return [`${targetDir}/.github`];
	},

	globalPath({ home }) {
		return require("path").join(home, ".config", "github-copilot");
	},

	methodProbePaths({ targetDir }) {
		return [`${targetDir}/.github/skills`];
	},

	install(ctx) {
		const fs = require("fs");
		const path = require("path");
		const { targetDir, agentsTarget, method, handleConflict, createLinkOrCopy, log } = ctx;
		const githubDir = path.join(targetDir, ".github");
		fs.mkdirSync(githubDir, { recursive: true });

		const instructionsPath = path.join(githubDir, "copilot-instructions.md");
		if (!fs.existsSync(instructionsPath)) {
			if (ctx.dryRun) {
				ctx.logDry(`Would create ${path.relative(targetDir, instructionsPath)}`);
			} else {
				fs.writeFileSync(instructionsPath, COPILOT_INSTRUCTIONS_STUB);
			}
		}

		const skillsPath = path.join(githubDir, "skills");
		handleConflict(skillsPath, ".github/skills", targetDir, method);
		if (!fs.existsSync(skillsPath)) {
			createLinkOrCopy(
				path.relative(githubDir, agentsTarget + path.sep + "skills"),
				skillsPath,
				"dir",
				method,
			);
		}
		if (ctx.dryRun) {
			ctx.logDry(
				"Would emit .github/copilot-instructions.md + .github/skills -> .agents/skills.",
			);
		} else {
			log(
				"  GitHub Copilot: emitted .github/copilot-instructions.md + .github/skills -> .agents/skills.",
			);
		}
	},

	summaryLines() {
		return [
			`    ✓ .github/copilot-instructions.md (GitHub Copilot project instructions)`,
			`    ✓ .github/skills -> .agents/skills (GitHub Copilot agent skills)`,
		];
	},

	uninstall(ctx) {
		// Vespyr-owned artifacts are removed; user-authored files kept.
		const fs = require("fs");
		const path = require("path");
		const { getGlobalPath } = require("./index.js");
		const { targetDir, isGlobal, agentsSrc, removeDirIfEmpty } = ctx;
		const getPath = (localRel) => (isGlobal ? getGlobalPath("github") : path.join(targetDir, localRel));
		const githubTargetDir = getPath(".github");
		if (!fs.existsSync(githubTargetDir)) return;
		const agentsDir = path.join(githubTargetDir, "agents");
		try {
			const stat = fs.lstatSync(agentsDir);
			if (stat.isSymbolicLink()) {
				fs.unlinkSync(agentsDir);
			} else if (stat.isDirectory()) {
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
		// Generated skills link: unlink only when it is a symlink or an empty
		// dir; a real directory with content is user-authored and stays.
		// lstat (not existsSync): performUninstall cleans .agents/ first, so
		// this link may already be dangling — existsSync would miss it.
		const skillsDir = path.join(githubTargetDir, "skills");
		try {
			const stat = fs.lstatSync(skillsDir);
			if (stat.isSymbolicLink()) {
				fs.unlinkSync(skillsDir);
			} else if (stat.isDirectory() && fs.readdirSync(skillsDir).length === 0) {
				fs.rmdirSync(skillsDir);
			}
		} catch (e) {}
		const copilotInstructions = path.join(githubTargetDir, "copilot-instructions.md");
		if (fs.existsSync(copilotInstructions)) {
			try {
				fs.unlinkSync(copilotInstructions);
			} catch (e) {}
		}
		removeDirIfEmpty(githubTargetDir);
	},
};

