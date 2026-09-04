#!/usr/bin/env node
/**
 * Session Start — refresh project-context.md at session start / completion.
 *
 * Used by @memory-controller (`session-start`) and orchestrator_state.js
 * (`session-start`, `complete`, `session-write`, `set-phase`). This is the deterministic engine — the
 * calling layer decides when to invoke it.
 *
 * Usage (CLI):
 *   node session_start.js --agent {agent-name} --domain {domain} [--goal "one-liner"]
 *
 * Behavior:
 *   1. Syncs machine state block (<!-- BEGIN MACHINE STATE --> ... <!-- END MACHINE STATE -->)
 *      with Stack, Git Branch, Active Phase, Active Sprint, Blocker Status, Engine Version.
 *   2. Keeps legacy [CORE] fields in sync if present.
 *   3. Re-counts Blockers from artifacts/memory/blockers-and-risks.md (active entries).
 *   4. Records a 1-line marker in `## Session Activity` section — one per agent per day.
 *   5. Updates the Last updated / Updated by footer.
 *   6. Uses atomic file writes (tmp file + rename) for crash safety.
 */

const fs = require('fs');
const path = require('path');
const { writeFileSync: atomicWriteFileSync } = require('./lib/fs_atomic.js');
const { withLock } = require('./lib/lock.js');
const { ensureSessionCurrent, regenerateLatest } = require('./lib/session.js');

const PROJECT_CONTEXT = path.join(process.cwd(), 'artifacts', 'memory', 'project-context.md');
const PIPELINE_STATE = path.join(process.cwd(), 'artifacts', 'output', 'pipeline-state.json');
const BLOCKERS_FILE = path.join(process.cwd(), 'artifacts', 'memory', 'blockers-and-risks.md');

function readFile(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function canonicalPhase() {
  const raw = readFile(PIPELINE_STATE);
  if (!raw) return null;
  try {
    const state = JSON.parse(raw);
    return state.current_phase || state.phase || null;
  } catch {
    return null;
  }
}

function canonicalSprint() {
  const raw = readFile(PIPELINE_STATE);
  if (!raw) return 'none';
  try {
    const state = JSON.parse(raw);
    return state.sprint || state.active_sprint || 'none';
  } catch {
    return 'none';
  }
}

function detectRepository() {
  const { execSync } = require('child_process');
  try {
    const inRepo = execSync('git rev-parse --is-inside-work-tree 2>/dev/null', { encoding: 'utf8' }).trim();
    if (inRepo !== 'true') return 'Not a git repository (local folder)';
    const remote = execSync('git config --get remote.origin.url 2>/dev/null', { encoding: 'utf8' }).trim();
    return remote || 'Local git repository (no remote)';
  } catch {
    return 'Not a git repository (local folder)';
  }
}

function detectBranch() {
  const { execSync } = require('child_process');
  try {
    const inRepo = execSync('git rev-parse --is-inside-work-tree 2>/dev/null', { encoding: 'utf8' }).trim();
    if (inRepo !== 'true') return 'none';
    const branch = execSync('git branch --show-current 2>/dev/null', { encoding: 'utf8' }).trim();
    if (branch) return branch;
    const ref = execSync('git rev-parse --abbrev-ref HEAD 2>/dev/null', { encoding: 'utf8' }).trim();
    return ref || 'none';
  } catch {
    return 'none';
  }
}

function detectEngineVersion() {
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.version) return pkg.version;
    }
  } catch {}
  return '2.0.9';
}

function detectStack() {
  const root = process.cwd();
  const clues = [];
  try {
    if (fs.existsSync(path.join(root, 'package.json'))) {
      const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      const langs = new Set(['JavaScript']);
      if (pkg.devDependencies && (pkg.devDependencies.typescript || pkg.dependencies?.typescript)) langs.add('TypeScript');
      if (pkg.scripts && (pkg.scripts.next || pkg.dependencies?.next)) langs.add('Next.js');
      if (pkg.dependencies?.react || pkg.devDependencies?.react) langs.add('React');
      if (pkg.dependencies?.vue) langs.add('Vue');
      if (deps.electron) langs.add('Electron');
      clues.push([...langs].join('+'));
    }
    if (fs.existsSync(path.join(root, 'requirements.txt'))) clues.push('Python');
    if (fs.existsSync(path.join(root, 'pyproject.toml'))) clues.push('Python');
    if (fs.existsSync(path.join(root, 'Cargo.toml'))) clues.push('Rust');
    if (fs.existsSync(path.join(root, 'go.mod'))) clues.push('Go');
    if (fs.existsSync(path.join(root, 'Gemfile'))) clues.push('Ruby');
    if (fs.existsSync(path.join(root, 'pom.xml'))) clues.push('Java');
  } catch {
    // best-effort detection; keep whatever exists
  }
  return clues.length > 0 ? clues.join(', ') : 'None';
}

