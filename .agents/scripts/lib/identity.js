const fs = require('fs');
const path = require('path');
const { writeFileSync } = require('./fs_atomic');
const { findWorkspaceRoot } = require('./workspace');

/**
 * Reads and synchronizes identity block in project-context.md.
 * Ensures both `## [IDENTITY]\nUser Nickname: <Name>` and list formats are kept in sync.
 */

function getProjectContextPath(root = null) {
  const base = root || findWorkspaceRoot();
  return path.join(base, 'artifacts', 'memory', 'project-context.md');
}

function readUserNickname(root = null) {
  const ctxPath = getProjectContextPath(root);
  if (!fs.existsSync(ctxPath)) return 'User';

  const content = fs.readFileSync(ctxPath, 'utf8');

  // Match ## [IDENTITY] section
  const identityMatch = content.match(/##\s*\[IDENTITY\][\s\S]*?(?:User Nickname:\s*([^\r\n]+)|-\s*\*\*User Nickname\*\*:\s*([^\r\n]+))/i);
  if (identityMatch) {
    return (identityMatch[1] || identityMatch[2] || 'User').trim();
  }

  // Fallback match anywhere in file
  const genericMatch = content.match(/(?:User Nickname:\s*([^\r\n]+)|-\s*\*\*User Nickname\*\*:\s*([^\r\n]+))/i);
  if (genericMatch) {
    return (genericMatch[1] || genericMatch[2] || 'User').trim();
  }

  return 'User';
}

function updateUserNickname(nickname, root = null) {
  const ctxPath = getProjectContextPath(root);
  const cleanNickname = nickname ? nickname.trim() : 'User';

  if (!fs.existsSync(ctxPath)) {
    const initialContent = `# Project Context\n\n## [CORE]\nProject: Vespyr\nRepository: local\nStack: JavaScript\nPhase: validation\nSprint: none\nBlockers: 0\n\n## [IDENTITY]\nUser Nickname: ${cleanNickname}\n`;
    writeFileSync(ctxPath, initialContent, 'utf8');
    return;
  }

  let content = fs.readFileSync(ctxPath, 'utf8');

  if (content.includes('## [IDENTITY]')) {
    content = content.replace(/(##\s*\[IDENTITY\][\s\S]*?)(User Nickname:\s*[^\r\n]+|-\s*\*\*User Nickname\*\*:\s*[^\r\n]+)/i, `$1User Nickname: ${cleanNickname}`);
  } else {
    // Append identity section
    content = content.trim() + `\n\n## [IDENTITY]\nUser Nickname: ${cleanNickname}\n`;
  }

  writeFileSync(ctxPath, content, 'utf8');
}

module.exports = {
  getProjectContextPath,
  readUserNickname,
  updateUserNickname
};
