const fs = require('fs');
const path = require('path');

/**
 * Deterministic workspace root resolution.
 * Climbs parent directories to find .agents/ or git root, falling back to process.cwd().
 */

function findWorkspaceRoot(startDir = process.cwd()) {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;

  while (current !== root) {
    if (fs.existsSync(path.join(current, '.agents')) || fs.existsSync(path.join(current, '.git'))) {
      return current;
    }
    current = path.dirname(current);
  }

  // Check filesystem root as well
  if (fs.existsSync(path.join(root, '.agents')) || fs.existsSync(path.join(root, '.git'))) {
    return root;
  }

  return path.resolve(startDir);
}

module.exports = {
  findWorkspaceRoot
};