function countActiveBlockers() {
  const raw = readFile(BLOCKERS_FILE);
  if (!raw) return 0;
  const text = raw.toLowerCase();
  if (text.includes('*no open blockers*') || text.includes('## active blockers\nnone')) return 0;
  const active = [];
  const statusRe = /\*\*status:\*\*\s*([a-z ]+)/gi;
  let m;
  while ((m = statusRe.exec(raw)) !== null) {
    const status = m[1].trim().toLowerCase();
    if (status === 'open' || status === 'in progress' || status === 'active') active.push(status);
  }
  return active.length;
}

function generateMachineStateBlock({ stack, branch, phase, sprint, blockers, version }) {
  const blockerText = blockers === 1 ? '1 active blocker' : `${blockers} active blockers`;
  return [
    '<!-- BEGIN MACHINE STATE -->',
    '## [RUNTIME STATE]',
    `- Stack: ${stack || 'None'}`,
    `- Git Branch: ${branch || 'none'}`,
    `- Active Phase: ${phase || 'validation'}`,
    `- Active Sprint: ${sprint || 'none'}`,
    `- Blocker Status: ${blockerText}`,
    `- Engine Version: ${version || '2.0.9'}`,
    '<!-- END MACHINE STATE -->'
  ].join('\n');
}

function spliceMachineState(content, machineBlock) {
  const machineFenceRe = /<!-- BEGIN MACHINE STATE -->[\s\S]*?<!-- END MACHINE STATE -->/;
  if (machineFenceRe.test(content)) {
    return content.replace(machineFenceRe, machineBlock);
  }

  // If fence not present yet, inject it after ## [IDENTITY] section or ## [CORE] section, or at top
  const identityRe = /(##\s*\[IDENTITY\][\s\S]*?)(?=\n## |\n---|\s*$)/i;
  const identityMatch = content.match(identityRe);
  if (identityMatch) {
    const endPos = identityMatch.index + identityMatch[0].length;
    return content.slice(0, endPos).trimEnd() + '\n\n' + machineBlock + '\n\n' + content.slice(endPos).trimStart();
  }

  const coreRe = /(##\s*\[CORE\][\s\S]*?)(?=\n## |\n---|\s*$)/i;
  const coreMatch = content.match(coreRe);
  if (coreMatch) {
    const endPos = coreMatch.index + coreMatch[0].length;
    return content.slice(0, endPos).trimEnd() + '\n\n' + machineBlock + '\n\n' + content.slice(endPos).trimStart();
  }

  return content.trimEnd() + '\n\n' + machineBlock + '\n';
}

function syncDetectedFields(content, repository, stack) {
  if (repository) {
    const replaced = content.replace(/^(\s*-\s+\*\*Repository\*\*:\s*).*$/gm, `$1${repository}`)
                            .replace(/^(Repository:\s*).*$/gm, `$1${repository}`);
    if (replaced === content && !/(^|\n)Repository:\s*/.test(content)) {
      content = insertCoreField(content, 'Repository', repository);
    } else {
      content = replaced;
    }
  }
  if (stack) {
    const replaced = content.replace(/^(\s*-\s+\*\*Stack\*\*:\s*).*$/gm, `$1${stack}`)
                            .replace(/^(Stack:\s*).*$/gm, `$1${stack}`);
    if (replaced === content && !/(^|\n)Stack:\s*/.test(content)) {
      content = insertCoreField(content, 'Stack', stack);
    } else {
      content = replaced;
    }
  }
  return content;
}

function insertCoreField(content, key, value) {
  const siblings = ['Project:', 'Stack:', 'Phase:', 'Sprint:', 'Blockers:'];
  const blockRe = /(## \[CORE\][^\n]*\n)([\s\S]*?)(?=\n## |\n---|\s*$)/;
  const block = content.match(blockRe);
  if (!block) return content;
  const header = block[1];
  let body = block[2];
  let inserted = false;
  for (const sib of siblings) {
    const sibLine = body.match(new RegExp(`^(\\s*${sib}.*)$`, 'm'));
    if (sibLine) {
      body = body.replace(sibLine[1], `${sibLine[1]}\n${key}: ${value}`);
      inserted = true;
      break;
    }
  }
  if (!inserted) body = body.trimEnd() + `\n${key}: ${value}\n`;
  return content.replace(block[0], header + body);
}

function syncCore(content, phase, blockers) {
  if (phase) {
    content = content.replace(/(^Phase:\s*)\S+/gm, `$1${phase}`);
  }
  content = content.replace(/(^Blockers:\s*)\d+/gm, `$1${blockers}`);
  return content;
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function markerExists(lines, today, agent) {
  const re = new RegExp(`^- ${today}( \\d{2}:\\d{2})? @${agent}\\b`);
  return lines.some((l) => re.test(l.trim()));
}

function updateSessionActivity(content, line, today, agent) {
  const header = '## Session Activity';
  const headerRe = /^## Session Activity[^\n]*\n(?:\s*-[^\n]*\n?)*/m;
  if (headerRe.test(content)) {
    content = content.replace(headerRe, (match) => {
      const lines = match.split('\n').filter((l) => l.trim().startsWith('-'));
      if (markerExists(lines, today, agent)) return match;
      lines.unshift(line);
      return header + '\n' + lines.slice(0, 5).join('\n') + '\n';
    });
    return content;
  }
  const anchor = /^(## \[CORE\][^\n]*\n(?:\s*[^\n]*\n)*?)(\n+)/m;
  if (anchor.test(content)) {
    content = content.replace(anchor, `$1\n${header}\n${line}\n$2`);
    return content;
  }
  return content + `\n${header}\n${line}\n`;
}

function updateFooter(content, agent) {
  const now = nowStamp();
  let updated = false;
  content = content.replace(/(\*\*Last updated:\*\*)[^\n]*/, (m, p) => {
    updated = true;
    return `${p} ${now}`;
  });
  content = content.replace(/(\*\*Updated by:\*\*)[^\n]*/, (m, p) => {
    updated = true;
    return `${p} @${agent}`;
  });
  if (!updated) {
    content = content.trimEnd() + `\n\n---\n\n**Last updated:** ${now}\n**Updated by:** @${agent}\n`;
  }
  return content;
}

/**
 * Sync project-context.md atomically.
 * @param {object} opts - { agent (required), domain, goal }
 * @param {boolean} opts.ensureMarker - if true, force a marker even when one exists today
 * @param {boolean} opts.recordMarker - if false, skip Session Activity marker
 */
function syncProjectContext({ agent, domain, goal, ensureMarker = false, recordMarker = true }) {
  if (!agent) throw new Error('Missing agent');
  const content = readFile(PROJECT_CONTEXT);
  if (content === null) throw new Error('project-context.md not found. Run init first.');

  const today = new Date().toISOString().slice(0, 10);
  const stamp = nowStamp();
  const phase = canonicalPhase();
  const sprint = canonicalSprint();
  const blockers = countActiveBlockers();
  const repository = detectRepository();
  const branch = detectBranch();
  const stack = detectStack();
  const version = detectEngineVersion();

  let updated = content;

  // Splice machine state block
  const machineBlock = generateMachineStateBlock({ stack, branch, phase, sprint, blockers, version });
  updated = spliceMachineState(updated, machineBlock);

  // DoD #1 fix (2026-08-25): legacy syncCore/syncDetectedFields passes ran
  // globally and destroyed human lines outside the fence matching machine
  // shapes (e.g. `Blockers: 7` → 0, `Stack:` overwritten). Machine truth now
  // lives exclusively inside the fence via generateMachineStateBlock; human
  // content outside the fence is never rewritten.

  const marker = `- ${stamp} @${agent} — ${domain || 'work'}` + (goal ? `: ${goal}` : '');

  if (recordMarker) {
    if (ensureMarker) {
      const headerRe = /^## Session Activity[^\n]*\n(?:\s*-[^\n]*\n?)*/m;
      const exists = headerRe.test(updated) && markerExists(updated.match(headerRe)[0].split('\n').filter((l) => l.trim().startsWith('-')), today, agent);
      if (!exists) {
        updated = updateSessionActivity(updated, marker, today, agent);
      }
    } else {
      updated = updateSessionActivity(updated, marker, today, agent);
    }
  }

  updated = updateFooter(updated, agent);

  atomicWriteFileSync(PROJECT_CONTEXT, updated, 'utf8');
  return {
    file: 'project-context.md',
    phase: phase || '(unchanged)',
    blockers,
    repository,
    branch,
    stack,
    version,
    activity: recordMarker ? marker : null
  };
}

module.exports = {
  syncProjectContext,
  detectStack,
  detectBranch,
  detectRepository,
  detectEngineVersion,
  countActiveBlockers,
  generateMachineStateBlock,
  spliceMachineState
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const out = { agent: null, domain: null, goal: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--agent') out.agent = args[i + 1];
    if (args[i] === '--domain') out.domain = args[i + 1];
    if (args[i] === '--goal') out.goal = args[i + 1];
  }
  // 02o.8: busy-tree detection + auto-worktree (owner option b) — must run
  // even when project-context sync fails (fresh clones). Advisory to stderr,
  // never blocks the session.
  try { require('./worktree.js').autoOffer({ agent: out.agent }); } catch { /* non-blocking */ }
  try {
    const result = syncProjectContext(out);
    // 02o.2/02o.3: explicit session record + derived latest.md repair
    let session_id = null;
    try { session_id = ensureSessionCurrent(out.agent); } catch { /* non-blocking */ }
    try {
      withLock(path.join(process.cwd(), '.agents', 'state', 'latest.lock'), () => { regenerateLatest(); });
    } catch { /* non-blocking */ }
    console.log(JSON.stringify({ success: true, session_id, ...result }));
  } catch (e) {
    console.error(JSON.stringify({ error: e.message }));
    process.exit(1);
  }
}
