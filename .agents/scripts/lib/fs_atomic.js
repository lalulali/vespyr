const fs = require('fs');
const path = require('path');

/**
 * Crash-safe atomic file writing utilities.
 * Writes to a temporary file in the same directory first, then renames synchronously.
 * Handles cross-device edge cases and cleans up temp files on failure.
 */

/**
 * Atomically writes text or buffer data to a file.
 * @param {string} filePath Absolute or relative path to destination file
 * @param {string|Buffer} data Content to write
 * @param {object} [options={}] Write options (encoding, mode, etc.)
 */
function writeFileSync(filePath, data, options = 'utf8') {
  const resolvedPath = path.resolve(filePath);
  const dir = path.dirname(resolvedPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tmpPath = `${resolvedPath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;

  try {
    fs.writeFileSync(tmpPath, data, options);
    try {
      fs.renameSync(tmpPath, resolvedPath);
    } catch (renameErr) {
      // Fallback for Windows file locks or cross-device links (EXDEV)
      if (renameErr.code === 'EXDEV' || renameErr.code === 'EPERM' || renameErr.code === 'EBUSY') {
        fs.copyFileSync(tmpPath, resolvedPath);
        try { fs.unlinkSync(tmpPath); } catch {}
      } else {
        throw renameErr;
      }
    }
  } catch (err) {
    if (fs.existsSync(tmpPath)) {
      try { fs.unlinkSync(tmpPath); } catch {}
    }
    throw err;
  }
}

/**
 * Atomically writes a JavaScript object as formatted JSON.
 * @param {string} filePath Destination JSON file
 * @param {any} data Object to serialize
 * @param {number} [indent=2] JSON indentation spaces
 */
function writeJsonSync(filePath, data, indent = 2) {
  const jsonContent = JSON.stringify(data, null, indent) + '\n';
  writeFileSync(filePath, jsonContent, 'utf8');
}

/**
 * Reads and parses a JSON file safely.
 * @param {string} filePath Path to JSON file
 * @param {any} [fallback=null] Fallback value if file does not exist or is invalid
 * @returns {any}
 */
function readJsonSync(filePath, fallback = null) {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    return fallback;
  }
  try {
    const raw = fs.readFileSync(resolvedPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (fallback !== null) return fallback;
    throw err;
  }
}

module.exports = {
  writeFileSync,
  writeJsonSync,
  readJsonSync
};
