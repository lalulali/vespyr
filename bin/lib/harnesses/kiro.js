/**
 * Kiro harness adapter — three-part shape:
 *   1. .kiro/steering/vespyr-steering.md  emitted from the canonical template
 *   2. .kiro/skills -> .agents/skills     symlink (or copy fallback)
 *   3. .kiro/agents/*.json                transpiled from .agents/agents/*.md
 *
 * Part 3 is generated, never a symlink: Kiro parses an agent config as its
 * runtime settings, while Vespyr personas carry OpenCode-shaped frontmatter
 * (`tools: {write: true}`, `permission:` singular). A raw symlink would hand
 * Kiro 20 agents whose `tools` is a map where it expects an array.
 *
 * JSON, not Markdown: Kiro CLI 3.1.0 discovers only `.json` in .kiro/agents —
 * a Markdown agent is silently absent from `kiro-cli agent list` and
 * `kiro-cli agent validate` parses it as JSON and rejects it (verified
 * 2026-11-10, tests/cli/kiro-conformance.test.js).
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Identification for files this adapter owns. Kiro tolerates unknown top-level
// keys (verified with `kiro-cli agent validate`), so the marker and checksum
// ride inside the config instead of a sidecar ledger that can drift.
// Reinstall and uninstall only touch configs carrying `_vespyr.generated`, so
// hand-written Kiro agents survive both.
const MARKER_KEY = "_vespyr";
const CHECKSUM_RE = /^[a-f0-9]{16}$/;

// Marker used by the previous Markdown emitter (never published, but installed
// from this repo). Recognised only so upgrade can sweep it away.
const LEGACY_MD_MARKER = "# vespyr-generated";

function checksum(content) {
	return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

/** Split `---` frontmatter from the document body. */
function splitFrontmatter(content) {
	const normalized = content.replace(/^\uFEFF/, "");
	const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/);
	if (!match) return { raw: "", body: normalized.trim() };
	return {
		raw: match[1],
		body: normalized.slice(match[0].length).trim(),
	};
}

/**
 * Minimal frontmatter reader: top-level scalars plus one level of nesting
 * (`permission:`, `tools:`). That is all a persona file can contain, and a full
 * YAML parser would be a new dependency for two blocks.
 */
