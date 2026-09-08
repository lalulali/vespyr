/**
 * Symlink/copy installation primitives with conflict handling (02h §10 A2b).
 * Extracted verbatim from bin/cli.js; runtime state consumed via lib/state.js.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { R } = require("./state.js");
const { log, logDry, logWarn } = require("./logger.js");

function handleConflict(linkPath, name, targetDir, method = "symlink") {
	try {
		const stat = fs.lstatSync(linkPath);
		if (stat.isSymbolicLink()) {
			const target = fs.readlinkSync(linkPath);
			const normTarget = target.replace(/\\/g, "/");
			const home = os.homedir().replace(/\\/g, "/");
			if (
				method === "symlink" &&
				(normTarget === ".agents" ||
					normTarget.endsWith("/.agents") ||
					normTarget.includes(".agents/") ||
					normTarget === `${home}/.agents` ||
					normTarget === `${home}/.agents/skills` ||
					normTarget === `${home}/.agents/agents` ||
					normTarget === `${home}/.agents/GUARDRAILS.md`)
			) {
				// Stale-link repair: a link that points at a .agents-shaped
				// target which no longer resolves is dangling — remove it so
				// the caller recreates a live link instead of early-returning
				// forever on a broken pointer.
				try {
					// existsSync follows the link: false == dangling.
					if (!fs.existsSync(linkPath)) {
						logWarn(`Removing dangling ${name} symlink to recreate it.`);
						if (!R.dryRun) fs.unlinkSync(linkPath);
					} else {
						return;
					}
				} catch {
					return;
				}
				return;
			}
			logWarn(`Removing existing symlink ${name} to configure with ${method}.`);
			if (!R.dryRun) fs.unlinkSync(linkPath);
		} else {
			if (method === "copy" && stat.isDirectory()) {
				// Copy-into-existing-dir ("enrich") path: merge incoming files
				// so a re-install refreshes stale content instead of silently
				// accumulating it. The caller passes the source via
				// createLinkOrCopy; here we only avoid destroying user files —
				// the merge itself happens in createLinkOrCopy's cpSync.
				// NOTE: *.backup.* / *.bak-* files are never merged or hashed
				// (see manifest exclusions) so backup litter cannot poison
				// future verifies.
				return;
			}
			const backupPath = `${linkPath}.backup.${Date.now()}`;
			logWarn(
				`Existing ${name} found. Backing up to ${path.basename(backupPath)}`,
			);
			if (!R.dryRun) {
				fs.renameSync(linkPath, backupPath);
			}
		}
	} catch (e) {
		if (e.code !== "ENOENT") {
			throw e;
		}
	}
}

function createLinkOrCopy(target, linkPath, type = "dir", method = "symlink") {
	if (R.dryRun) {
		logDry(`Would create ${type} ${method}: ${linkPath} -> ${target}`);
		return;
	}

	const sourcePath = path.isAbsolute(target)
		? target
		: path.resolve(path.dirname(linkPath), target);

	if (method === "copy") {
		if (type === "dir") {
			fs.cpSync(sourcePath, linkPath, { recursive: true, dereference: true });
			if (!R.createdLinks.includes(linkPath)) R.createdLinks.push(linkPath);
		} else {
			fs.copyFileSync(sourcePath, linkPath);
			if (!R.createdLinks.includes(linkPath)) R.createdLinks.push(linkPath);
		}
	} else {
		if (fs.existsSync(linkPath)) {
			try {
				const stat = fs.lstatSync(linkPath);
				if (stat.isSymbolicLink()) {
					const existing = fs.readlinkSync(linkPath);
					const normExisting = existing.replace(/\\/g, "/");
					const normTarget = target.replace(/\\/g, "/");
					const normRel = path.relative(path.dirname(linkPath), target).replace(/\\/g, "/");
					const normSource = sourcePath.replace(/\\/g, "/");
					if (
						normExisting === normTarget ||
						normExisting === normRel ||
						normExisting === normSource
					) {
						return;
					}
				}
			} catch (e) {
				/* ignore */
			}
		}

		try {
			const symlinkType = (process.platform === "win32" && type === "dir") ? "junction" : type;
			const symlinkTarget = (process.platform === "win32" && symlinkType === "junction")
				? sourcePath
				: target;

			fs.symlinkSync(symlinkTarget, linkPath, symlinkType);
			R.createdLinks.push(linkPath);
		} catch (err) {
			// Symlink-privilege fallbacks: EPERM/EACCES (Windows dev-mode off,
			// corporate policy), EXDEV (cross-device), plus read-only /
			// unsupported FS codes. All fall back to a real copy tracked in
			// R.createdLinks so SIGINT/error rollback can sweep it. Anything
			// else (ENOENT source-missing, ELOOP pathological loop, EBUSY
			// locking races) rethrows — silently copying the wrong bytes is
			// worse than failing loudly.
			if (
				err.code === "EPERM" ||
				err.code === "EACCES" ||
				err.code === "UNKNOWN" ||
				err.code === "EXDEV" ||
				err.code === "ENOSYS" ||
				err.code === "EROFS" ||
				err.code === "ENOTSUP" ||
				process.platform === "win32"
			) {
				if (type === "dir") {
					fs.cpSync(sourcePath, linkPath, { recursive: true, dereference: true });
					logWarn(`Symlink failed (${err.code || "unsupported"}), copied directory instead: ${linkPath}`);
				} else {
					fs.copyFileSync(sourcePath, linkPath);
					logWarn(`Symlink failed (${err.code || "unsupported"}), copied file instead: ${linkPath}`);
				}
				if (!R.createdLinks.includes(linkPath)) R.createdLinks.push(linkPath);
			} else {
				throw err;
			}
		}
	}
}
module.exports = { handleConflict, createLinkOrCopy };
