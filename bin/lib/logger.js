/**
 * CLI logging primitives (02h §10 A2b). logDry honors the runtime dry-run
 * flag owned by lib/state.js.
 */
const { R } = require("./state.js");

function log(msg) {
	console.log(msg);
}

function logDry(msg) {
	if (R.dryRun) {
		console.log(`[DRY RUN] ${msg}`);
	}
}

function logError(msg) {
	console.error(`Error: ${msg}`);
}

function logWarn(msg) {
	console.warn(`Warning: ${msg}`);
}

module.exports = { log, logDry, logError, logWarn };
