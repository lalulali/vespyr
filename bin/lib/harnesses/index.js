/**
 * Harness adapter registry — STATIC require map (02h §10 A2a).
 *
 * Rules:
 * - One file per harness under bin/lib/harnesses/.
 * - Never require adapters dynamically (`require(`./harnesses/${name}`)` is a
 *   security-scanner-flagged pattern). Add new shapes here, explicitly.
 * - `dormant: true` shapes are hidden from the interactive checklist but stay
 *   resolvable via explicit `--harness <id>` (behavior parity with the
 *   pre-refactor CLI).
 */

const opencode = require("./opencode.js");
const claude = require("./claude-code.js");
const kiro = require("./kiro.js");
const cursor = require("./cursor.js");
const github = require("./github-copilot.js");
const windsurf = require("./windsurf.js");

const os = require("os");
const path = require("path");

// Active shapes (owner scope, 2026-08-24): installable + iterated.
const ADAPTERS = [opencode, claude, github, kiro];

// Legacy shapes: NOT installable; retained only for detect + uninstall sweeps
// of pre-existing installs. Redesign lives in 03c after per-harness research.
const LEGACY_CLEANUP_ADAPTERS = [cursor, windsurf];

const ALL = [...ADAPTERS, ...LEGACY_CLEANUP_ADAPTERS];
const REGISTRY = Object.fromEntries(ALL.map((a) => [a.id, a]));

/** Checklist options: active (non-dormant) shapes only. */
const HARNESS_OPTIONS = ADAPTERS.filter((a) => !a.dormant).map((a) => ({
	id: a.id,
	label: a.label,
	description: a.description,
}));

function getAdapter(id) {
	return REGISTRY[id] || null;
}


/**
 * Resolves a harness id (or the special "agents" store) to its global-scope
 * path. Delegates per-shape geometry to the adapter's globalPath().
 */
function getGlobalPath(id, { home = require("os").homedir(), platform = process.platform } = {}) {
	if (id === "agents") return path.join(home, ".agents");
	const adapter = REGISTRY[id];
	if (!adapter || typeof adapter.globalPath !== "function") return null;
	return adapter.globalPath({ home, platform });
}

module.exports = { ADAPTERS, REGISTRY, HARNESS_OPTIONS, getAdapter, getGlobalPath };