function parseFrontmatter(raw) {
	const root = {};
	let nestedKey = null;
	for (const line of raw.split(/\r?\n/)) {
		if (!line.trim() || /^\s*#/.test(line)) continue;
		const match = line.match(/^(\s*)([A-Za-z_][\w-]*):[ \t]*(.*)$/);
		if (!match) continue;
		const [, indent, key, rawValue] = match;
		const value = rawValue.replace(/^(['"])(.*)\1$/, "$2").trim();
		if (indent.length === 0) {
			nestedKey = null;
			if (value === "") {
				root[key] = {};
				nestedKey = key;
			} else {
				root[key] = value;
			}
		} else if (nestedKey) {
			root[nestedKey][key] = value;
		}
	}
	return root;
}

/** Persona links are written for `.agents/agents/`; Kiro reads them from `.kiro/agents/`. */
function rewriteLinks(body) {
	return body.replace(/\]\(\.\.\//g, "](.agents/");
}

/**
 * Translate Vespyr's declared restrictions into Kiro permission rules. Only
 * denials are emitted — Kiro's default is to ask before acting, so silence
 * keeps the confirm prompt instead of silently granting a capability.
 */
function denyRulesFor(frontmatter) {
	const permission =
		frontmatter.permission && typeof frontmatter.permission === "object"
			? frontmatter.permission
			: {};
	const tools =
		frontmatter.tools && typeof frontmatter.tools === "object" ? frontmatter.tools : {};
	const rules = [];
	if (permission.edit === "deny" || tools.write === "false") {
		rules.push({ capability: "fs_write", effect: "deny" });
	}
	if (permission.read === "deny") {
		rules.push({ capability: "fs_read", effect: "deny" });
	}
	if (permission.bash === "deny") {
		rules.push({ capability: "shell", effect: "deny" });
	}
	return rules;
}

function buildAgentConfig(name, description, denyRules, body) {
	const config = { name, tools: ["*"] };
	if (description) config.description = description;
	if (denyRules.length > 0) config.permissions = { rules: denyRules };
	config.prompt = body;
	config[MARKER_KEY] = {
		generated: true,
		source: `.agents/agents/${name}.md`,
		checksum: "",
	};
	return config;
}

function serialize(config) {
	return `${JSON.stringify(config, null, 2)}\n`;
}

function signAgent(config) {
	config[MARKER_KEY].checksum = checksum(serialize(config));
	return serialize(config);
}

function parseGeneratedConfig(content) {
	let parsed;
	try {
		parsed = JSON.parse(content);
	} catch {
		return null;
	}
	if (!parsed || typeof parsed !== "object") return null;
	const marker = parsed[MARKER_KEY];
	if (!marker || marker.generated !== true) return null;
	return parsed;
}

/** True when a generated config still matches what this emitter wrote (no human edits). */
function isUneditedGenerated(content) {
	const parsed = parseGeneratedConfig(content);
	if (!parsed) return false;
	const recorded = parsed[MARKER_KEY].checksum;
	if (typeof recorded !== "string" || !CHECKSUM_RE.test(recorded)) return false;
	parsed[MARKER_KEY].checksum = "";
	return checksum(serialize(parsed)) === recorded;
}

/** Copy an edited generated file aside before regeneration overwrites it. */
function backupEditedAgent(sourcePath, file, backupDir, baseDir, ctx) {
	const { dryRun, logWarn } = ctx;
	if (dryRun) return;
	try {
		const relDir = path.dirname(path.relative(baseDir, sourcePath));
		const destDir = relDir === "." ? backupDir : path.join(backupDir, relDir);
		fs.mkdirSync(destDir, { recursive: true });
		let dest = path.join(destDir, `${file}.backup.${Date.now()}`);
		let n = 1;
		while (fs.existsSync(dest)) {
			dest = path.join(destDir, `${file}.backup.${Date.now()}-${n++}`);
		}
		fs.copyFileSync(sourcePath, dest);
		logWarn(
			`Kiro agent ${file} was edited since generation — backed up to ${path.relative(path.dirname(backupDir), dest)}.`,
		);
	} catch {
		// Never fail an install over a backup.
	}
}

/**
 * Relocate backups written by older versions (which dropped
 * `<file>.backup.<ts>` next to the original) into `.kiro/.bak/`. Without this,
 * an upgraded project keeps its existing litter forever.
 */
function relocateLooseBackups(baseDir, backupDir, dryRun) {
	let moved = 0;
	const walk = (dir) => {
		let entries;
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			if (entry.name === ".bak") continue;
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				walk(full);
				continue;
			}
			if (!/\.backup\.\d+$/.test(entry.name)) continue;
			const rel = path.relative(baseDir, full);
			let dest = path.join(backupDir, rel);
			let n = 1;
			while (fs.existsSync(dest)) {
				dest = path.join(backupDir, `${rel}-${n++}`);
			}
			if (dryRun) {
				moved++;
				continue;
			}
			try {
				fs.mkdirSync(path.dirname(dest), { recursive: true });
				fs.renameSync(full, dest);
				moved++;
			} catch {
				// Leave it in place rather than failing the install over a backup.
			}
		}
	};
	walk(baseDir);
	return moved;
}

/**
 * Remove Markdown agents emitted by the previous version. Kiro CLI ignores
 * them, so leaving them behind would keep a second, invisible set of personas
 * in the same directory.
 */
function removeLegacyMarkdownAgents(destDir, ctx) {
	const { dryRun, logWarn } = ctx;
	let entries;
	try {
		entries = fs.readdirSync(destDir).filter((f) => f.endsWith(".md"));
	} catch {
		return 0;
	}
	let removed = 0;
	for (const entry of entries) {
		const full = path.join(destDir, entry);
		let content;
		try {
			content = fs.readFileSync(full, "utf8");
		} catch {
			continue;
		}
		if (!content.slice(0, 512).includes(LEGACY_MD_MARKER)) continue;
		if (!dryRun) {
			try {
				fs.unlinkSync(full);
			} catch {
				continue;
			}
			logWarn(`Removed legacy Kiro agent ${entry} (Kiro discovers .json, not .md).`);
		}
		removed++;
	}
	return removed;
}

/** Write `.kiro/agents/<name>.json` for every persona. Returns the write count. */
function emitAgents(sourceDir, destDir, backupDir, ctx) {
	const { dryRun, logDry, logWarn } = ctx;
	let files;
	try {
		files = fs.readdirSync(sourceDir).filter((f) => f.endsWith(".md"));
	} catch {
		// No personas to translate (core-only or partial tree) — not an error.
		return 0;
	}

	let written = 0;
	for (const file of files.sort()) {
		const name = file.slice(0, -3);
		const destName = `${name}.json`;
		const dest = path.join(destDir, destName);

		let source;
		try {
			source = fs.readFileSync(path.join(sourceDir, file), "utf8");
		} catch {
			continue;
		}
		const { raw, body } = splitFrontmatter(source);
		const frontmatter = parseFrontmatter(raw);
		const config = buildAgentConfig(
			name,
			frontmatter.description,
			denyRulesFor(frontmatter),
			rewriteLinks(body),
		);
		const desired = signAgent(config);

		let existing = null;
		try {
			existing = fs.readFileSync(dest, "utf8");
		} catch {
			existing = null;
		}
		if (existing !== null) {
			if (existing === desired) continue;
			if (!parseGeneratedConfig(existing)) {
				logWarn(`Kiro agent ${destName} is hand-written and differs — leaving it untouched.`);
				continue;
			}
			// Marked but different: either stale output from an older Vespyr
			// (checksum proves untouched — replace silently) or a human edit
			// inside a generated file (copy aside first).
			if (!isUneditedGenerated(existing)) {
				backupEditedAgent(dest, destName, backupDir, path.dirname(destDir), ctx);
			}
		}

		if (dryRun) {
			logDry(`Would generate Kiro agent ${dest}`);
			written++;
			continue;
		}
		fs.mkdirSync(destDir, { recursive: true });
		fs.writeFileSync(dest, desired);
		written++;
	}
	return written;
}

module.exports = {
	id: "kiro",
	label: "Kiro Steering, Skills & Agents",
	description:
		"scaffolds .kiro/steering/vespyr-steering.md, .kiro/skills/ symlink & .kiro/agents/",

	detectPaths({ targetDir }) {
		return [`${targetDir}/.kiro/steering`, `${targetDir}/.kiro/skills`];
	},

	globalPath({ home }) {
		return `${home}/.kiro`;
	},

	methodProbePaths({ targetDir }) {
		return [
			`${targetDir}/.kiro/skills`,
			`${targetDir}/.kiro/steering/vespyr-steering.md`,
		];
	},

	install(ctx) {
		const { targetDir, agentsTarget, method, dryRun, handleConflict, createLinkOrCopy } = ctx;
		const kiroDir = path.join(targetDir, ".kiro");
		const steeringDir = path.join(kiroDir, "steering");
		const skillsDir = path.join(kiroDir, "skills");
		const kiroAgentsDir = path.join(kiroDir, "agents");

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

		const backupDir = path.join(kiroDir, ".bak");
		const backupOptions = { backupDir, backupDirBase: kiroDir };
		relocateLooseBackups(kiroDir, backupDir, dryRun);
		handleConflict(skillsDir, "kiro skills", targetDir, method, backupOptions);
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

		// A previous doc sync may have written this exact document as a real
		// file. Backing up our own output would leave noise in .bak, so drop it
		// and let the link replace it. A differing file is still user content
		// and still gets backed up by handleConflict.
		try {
			const st = fs.lstatSync(steeringAgentsPath);
			if (
				st.isFile() &&
				fs.existsSync(canonicalSource) &&
				fs.readFileSync(steeringAgentsPath).equals(fs.readFileSync(canonicalSource))
			) {
				if (!dryRun) fs.unlinkSync(steeringAgentsPath);
			}
		} catch {
			// absent: nothing to replace
		}

		handleConflict(
			steeringAgentsPath,
			"kiro steering vespyr-steering.md",
			targetDir,
			method,
			backupOptions,
		);
		if (!fs.existsSync(steeringAgentsPath)) {
			createLinkOrCopy(
				path.relative(steeringDir, canonicalSource),
				steeringAgentsPath,
				"file",
				method,
			);
		}

		// A symlink here is a hand-rolled bridge (or a pre-transpile Vespyr
		// install). Writing through it would rewrite .agents/agents/*.md — the
		// source personas — so it is removed before any generated file lands.
		try {
			if (fs.lstatSync(kiroAgentsDir).isSymbolicLink()) {
				const target = fs.readlinkSync(kiroAgentsDir);
				if (!target.replace(/\\/g, "/").includes(".agents")) {
					ctx.logWarn(
						`Replacing .kiro/agents symlink that pointed at ${target} (not a Vespyr link).`,
					);
				}
				if (!dryRun) fs.unlinkSync(kiroAgentsDir);
			}
		} catch {
			// ENOENT: nothing to replace.
		}

		removeLegacyMarkdownAgents(kiroAgentsDir, ctx);
		emitAgents(path.join(agentsTarget, "agents"), kiroAgentsDir, backupDir, ctx);
	},

	summaryLines({ count } = {}) {
		const agentLine =
			typeof count === "number" && count > 0
				? `    ✓ .kiro/agents/*.json          (${count} Kiro custom agents)`
				: `    ✓ .kiro/agents/*.json          (Kiro custom agents)`;
		return [
			`    ✓ .kiro/steering/vespyr-steering.md (Kiro steering)`,
			`    ✓ .kiro/skills -> skills          (Kiro skills)`,
			agentLine,
		];
	},
};

/**
 * A backup is "Vespyr-owned" when what it preserved was produced by Vespyr:
 * a generated agent config (`_vespyr` marker), a legacy generated Markdown
 * agent, the steering document this engine emits, or a directory that is only
 * a copy of the core skills. Anything else is the owner's own file and is left
 * on disk — uninstall must never delete a document it did not create.
 */
function steeringOutputs(agentsSrc) {
	const canonicalPath = path.join(
		agentsSrc,
		"templates",
		"system",
		"vespyr-steering.md.canonical",
	);
	try {
		const canonical = fs.readFileSync(canonicalPath, "utf8");
		// The doc sync emits a `.kiro/`-rewritten variant; both shapes are ours.
		return [canonical, canonical.replace(/\.agents\//g, ".kiro/")];
	} catch {
		return [];
	}
}

function isCoreSkillsCopy(dir, agentsSrc) {
	let entries;
	let coreSkills;
	try {
		entries = fs.readdirSync(dir);
		coreSkills = new Set(fs.readdirSync(path.join(agentsSrc, "skills")));
	} catch {
		return false;
	}
	if (entries.length === 0 || coreSkills.size === 0) return false;
	return entries.every((entry) => coreSkills.has(entry));
}

function isVespyrOwnedBackup(entryPath, agentsSrc) {
	let stat;
	try {
		stat = fs.lstatSync(entryPath);
	} catch {
		return false;
	}
	if (stat.isSymbolicLink()) return false;
	if (stat.isDirectory()) return isCoreSkillsCopy(entryPath, agentsSrc);

	let content;
	try {
		content = fs.readFileSync(entryPath, "utf8");
	} catch {
		return false;
	}
	if (parseGeneratedConfig(content)) return true;
	if (content.slice(0, 512).includes(LEGACY_MD_MARKER)) return true;
	if (path.basename(entryPath).startsWith("vespyr-steering.md.backup.")) {
		return steeringOutputs(agentsSrc).includes(content);
	}
	return false;
}

function pruneEmptyDirs(dir) {
	let entries;
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return;
	}
	for (const entry of entries) {
		if (entry.isDirectory() && !entry.isSymbolicLink()) {
			pruneEmptyDirs(path.join(dir, entry.name));
		}
	}
	try {
		if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
	} catch {}
}

/** Delete only Vespyr-owned backups. Returns how many entries survive. */
function sweepVespyrBackups(backupDir, agentsSrc) {
	const walk = (dir) => {
		let entries;
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const full = path.join(dir, entry.name);
			if (isVespyrOwnedBackup(full, agentsSrc)) {
				try {
					fs.rmSync(full, { recursive: true, force: true });
				} catch {}
			} else if (entry.isDirectory() && !entry.isSymbolicLink()) {
				walk(full);
			}
		}
	};
	walk(backupDir);
	pruneEmptyDirs(backupDir);
	try {
		return fs.readdirSync(backupDir).length;
	} catch {
		return 0;
	}
}

module.exports.uninstall = function uninstallHarnessShape(ctx) {
	const fs = require("fs");
	const path = require("path");
	const { getGlobalPath } = require("./index.js");
	const { targetDir, isGlobal, agentsSrc, removeDirIfEmpty } = ctx;
	const home = require("os").homedir();
	const getPath = (localRel) => (isGlobal ? getGlobalPath("kiro") : path.join(targetDir, localRel));
		const kiroTargetDir = getPath(".kiro");
		try {
			const kstat = fs.lstatSync(kiroTargetDir);
			if (kstat.isSymbolicLink()) {
				fs.unlinkSync(kiroTargetDir);
				return;
			}
		} catch {
			return;
		}

		const skillsDir = path.join(kiroTargetDir, "skills");
		try {
			const stat = fs.lstatSync(skillsDir);
			if (stat.isSymbolicLink()) {
				fs.unlinkSync(skillsDir);
			} else if (stat.isDirectory()) {
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

		const steeringDir = path.join(kiroTargetDir, "steering");
		try {
			const stat = fs.lstatSync(steeringDir);
			if (stat.isSymbolicLink()) {
				fs.unlinkSync(steeringDir);
			} else if (stat.isDirectory()) {
				// Surgical: remove ONLY the Vespyr-owned steering doc.
				// The old code additionally deleted any steering/*.md
				// whose basename collided with a core agent name —
				// user-authored steering docs with the same filename
				// were destroyed on uninstall.
				const vespyrSteering = path.join(steeringDir, "vespyr-steering.md");
				try {
					const st = fs.lstatSync(vespyrSteering);
					if (st.isSymbolicLink() || st.isFile()) {
						fs.unlinkSync(vespyrSteering);
					}
				} catch (e) {}
				removeDirIfEmpty(steeringDir);
			}
		} catch (e) {}

		// Surgical: generated agents carry the marker; hand-written ones do not
		// and must survive. A symlinked dir here was never a Vespyr install.
		const kiroAgentsDir = path.join(kiroTargetDir, "agents");
		try {
			const stat = fs.lstatSync(kiroAgentsDir);
			if (stat.isSymbolicLink()) {
				fs.unlinkSync(kiroAgentsDir);
			} else if (stat.isDirectory()) {
				for (const entry of fs.readdirSync(kiroAgentsDir)) {
					const entryPath = path.join(kiroAgentsDir, entry);
					let content;
					try {
						content = fs.readFileSync(entryPath, "utf8");
					} catch {
						continue;
					}
					const ours =
						(entry.endsWith(".json") && parseGeneratedConfig(content) !== null) ||
						(entry.endsWith(".md") && content.slice(0, 512).includes(LEGACY_MD_MARKER));
					if (!ours) continue;
					try {
						fs.unlinkSync(entryPath);
					} catch {}
				}
				removeDirIfEmpty(kiroAgentsDir);
			}
		} catch (e) {}

		// Vespyr-owned backups go; the owner's own documents stay, and the
		// caller is told which is which instead of printing a flat "complete".
		const keptBackups = sweepVespyrBackups(
			path.join(kiroTargetDir, ".bak"),
			agentsSrc,
		);
		if (keptBackups > 0 && typeof ctx.logWarn === "function") {
			ctx.logWarn(
				`Kept ${keptBackups} backup entr${keptBackups === 1 ? "y" : "ies"} in .kiro/.bak (not Vespyr-generated).`,
			);
		}

		removeDirIfEmpty(kiroTargetDir);
};
