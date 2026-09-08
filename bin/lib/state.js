/**
 * Mutable runtime install state shared across CLI layers (02h §10 A2b).
 * The monolith previously used module-level `let` globals; extraction needs a
 * single owned store so moved modules and the CLI coordinator stay in sync.
 *
 * Ownership: exactly one install/update runs per process. main() calls
 * resetRuntimeState() once at startup; nothing mid-install may reset —
 * that would orphan already-created links (P2 state). R is intentionally
 * a shared reference (not cloned) so link-utils/installer/ui observe the
 * same createdLinks/dryRun/installed flags; use snapshotRuntimeState()
 * for read-only inspection.
 */
const R = {
	createdLinks: [],
	installed: false,
	dryRun: false,
};

function setState(patch) {
	Object.assign(R, patch);
}

function resetRuntimeState() {
	R.createdLinks = [];
	R.installed = false;
	R.dryRun = false;
}

function snapshotRuntimeState() {
	return { createdLinks: [...R.createdLinks], installed: R.installed, dryRun: R.dryRun };
}

module.exports = { R, setState, resetRuntimeState, snapshotRuntimeState };
