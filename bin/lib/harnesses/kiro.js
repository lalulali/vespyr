/**
 * Kiro harness adapter — three-part shape:
 *   1. .kiro/steering/vespyr-steering.md  emitted from the canonical template
 *   2. .kiro/skills -> .agents/skills     symlink (or copy fallback)
 *   3. .kiro/agents/*.md                  transpiled from .agents/agents/*.md
 *
 * Part 3 is generated, never a symlink: Kiro parses an agent file's frontmatter
 * as its runtime config, while Vespyr personas carry OpenCode-shaped
 * frontmatter (`tools: {write: true}`, `permission:` singular). A raw symlink
 * would hand Kiro 20 agents whose `tools` is a map where it expects an array.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Self-describing marker, placed inside the YAML frontmatter as a comment so it
// is not a schema field Kiro could reject. Reinstall and uninstall only ever
// touch files carrying it, so hand-written Kiro agents survive both.
// The value after the colon is a checksum of the file with the marker blanked.
// It lets reinstall tell "stale output from an older Vespyr" (safe to replace)
// from "the user edited a generated file" (back it up first).
const GENERATED_MARKER = "# vespyr-generated";
const MARKER_LINE_RE = /^# vespyr-generated: ([a-f0-9]{16}) - /m;
const UNSIGNED_MARKER = `${GENERATED_MARKER}: none - `;

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

function renderAgent(name, description, denyRules, body, markerHash = "none") {
	const lines = [
		"---",
		`${GENERATED_MARKER}: ${markerHash} - source .agents/agents/${name}.md (do not edit)`,
		`name: ${name}`,
	];
	if (description) lines.push(`description: ${JSON.stringify(description)}`);
	lines.push('tools: ["*"]');
	if (denyRules.length > 0) {
		lines.push("permissions:", "  rules:");
		for (const rule of denyRules) {
			lines.push(`    - capability: ${rule.capability}`, `      effect: ${rule.effect}`);
		}
	}
	lines.push("---", "", body, "");
	return lines.join("\n");
}

function signAgent(content) {
	return content.replace(`${GENERATED_MARKER}: none - `, `${GENERATED_MARKER}: ${checksum(content)} - `);
}

/** True when a marked file still matches what this emitter wrote (no human edits). */
function isUneditedGenerated(content) {
	if (!MARKER_LINE_RE.test(content)) return false;
	const unsigned = content.replace(MARKER_LINE_RE, UNSIGNED_MARKER);
	return checksum(unsigned) === content.match(MARKER_LINE_RE)[1];
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

/** Write `.kiro/agents/<name>.md` for every persona. Returns the write count. */
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
		const dest = path.join(destDir, file);

		let source;
		try {
			source = fs.readFileSync(path.join(sourceDir, file), "utf8");
		} catch {
			continue;
		}
		const { raw, body } = splitFrontmatter(source);
		const frontmatter = parseFrontmatter(raw);
		const unsigned = renderAgent(
			name,
			frontmatter.description,
			denyRulesFor(frontmatter),
			rewriteLinks(body),
		);
		const desired = signAgent(unsigned);

		let existing = null;
		try {
			existing = fs.readFileSync(dest, "utf8");
		} catch {
			existing = null;
		}
		if (existing !== null) {
			if (existing === desired) continue;
			if (!existing.includes(GENERATED_MARKER)) {
				logWarn(`Kiro agent ${file} is hand-written and differs — leaving it untouched.`);
				continue;
			}
			// Marked but different: either stale output from an older Vespyr
			// (checksum proves untouched — replace silently) or a human edit
			// inside a generated file (copy aside first).
			if (!isUneditedGenerated(existing)) {
				backupEditedAgent(dest, file, backupDir, path.dirname(destDir), ctx);
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

		emitAgents(path.join(agentsTarget, "agents"), kiroAgentsDir, backupDir, ctx);
	},

	summaryLines({ count } = {}) {
		const agentLine =
			typeof count === "number" && count > 0
				? `    ✓ .kiro/agents/*.md            (${count} Kiro custom agents)`
				: `    ✓ .kiro/agents/*.md            (Kiro custom agents)`;
		return [
			`    ✓ .kiro/steering/vespyr-steering.md (Kiro steering)`,
			`    ✓ .kiro/skills -> skills          (Kiro skills)`,
			agentLine,
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
					if (!entry.endsWith(".md")) continue;
					const entryPath = path.join(kiroAgentsDir, entry);
					try {
						const content = fs.readFileSync(entryPath, "utf8");
						if (content.slice(0, 512).includes(GENERATED_MARKER)) {
							fs.unlinkSync(entryPath);
						}
					} catch (e) {}
				}
				removeDirIfEmpty(kiroAgentsDir);
			}
		} catch (e) {}

		removeDirIfEmpty(kiroTargetDir);
};
