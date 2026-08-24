/**
 * Mutable runtime install state shared across CLI layers (02h §10 A2b).
 * The monolith previously used module-level `let` globals; extraction needs a
 * single owned store so moved modules and the CLI coordinator stay in sync.
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

module.exports = { R, setState, resetRuntimeState };
