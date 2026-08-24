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
				return;
			}
			logWarn(`Removing existing symlink ${name} to configure with ${method}.`);
			if (!R.dryRun) fs.unlinkSync(linkPath);
		} else {
			if (method === "copy" && stat.isDirectory()) {
				// If we want to copy to an existing directory, we enrich it directly
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
			fs.cpSync(sourcePath, linkPath, { recursive: true });
		} else {
			fs.copyFileSync(sourcePath, linkPath);
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
			if (
				err.code === "EPERM" ||
				err.code === "EACCES" ||
				err.code === "UNKNOWN" ||
				err.code === "EXDEV" ||
				process.platform === "win32"
			) {
				if (type === "dir") {
					fs.cpSync(sourcePath, linkPath, { recursive: true });
					logWarn(`Symlink failed (${err.code || "unsupported"}), copied directory instead: ${linkPath}`);
				} else {
					fs.copyFileSync(sourcePath, linkPath);
					logWarn(`Symlink failed (${err.code || "unsupported"}), copied file instead: ${linkPath}`);
				}
			} else {
				throw err;
			}
		}
	}
}
module.exports = { handleConflict, createLinkOrCopy };
