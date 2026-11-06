#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const EVENT_FILE_PATTERN = /^([A-Za-z0-9][A-Za-z0-9_-]{0,127})\.json$/;

// Secret scrubbing and injection sanitisation for maintenance event details.
//
// WHY THIS EXISTS. `--details-json` used to be parsed with no content filter,
// stored verbatim in the run event file, and echoed verbatim by `status`. A
// secret pasted into an evidence reference therefore persisted on disk and
// into every transcript of the run.
//
// WHY THE PATTERNS ARE COPIED RATHER THAN IMPORTED. The product memory
// write path owns the authoritative secret patterns, and importing them from
// here was tried first and rejected on two counts: the maintenance lane must
// not reference a product module at all (the execution guard enforces that),
// and maintenance_state.js is loaded in isolation by other consumers — it is
// copied into a bare scripts directory by the plan-check and execution-guard
// suites — so a hard require of the product writer would make the
// maintenance state store unloadable outside a full checkout.
//
// The list below is therefore a verbatim copy of the product's
// SECRET_PATTERNS and INJECTION_PATTERNS, and the maintenance regression
// test pins it to the product's own export: the parity test compares every
// pattern name, regex source, and flag against the product module, and
// compares the scrubbing output on a shared corpus. A pattern added to the
// product without a matching update here fails that test, so this copy
// cannot silently fall behind the control it mirrors.
const SECRET_PATTERNS = [
  { name: 'AWS Access Key', regex: /\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/g },
  { name: 'GitHub Token', regex: /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,255}\b/g },
  { name: 'Anthropic Key', regex: /\bsk-ant-[A-Za-z0-9\-_]{16,}\b/g },
  // P1 (secret-scrub follow-up): unified with scanner INJ-SECRET sk- class.
  // Was sk-[A-Za-z0-9]{16,} (no -/_ → missed sk-proj-… which carries hyphens).
  // Now sk-[A-Za-z0-9_-]{20,} mirrors audit-spec.json (covers sk-proj-…).
  { name: 'OpenAI Key', regex: /\bsk-[A-Za-z0-9\-_]{20,}\b/g },
  { name: 'Google AI Key', regex: /\bAIza[0-9A-Za-z\-_]{35}\b/g },
  { name: 'Slack Token', regex: /\bxox[baprs]-[A-Za-z0-9\-_]{8,}\b/g },
  { name: 'Stripe Key', regex: /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{8,}\b/g },
  { name: 'Env Assignment', regex: /^\s*(?:export\s+)?(?:API[_-]?KEY|SECRET|PASSWORD|TOKEN)\s*=\s*[A-Za-z0-9\-_.~+/=]{8,}\s*$/gmi },
  { name: 'High Entropy', regex: /['"][A-Za-z0-9\-_.~+/=]{32,}['"]/g },
  { name: 'Private Key', regex: /-----BEGIN [^-]*(?:PRIVATE KEY|SECRET KEY)[^-]*-----[\s\S]*?-----END [^-]*(?:PRIVATE KEY|SECRET KEY)[^-]*-----/g },
  { name: 'JWT Token', regex: /\beyJ[A-Za-z0-9-_=]{10,}\.[A-Za-z0-9-_=]{10,}\.[A-Za-z0-9-_.+/=]*\b/g },
  { name: 'API Key Assignment', regex: /(?:api[_-]?key|secret|password|bearer|auth[_-]?token)\s*[:=]\s*['"][A-Za-z0-9\-_.~+/=]{16,}['"]/gi }
];

const INJECTION_PATTERNS = [
  { id: 'INJ-PROMPT', re: /ignore\s+(all\s+|any\s+)?(previous|prior|earlier)\s+instructions|disregard\s+(all\s+|any\s+)?(previous|prior)\s+instructions|forget\s+(all\s+|any\s+)?(previous|prior)\s+instructions/i },
  { id: 'INJ-ROLE', re: /you\s+are\s+now\s+(the\s+)?(system|root|superuser)|act\s+as\s+(the\s+)?system\b|new\s+system\s+prompt:/i },
  { id: 'INJ-TOOL', re: /<(invoke|use_mcp_tool|execute_command|tool_use|antml:invoke)[^>]*>/i },
];

function scrubSecrets(text) {
  let clean = text;
  for (const { name, regex } of SECRET_PATTERNS) {
    clean = clean.replace(regex, `[REDACTED_SECRET: ${name}]`);
  }
  return clean;
}

function sanitizeContent(text) {
  let clean = text
    .replace(/<\|im_start\|>|<\|im_end\|>|\[SYSTEM DIRECTIVE\]/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/[\u200B\u200C\uFEFF\u202E]/g, '');
  for (const pat of INJECTION_PATTERNS) {
    clean = clean.replace(new RegExp(pat.re.source, pat.re.flags.includes('g') ? pat.re.flags : pat.re.flags + 'g'), '[SANITIZED_INSTRUCTION_OVERRIDE]');
  }
  return clean;
}

const RUN_EVENT_TYPES = new Set([
  'plan_drafted',
  'plan_approved',
  'execution_started',
  'execution_completed',
  'task_disposition',
  'verification',
  'panel_seat_disposition',
  'owner_decision_disposition',
]);
const OWNER_DECISION_IDS = Object.freeze(['B1', 'O-4', 'B10', 'credential-residual']);
const LIFECYCLE_REFERENCE_FIELDS = Object.freeze({
  plan_approved: ['draftEventId'],
  execution_started: ['approvalEventId'],
  verification: ['startEventId'],
  execution_completed: ['startEventId', 'verificationEventId'],
});
const CLI_COMMANDS = new Set(['event', 'status', 'artifact-root']);
const BASE_CLI_FLAGS = Object.freeze(['--scope', '--repo-root', '--state-root', '--run-id']);
const EVENT_CLI_FLAGS = Object.freeze([
  ...BASE_CLI_FLAGS,
  '--type',
  '--details-json',
  '--agent',
  '--session-id',
]);

function assertDistinctRunAndSessionIds(runId, sessionId) {
  if (runId === sessionId) {
    throw new Error('Maintenance run ID and session ID must be different');
  }
}

// Secret scrubbing and injection sanitisation for maintenance event details.
//
// WHY THIS EXISTS. `--details-json` used to be parsed with no content
// filter, stored verbatim in the run event file, and echoed verbatim by
// `status`. A secret pasted into an evidence reference therefore persisted
// on disk and into every transcript of the run. The scrubbed form is what
// gets persisted, so the record never contains the raw secret at all.
//
// Scrubbing runs per value, not on the serialized JSON text: the secret
// patterns anchor on quotes (for example the high-entropy rule) and on line
// boundaries (the env-assignment rule), and both anchors only exist in a
// serialized document. Scrubbing each value separately also leaves benign
// identifiers such as plan hashes, event ids, and URLs untouched — a
// 64-character plan hash is not a secret and must not be redacted into noise.
function scrubText(value) {
  return scrubSecrets(sanitizeContent(value));
}

function scrubEventDetails(details) {
  if (Array.isArray(details)) return details.map(scrubEventDetails);
  if (details && typeof details === 'object') {
    const scrubbed = {};
    for (const [key, value] of Object.entries(details)) {
      const scrubbedKey = scrubText(key);
      let targetKey = scrubbedKey;
      let suffix = 2;
      while (Object.hasOwn(scrubbed, targetKey)) {
        targetKey = `${scrubbedKey}#${suffix}`;
        suffix += 1;
      }
      scrubbed[targetKey] = scrubEventDetails(value);
    }
    return scrubbed;
  }
  if (typeof details === 'string') return scrubText(details);
  return details;
}

// The maintenance lane is separated from product state by canonical, disjoint
// paths; it is not a general confidentiality boundary. POSIX ownership/mode
// checks run only where Node exposes a UID on a platform with POSIX mode
// semantics, and check mode bits only; ACL policy remains caller-managed.
// Windows ACLs are user-managed and are not inspected or enforced here.
// Otherwise the caller must protect the root with OS ACLs: it is not a
// confidentiality boundary against other local users or a hostile process
// with the same user's filesystem access. On every platform, a hostile same-user
// process can race path checks and syscalls; this code does not provide
// adversarial-race isolation.
//
// The posture is not left to this comment alone: `status` reports the
// detected capability posture in a machine-readable `capabilities` field, so
// an operator reading a run record can see which protections were actually
// active on the platform that produced it instead of inferring them.
function detectCapabilities() {
  const posixPermissions = process.platform !== 'win32' && typeof process.getuid === 'function';
  return {
    posixPermissions,
    uid: posixPermissions ? process.getuid() : undefined,
    noFollowFlag: typeof fs.constants.O_NOFOLLOW === 'number'
      ? fs.constants.O_NOFOLLOW
      : undefined,
  };
}

function describeCapabilities(capabilities) {
  const posix = Boolean(capabilities && capabilities.posixPermissions);
  return {
    platform: process.platform,
    posixPermissionChecks: posix,
    ownerOnlyDirectoryEnforcement: posix,
    ancestorPermissionChecks: posix,
    noFollowFileCreation: Boolean(capabilities && typeof capabilities.noFollowFlag === 'number'),
    posture: posix ? 'posix-permissions-enforced' : 'permissions-not-enforced-platform-limitation',
    note: posix
      ? 'Owner-only directory modes, ancestor writability, and no-follow file creation are enforced on this platform.'
      : 'This platform exposes no POSIX UID or mode semantics, so directory ownership, mode, and ancestor checks are not enforced; protect the state root with OS ACLs.',
  };
}

function assertOwnedByCurrentUser(stat, label, capabilities) {
  if (!capabilities.posixPermissions) return;
  if (!Number.isInteger(stat.uid) || stat.uid !== capabilities.uid) {
    throw new Error(`${label} must be owned by the current user`);
  }
}

function assertDirectoryPermissions(stat, label, capabilities) {
  if (!capabilities.posixPermissions) return;
  assertOwnedByCurrentUser(stat, label, capabilities);
  const mode = stat.mode & 0o777;
  if ((mode & 0o700) !== 0o700) {
    throw new Error(`${label} POSIX mode bits must grant the owner read, write, and search access`);
  }
  if ((mode & 0o022) !== 0) {
    throw new Error(`${label} must not be group- or world-writable by POSIX mode bits`);
  }
}

function assertPrivateDirectoryPermissions(stat, label, capabilities) {
  if (!capabilities.posixPermissions) return;
  assertDirectoryPermissions(stat, label, capabilities);
  if ((stat.mode & 0o077) !== 0) {
    throw new Error(`${label} POSIX mode bits must not grant group or other access`);
  }
}

// The state root is the trust anchor of the maintenance lane: run ids, agent
// names, plan hashes, and evidence references all live under it. Checking only
// the leaf's mode bits reads stronger than it is — a world-writable ancestor
// lets another user swap the state root between the check and the write, and
// group/world read on the leaf exposes every record below it by default.
//
// Every ancestor is therefore checked for group or world writability. The
// sticky bit is the one thing that makes such an ancestor tolerable: with it
// set, another user still cannot rename or replace an entry they do not own,
// so the swap attack fails even though they may create new entries.
function assertAncestorPermissions(stateRoot, capabilities) {
  if (!capabilities.posixPermissions) return;
  let ancestor = path.dirname(stateRoot);
  for (;;) {
    let stat;
    try {
      stat = fs.lstatSync(ancestor);
    } catch (error) {
      throw new Error(`Cannot inspect ancestor directory of the external state root: ${error.message}`);
    }
    if (stat.isSymbolicLink()) {
      throw new Error(`Ancestor directory ${ancestor} of the external state root must not be a symbolic link`);
    }
    if (!stat.isDirectory()) {
      throw new Error(`Ancestor directory ${ancestor} of the external state root must be a directory`);
    }
    const mode = stat.mode & 0o777;
    const sticky = (stat.mode & 0o1000) !== 0;
    if (!sticky && (mode & 0o022) !== 0) {
      throw new Error(
        `Ancestor directory ${ancestor} of the external state root must not be group- or world-writable by POSIX mode bits`,
      );
    }
    const parent = path.dirname(ancestor);
    if (parent === ancestor) break;
    ancestor = parent;
  }
}

function assertRecordPermissions(stat, capabilities, label = 'Session record') {
  if (!stat.isFile()) {
    throw new Error(`${label} must be a regular file`);
  }
  if (!capabilities.posixPermissions) return;
  assertOwnedByCurrentUser(stat, label, capabilities);
  const mode = stat.mode & 0o777;
  if ((mode & 0o600) !== 0o600 || (mode & 0o077) !== 0) {
    throw new Error(`${label} must have owner-only POSIX mode bits`);
  }
}

function contains(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function assertChildPath(parent, child, label) {
  if (path.dirname(child) !== parent || !contains(parent, child)) {
    throw new Error(`${label} path escapes the external state root`);
  }
}

function lstatIfPresent(filePath, label) {
  try {
    return fs.lstatSync(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw new Error(`Cannot inspect ${label}: ${error.message}`);
  }
}

function assertCanonicalStateRoot(stateRoot, capabilities) {
  if (typeof stateRoot !== 'string' || !path.isAbsolute(stateRoot) || path.resolve(stateRoot) !== stateRoot) {
    throw new Error('External state root must be an absolute canonical path');
  }

  let stat;
  let realPath;
  try {
    stat = fs.lstatSync(stateRoot);
    realPath = fs.realpathSync(stateRoot);
  } catch (error) {
    throw new Error(`Cannot verify external state root: ${error.message}`);
  }
  if (stat.isSymbolicLink() || !stat.isDirectory() || realPath !== stateRoot) {
    throw new Error('External state root must remain a canonical non-symlink directory');
  }
  assertPrivateDirectoryPermissions(stat, 'External state root', capabilities);
  assertAncestorPermissions(stateRoot, capabilities);
}

function assertCanonicalRepoRoot(repoRoot) {
  if (typeof repoRoot !== 'string' || !path.isAbsolute(repoRoot) || path.resolve(repoRoot) !== repoRoot) {
    throw new Error('Repository root must be an absolute canonical path');
  }

  let stat;
  let realPath;
  try {
    stat = fs.lstatSync(repoRoot);
    realPath = fs.realpathSync(repoRoot);
  } catch (error) {
    throw new Error(`Cannot verify repository root: ${error.message}`);
  }
  if (stat.isSymbolicLink() || !stat.isDirectory() || realPath !== repoRoot) {
    throw new Error('Repository root must remain a canonical non-symlink directory');
  }
  let helperRepoRoot;
  try {
    helperRepoRoot = fs.realpathSync(path.resolve(__dirname, '..', '..'));
  } catch (error) {
    throw new Error(`Cannot verify maintenance helper repository: ${error.message}`);
  }
  if (repoRoot !== helperRepoRoot) {
    throw new Error('Repository root must resolve to this maintenance helper repository');
  }
}

function validateMaintenanceRoots(identity, capabilities) {
  if (!identity || typeof identity.repoRoot !== 'string' || typeof identity.stateRoot !== 'string') {
    throw new Error('Validated repository and external state roots are required');
  }

  assertCanonicalRepoRoot(identity.repoRoot);
  assertCanonicalStateRoot(identity.stateRoot, capabilities);
  if (contains(identity.repoRoot, identity.stateRoot) || contains(identity.stateRoot, identity.repoRoot)) {
    throw new Error('External state root must be disjoint from repository root');
  }

  return { repoRoot: identity.repoRoot, stateRoot: identity.stateRoot };
}

function validateRunIdentity(identity, capabilities) {
  if (!identity || identity.scope !== 'maintenance' ||
      typeof identity.runId !== 'string' || !ID_PATTERN.test(identity.runId)) {
    throw new Error('Validated maintenance run identity is required');
  }

  const hasAgent = identity.agent !== undefined;
  const hasSessionId = identity.sessionId !== undefined;
  if (hasAgent !== hasSessionId || (hasAgent && (
    typeof identity.agent !== 'string' || !identity.agent.trim() || /[\0-\x1f\x7f]/.test(identity.agent) ||
    typeof identity.sessionId !== 'string' || !ID_PATTERN.test(identity.sessionId)
  ))) {
    throw new Error('Maintenance event actor must include a valid agent and session ID');
  }
  if (hasSessionId) assertDistinctRunAndSessionIds(identity.runId, identity.sessionId);

  return { ...validateMaintenanceRoots(identity, capabilities), runId: identity.runId };
}

function validateSessionIdentity(identity, capabilities) {
  if (!identity || identity.scope !== 'maintenance' ||
      typeof identity.agent !== 'string' || !identity.agent.trim() || /[\0-\x1f\x7f]/.test(identity.agent) ||
      typeof identity.runId !== 'string' || !ID_PATTERN.test(identity.runId) ||
      typeof identity.sessionId !== 'string' || !ID_PATTERN.test(identity.sessionId)) {
    throw new Error('Validated maintenance session identity is required');
  }

  assertDistinctRunAndSessionIds(identity.runId, identity.sessionId);
  return validateMaintenanceRoots(identity, capabilities);
}

function ensureDirectory(parent, directory, label, capabilities) {
  assertChildPath(parent, directory, label);

  let stat = lstatIfPresent(directory, label);
  let created = false;
  if (stat === null) {
    try {
      fs.mkdirSync(directory, { mode: 0o700 });
      created = true;
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw new Error(`Cannot create ${label}: ${error.message}`);
      }
    }
    stat = lstatIfPresent(directory, label);
  }

  if (!stat || stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error(`${label} must be a non-symlink directory`);
  }

  let realPath;
  try {
    realPath = fs.realpathSync(directory);
  } catch (error) {
    throw new Error(`Cannot verify ${label}: ${error.message}`);
  }
  if (realPath !== directory || !contains(parent, realPath)) {
    throw new Error(`${label} resolves outside the external state root`);
  }
  // A pre-existing directory is held to the same owner-only rule as a freshly
  // created one: a `runs` or `sessions` directory left group- or world-
  // readable by an earlier run would expose run ids, agent names, plan hashes,
  // and evidence references to every local user.
  assertPrivateDirectoryPermissions(stat, label, capabilities);
  return directory;
}

function createSessionDirectory(sessionsDirectory, sessionDirectory, capabilities) {
  assertChildPath(sessionsDirectory, sessionDirectory, 'Session directory');
  const existing = lstatIfPresent(sessionDirectory, 'session directory');
  if (existing !== null) {
    if (existing.isSymbolicLink() || !existing.isDirectory()) {
      throw new Error('session directory must be a non-symlink directory');
    }
    throw new Error('Session ID already exists; refusing to reuse its directory');
  }

  try {
    fs.mkdirSync(sessionDirectory, { mode: 0o700 });
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new Error('Session ID already exists; refusing to reuse its directory');
    }
    throw new Error(`Cannot create session directory: ${error.message}`);
  }

  const stat = lstatIfPresent(sessionDirectory, 'session directory');
  if (!stat || stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error('session directory must be a non-symlink directory');
  }
  const realPath = fs.realpathSync(sessionDirectory);
  if (realPath !== sessionDirectory || !contains(sessionsDirectory, realPath)) {
    throw new Error('Session directory resolves outside the external state root');
  }
  assertPrivateDirectoryPermissions(stat, 'Session directory', capabilities);
  return sessionDirectory;
}

function sessionRecordOpenFlags(capabilities) {
  const { O_WRONLY, O_CREAT, O_EXCL } = fs.constants;
  if ([O_WRONLY, O_CREAT, O_EXCL].some((flag) => typeof flag !== 'number')) {
    throw new Error('Cannot create an exclusive state record without O_CREAT|O_EXCL');
  }
  return O_WRONLY | O_CREAT | O_EXCL |
    (typeof capabilities.noFollowFlag === 'number' ? capabilities.noFollowFlag : 0);
}

function writeNewRecord(
  stateRoot,
  directory,
  recordPath,
  record,
  capabilities,
  flags,
  label = 'Session record',
  serializedContent,
) {
  const serialized = serializedContent === undefined
    ? `${JSON.stringify(record, null, 2)}\n`
    : serializedContent;
  assertChildPath(directory, recordPath, label);
  if (!contains(stateRoot, recordPath)) {
    throw new Error(`${label} path escapes the external state root`);
  }

  const existing = lstatIfPresent(recordPath, label.toLowerCase());
  if (existing !== null) {
    if (existing.isSymbolicLink() || !existing.isFile()) {
      throw new Error(`${label} path must be a non-symlink file`);
    }
    throw new Error(`${label} already exists; refusing to replace it`);
  }

  let descriptor;
  let failure;
  try {
    descriptor = fs.openSync(recordPath, flags, 0o600);
    assertRecordPermissions(fs.fstatSync(descriptor), capabilities, label);
    fs.writeFileSync(descriptor, serialized, 'utf8');
    fs.fsyncSync(descriptor);
  } catch (error) {
    failure = error;
  } finally {
    if (descriptor !== undefined) {
      try {
        fs.closeSync(descriptor);
      } catch (error) {
        if (failure === undefined) failure = error;
      }
    }
  }

  if (failure !== undefined) {
    if (failure.code === 'EEXIST' || failure.code === 'ELOOP') {
      throw new Error(`${label} already exists or is a symlink; refusing to replace it`);
    }
    throw failure;
  }
}

function startMaintenanceSession(identity, capabilities = detectCapabilities()) {
  const { stateRoot } = validateSessionIdentity(identity, capabilities);
  const recordFlags = sessionRecordOpenFlags(capabilities);

  const sessionsDirectory = path.join(stateRoot, 'sessions');
  const sessions = ensureDirectory(stateRoot, sessionsDirectory, 'sessions directory', capabilities);
  const sessionDirectory = path.join(sessions, identity.sessionId);
  createSessionDirectory(sessions, sessionDirectory, capabilities);

  const recordPath = path.join(sessionDirectory, 'session.json');
  if (path.dirname(recordPath) !== sessionDirectory || !contains(stateRoot, recordPath)) {
    throw new Error('Session record path escapes the external state root');
  }

  const now = new Date().toISOString();
  const record = {
    scope: identity.scope,
    agent: identity.agent,
    runId: identity.runId,
    sessionId: identity.sessionId,
    startedAt: now,
    updatedAt: now,
    status: 'started',
    events: [{ type: 'started', at: now }],
  };

  writeNewRecord(stateRoot, sessionDirectory, recordPath, record, capabilities, recordFlags);
  return recordPath;
}

function getMaintenanceArtifactRoot(identity) {
  const { repoRoot, runId } = validateRunIdentity(identity, detectCapabilities());
  return path.join(repoRoot, 'artifacts', 'output', 'maintenance', runId);
}

function assertNoTraversalComponents(value) {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\0')) {
    throw new Error('Artifact path must be a non-empty path string');
  }
  if (value.split(/[\\/]+/).includes('..')) {
    throw new Error('Artifact path must not contain traversal components');
  }
}

function assertNoSymlinkComponents(repoRoot, candidate) {
  const relative = path.relative(repoRoot, candidate);
  const components = relative.split(path.sep).filter(Boolean);
  let current = repoRoot;

  for (let index = 0; index < components.length; index += 1) {
    current = path.join(current, components[index]);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw new Error(`Cannot inspect artifact path component: ${error.message}`);
    }
    if (stat.isSymbolicLink()) {
      throw new Error('Artifact path must not contain symlinked components');
    }
    const isLast = index === components.length - 1;
    if (!isLast && !stat.isDirectory()) {
      throw new Error('Artifact path parent components must be directories');
    }
    if (isLast && !stat.isDirectory() && !stat.isFile()) {
      throw new Error('Artifact path must resolve to a regular file or directory');
    }
  }
}

function assertMaintenanceArtifactPath(identity, artifactPath) {
  const { repoRoot, runId } = validateRunIdentity(identity, detectCapabilities());
  assertNoTraversalComponents(artifactPath);
  if (!path.isAbsolute(artifactPath)) {
    throw new Error('Artifact path must be absolute');
  }

  const candidate = path.resolve(artifactPath);
  const artifactRoot = path.join(repoRoot, 'artifacts', 'output', 'maintenance', runId);
  if (!contains(artifactRoot, candidate)) {
    throw new Error('Artifact path must stay under this maintenance run artifact root');
  }
  assertNoSymlinkComponents(repoRoot, candidate);
  return candidate;
}

function ensureRunEventDirectories(stateRoot, runId, capabilities) {
  const runsDirectory = ensureDirectory(
    stateRoot,
    path.join(stateRoot, 'runs'),
    'runs directory',
    capabilities,
  );
  const runDirectory = ensureDirectory(
    runsDirectory,
    path.join(runsDirectory, runId),
    'run directory',
    capabilities,
  );
  return ensureDirectory(
    runDirectory,
    path.join(runDirectory, 'events'),
    'run events directory',
    capabilities,
  );
}

function nextMaintenanceEventTimestamp(identity, event, eventsDirectory, capabilities) {
  let latestReferencedTimestamp = -Infinity;
  for (const field of LIFECYCLE_REFERENCE_FIELDS[event.type] || []) {
    const referenceId = event.details[field];
    if (typeof referenceId !== 'string' || !ID_PATTERN.test(referenceId)) continue;

    const referencePath = path.join(eventsDirectory, `${referenceId}.json`);
    assertChildPath(eventsDirectory, referencePath, 'Referenced run event');
    const stat = lstatIfPresent(referencePath, 'referenced run event');
    if (stat === null) continue;
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw new Error('Run event must be a non-symlink regular file');
    }
    assertRecordPermissions(stat, capabilities, 'Run event');

    let referenced;
    try {
      referenced = JSON.parse(fs.readFileSync(referencePath, 'utf8'));
    } catch {
      // A malformed referenced record is not a reason to wedge the run: the
      // append continues without inheriting that timestamp, and the malformed
      // record surfaces as a lifecycle issue on the next status read.
      continue;
    }
    if (!referenced || typeof referenced !== 'object' || Array.isArray(referenced) ||
        referenced.eventId !== referenceId || referenced.runId !== identity.runId ||
        typeof referenced.at !== 'string') {
      continue;
    }

    const milliseconds = Date.parse(referenced.at);
    if (Number.isNaN(milliseconds) || new Date(milliseconds).toISOString() !== referenced.at) continue;
    latestReferencedTimestamp = Math.max(latestReferencedTimestamp, milliseconds);
  }

  const timestamp = new Date(Math.max(Date.now(), latestReferencedTimestamp + 1));
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error('Cannot timestamp a maintenance run event after its referenced event');
  }
  return timestamp.toISOString();
}

function appendMaintenanceRunEvent(identity, event, capabilities = detectCapabilities()) {
  const { stateRoot, runId } = validateRunIdentity(identity, capabilities);
  if (!event || typeof event !== 'object' || !RUN_EVENT_TYPES.has(event.type)) {
    throw new Error('Unsupported maintenance run event type');
  }
  const details = event.details === undefined ? {} : event.details;
  if (!details || typeof details !== 'object' || Array.isArray(details) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(details))) {
    throw new Error('Maintenance run event details must be a plain object');
  }

  // The scrubbed form is what gets persisted, so the raw secret never reaches
  // the event file. The returned record carries the same scrubbed details, so
  // the CLI echo cannot reintroduce what was removed.
  const record = {
    eventId: crypto.randomUUID(),
    runId,
    sessionId: identity.sessionId || null,
    agent: identity.agent || null,
    type: event.type,
    at: new Date().toISOString(),
    details: scrubEventDetails(details),
  };
  const encoded = JSON.stringify(record, null, 2);
  if (encoded === undefined) throw new Error('Maintenance run event must be JSON serializable');
  const persistedRecord = JSON.parse(encoded);

  const eventsDirectory = ensureRunEventDirectories(stateRoot, runId, capabilities);
  record.at = nextMaintenanceEventTimestamp(identity, event, eventsDirectory, capabilities);
  persistedRecord.at = record.at;
  const serialized = `${JSON.stringify(persistedRecord, null, 2)}\n`;
  const eventPath = path.join(eventsDirectory, `${record.eventId}.json`);
  writeNewRecord(
    stateRoot,
    eventsDirectory,
    eventPath,
    record,
    capabilities,
    sessionRecordOpenFlags(capabilities),
    'Run event',
    serialized,
  );
  return record;
}

function inspectExistingDirectory(parent, directory, label, capabilities) {
  assertChildPath(parent, directory, label);
  const stat = lstatIfPresent(directory, label);
  if (stat === null) return null;
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error(`${label} must be a non-symlink directory`);
  }

  let realPath;
  try {
    realPath = fs.realpathSync(directory);
  } catch (error) {
    throw new Error(`Cannot verify ${label}: ${error.message}`);
  }
  if (realPath !== directory || !contains(parent, realPath)) {
    throw new Error(`${label} resolves outside the external state root`);
  }
  assertPrivateDirectoryPermissions(stat, label, capabilities);
  return directory;
}

// Reads the run's event records.
//
// A stray file in the events directory used to throw, which wedged the whole
// run: appends kept succeeding while every status read failed, and the lane
// requires every agent on a run to share one run id, so recovery needed the
// owner. macOS writes `.DS_Store` routinely and this repository's own
// .gitignore lists it.
//
// Three outcomes are therefore distinguished here:
//   - a non-event entry is IGNORED and reported as a non-fatal note;
//   - an event record that cannot be parsed or does not satisfy the record
//     contract is reported as a lifecycle issue, never as a thrown error;
//   - a symlinked or non-regular entry that matches the event naming pattern
//     is never read through, and is reported as a lifecycle issue.
function readMaintenanceRunEvents(identity, capabilities) {
  const { stateRoot, runId } = validateRunIdentity(identity, capabilities);
  const runsDirectory = inspectExistingDirectory(
    stateRoot,
    path.join(stateRoot, 'runs'),
    'runs directory',
    capabilities,
  );
  if (runsDirectory === null) return { events: [], issues: [], notes: [] };

  const runDirectory = inspectExistingDirectory(
    runsDirectory,
    path.join(runsDirectory, runId),
    'run directory',
    capabilities,
  );
  if (runDirectory === null) return { events: [], issues: [], notes: [] };

  const eventsDirectory = inspectExistingDirectory(
    runDirectory,
    path.join(runDirectory, 'events'),
    'run events directory',
    capabilities,
  );
  if (eventsDirectory === null) return { events: [], issues: [], notes: [] };

  const names = fs.readdirSync(eventsDirectory).sort();
  const events = [];
  const issues = [];
  const notes = [];
  for (const name of names) {
    const match = EVENT_FILE_PATTERN.exec(name);
    if (!match) {
      notes.push({
        kind: 'stray-entry',
        name,
        message: `Ignored non-event entry "${name}" in the maintenance run events directory`,
      });
      continue;
    }
    const eventPath = path.join(eventsDirectory, name);
    const stat = fs.lstatSync(eventPath);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      issues.push({
        area: 'events',
        eventId: match[1],
        message: `Run event "${name}" must be a non-symlink regular file`,
      });
      continue;
    }
    assertRecordPermissions(stat, capabilities, 'Run event');

    let record;
    try {
      record = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    } catch {
      issues.push({
        area: 'events',
        eventId: match[1],
        message: `Run event "${name}" is malformed and could not be parsed`,
      });
      continue;
    }
    const hasValidActor = record && ((record.sessionId === null && record.agent === null) || (
      typeof record.sessionId === 'string' && ID_PATTERN.test(record.sessionId) &&
      typeof record.agent === 'string' && !!record.agent.trim() && !/[\0-\x1f\x7f]/.test(record.agent)
    ));
    let hasValidTimestamp = false;
    if (record && typeof record.at === 'string') {
      const milliseconds = Date.parse(record.at);
      hasValidTimestamp = !Number.isNaN(milliseconds) && new Date(milliseconds).toISOString() === record.at;
    }
    if (!record || typeof record !== 'object' || Array.isArray(record) ||
        record.eventId !== match[1] || record.runId !== runId || !RUN_EVENT_TYPES.has(record.type) ||
        !hasValidActor || !hasValidTimestamp ||
        !record.details || typeof record.details !== 'object' || Array.isArray(record.details)) {
      issues.push({
        area: 'events',
        eventId: match[1],
        message: `Run event "${name}" is a malformed maintenance run event record`,
      });
      continue;
    }
    // Scrub on read as well as on write: a record written before this control
    // existed would otherwise be echoed verbatim by `status`.
    events.push({ ...record, details: scrubEventDetails(record.details) });
  }

  return {
    events: events.sort((left, right) => left.at.localeCompare(right.at) || left.eventId.localeCompare(right.eventId)),
    issues,
    notes,
  };
}

function isNonEmptyText(value) {
  return typeof value === 'string' && value.trim().length > 0 && !/[\0-\x1f\x7f]/.test(value);
}

// Plan revisions are canonical positive integers in the maintenance plan
// contract. A numeric revision is accepted and normalized to its canonical
// string form so a revision identity never depends on how the value was typed.
function planRevisionLabel(value) {
  if (typeof value === 'string') return isNonEmptyText(value) ? value : null;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value);
  return null;
}

function hasPlanIdentity(details) {
  return details && typeof details.planId === 'string' && ID_PATTERN.test(details.planId) &&
    planRevisionLabel(details.planRevision) !== null && isNonEmptyText(details.planHash);
}

function planIdentity(details) {
  if (!details || typeof details.planId !== 'string') return null;
  const planRevision = planRevisionLabel(details.planRevision);
  if (planRevision === null || !isNonEmptyText(details.planHash)) return null;
  return { planId: details.planId, planRevision, planHash: details.planHash };
}

function samePlanIdentity(left, right) {
  const leftIdentity = planIdentity(left);
  const rightIdentity = planIdentity(right);
  if (!leftIdentity || !rightIdentity) return false;
  return leftIdentity.planId === rightIdentity.planId &&
    leftIdentity.planRevision === rightIdentity.planRevision &&
    leftIdentity.planHash === rightIdentity.planHash;
}

// Identifies a plan revision: the plan ID plus its revision, without the
// digest, so one plan ID can carry a chain of revisions.
function planRevisionKey(details) {
  const identity = planIdentity(details);
  return identity ? JSON.stringify([identity.planId, identity.planRevision]) : null;
}

function canonicalRevisionNumber(revision) {
  if (!/^[0-9]+$/.test(revision)) return null;
  const value = Number(revision);
  return Number.isSafeInteger(value) ? value : null;
}

// Revisions order numerically when both are canonical integers and
// lexicographically otherwise, so the chain head is the highest revision.
function comparePlanRevisions(left, right) {
  const leftNumber = canonicalRevisionNumber(left);
  const rightNumber = canonicalRevisionNumber(right);
  if (leftNumber !== null && rightNumber !== null && leftNumber !== rightNumber) {
    return leftNumber < rightNumber ? -1 : 1;
  }
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function isRecordedBefore(prerequisite, event) {
  // Event references provide the causal link; strict timestamps reject inversions
  // and equal-time records whose order cannot be established.
  return Date.parse(prerequisite.at) < Date.parse(event.at);
}

function reduceMaintenanceRunStatus(events, readIssues = []) {
  const eventsById = new Map(events.map((event) => [event.eventId, event]));
  const issues = [...readIssues];
  let planInvalid = false;
  let executionInvalid = false;
  let verificationBlocked = false;
  const invalidOwnerDecisions = new Set();

  const addIssue = (area, event, message, decisionId) => {
    issues.push({ area, eventId: event ? event.eventId : null, message });
    if (area === 'plan') planInvalid = true;
    if (area === 'execution') executionInvalid = true;
    if (area === 'owner-decision' && decisionId) invalidOwnerDecisions.add(decisionId);
  };

  const planDrafts = events.filter((event) => event.type === 'plan_drafted');
  const validPlanDraftIds = new Set();
  const validPlanDrafts = [];
  for (const event of planDrafts) {
    if (!hasPlanIdentity(event.details)) {
      addIssue('plan', event, 'plan_drafted must identify planId, planRevision, and planHash');
      continue;
    }
    validPlanDraftIds.add(event.eventId);
    validPlanDrafts.push(event);
  }

  const draftedPlanIds = new Set(validPlanDrafts.map((event) => event.details.planId));
  if (draftedPlanIds.size > 1) {
    addIssue('plan', null, 'The run contains drafts for more than one plan ID');
  }

  // A plan edit creates a new revision and digest for the same plan ID, so
  // several plan_drafted events for one plan ID form a revision chain rather
  // than a conflict. The chain head, the highest revision, is the current
  // revision; every earlier revision is superseded and its records are stale.
  const revisionEntries = new Map();
  for (const event of validPlanDrafts) {
    const key = planRevisionKey(event.details);
    let entry = revisionEntries.get(key);
    if (!entry) {
      entry = {
        planId: event.details.planId,
        planRevision: planRevisionLabel(event.details.planRevision),
        planHash: event.details.planHash,
        planHashes: new Set(),
        draftEventIds: [],
        approvalEventIds: [],
      };
      revisionEntries.set(key, entry);
    }
    entry.draftEventIds.push(event.eventId);
    entry.planHashes.add(event.details.planHash);
  }

  for (const entry of revisionEntries.values()) {
    if (entry.planHashes.size > 1) {
      addIssue(
        'plan',
        null,
        'The run contains two plan drafts for the same plan ID and revision with different plan hashes',
      );
    }
  }

  const revisionChain = [...revisionEntries.values()].sort((left, right) => {
    if (left.planId !== right.planId) return left.planId < right.planId ? -1 : 1;
    return comparePlanRevisions(left.planRevision, right.planRevision);
  });

  function validatePlanIdentity(event, area) {
    if (hasPlanIdentity(event.details)) return true;
    addIssue(area, event, `${event.type} must identify planId, planRevision, and planHash`);
    return false;
  }

  function resolvePriorReference(event, field, expectedType, validIds, area) {
    const referenceId = event.details[field];
    if (!isNonEmptyText(referenceId) || !ID_PATTERN.test(referenceId)) {
      addIssue(area, event, `${event.type} must reference ${field}`);
      return null;
    }

    const referenced = eventsById.get(referenceId);
    if (!referenced || referenced.type !== expectedType || !validIds.has(referenceId)) {
      addIssue(area, event, `${event.type} does not reference a valid ${expectedType} event`);
      return null;
    }
    if (!samePlanIdentity(event.details, referenced.details)) {
      addIssue(area, event, `${event.type} references an event with a different plan ID, revision, or hash`);
      return null;
    }
    if (!isRecordedBefore(referenced, event)) {
      addIssue(area, event, `${event.type} references an event not recorded strictly before it`);
      return null;
    }
    return referenced;
  }

  const planApprovals = events.filter((event) => event.type === 'plan_approved');
  const validPlanApprovalIds = new Set();
  for (const event of planApprovals) {
    let valid = validatePlanIdentity(event, 'plan');
    if (!isNonEmptyText(event.details.evidenceRef)) {
      addIssue('plan', event, 'plan_approved must include an explicit evidenceRef');
      valid = false;
    }
    if (valid && !resolvePriorReference(event, 'draftEventId', 'plan_drafted', validPlanDraftIds, 'plan')) {
      valid = false;
    }
    if (valid) {
      validPlanApprovalIds.add(event.eventId);
      // An approval authorizes only the draft it references, so an approval of
      // an older revision never carries over to a newer revision.
      const referencedDraft = eventsById.get(event.details.draftEventId);
      const entry = referencedDraft ? revisionEntries.get(planRevisionKey(referencedDraft.details)) : null;
      if (entry) entry.approvalEventIds.push(event.eventId);
    }
  }

  const executionStarts = events.filter((event) => event.type === 'execution_started');
  const validExecutionStartIds = new Set();
  const validExecutionStarts = [];
  for (const event of executionStarts) {
    let valid = validatePlanIdentity(event, 'execution');
    if (valid && !resolvePriorReference(
      event,
      'approvalEventId',
      'plan_approved',
      validPlanApprovalIds,
      'execution',
    )) {
      valid = false;
    }
    if (valid) {
      validExecutionStartIds.add(event.eventId);
      validExecutionStarts.push(event);
    }
  }
  if (validExecutionStarts.length > 1) {
    addIssue('execution', null, 'The run contains multiple execution starts for one plan revision');
  }

  const verifications = events.filter((event) => event.type === 'verification');
  const validVerificationIds = new Set();
  const verificationResultsByCheck = new Map();
  for (const event of verifications) {
    let valid = validatePlanIdentity(event, 'execution');
    if (!isNonEmptyText(event.details.check)) {
      addIssue('execution', event, 'verification must identify the check being recorded');
      valid = false;
    }
    if (!['passed', 'failed'].includes(event.details.result)) {
      addIssue('execution', event, 'verification result must be passed or failed');
      valid = false;
    }
    if (!isNonEmptyText(event.details.evidenceRef)) {
      addIssue('execution', event, 'verification must include an explicit evidenceRef');
      valid = false;
    }
    const start = valid
      ? resolvePriorReference(event, 'startEventId', 'execution_started', validExecutionStartIds, 'execution')
      : null;
    if (valid && !start) valid = false;
    if (!valid) continue;

    const checkKey = JSON.stringify([start.eventId, event.details.check]);
    const previousResult = verificationResultsByCheck.get(checkKey);
    if (previousResult !== undefined && previousResult !== event.details.result) {
      addIssue('execution', event, 'The same verification check has contradictory results');
      continue;
    }
    verificationResultsByCheck.set(checkKey, event.details.result);
    if (event.details.result === 'failed') verificationBlocked = true;
    validVerificationIds.add(event.eventId);
  }

  const executionCompletions = events.filter((event) => event.type === 'execution_completed');
  const validExecutionCompletions = [];
  for (const event of executionCompletions) {
    let valid = validatePlanIdentity(event, 'execution');
    const start = valid
      ? resolvePriorReference(event, 'startEventId', 'execution_started', validExecutionStartIds, 'execution')
      : null;
    if (valid && !start) valid = false;
    const verification = valid
      ? resolvePriorReference(event, 'verificationEventId', 'verification', validVerificationIds, 'execution')
      : null;
    if (valid && !verification) valid = false;
    if (verification && verification.details.result !== 'passed') {
      addIssue('execution', event, 'execution_completed must reference a passing verification');
      valid = false;
    }
    if (start && verification && verification.details.startEventId !== start.eventId) {
      addIssue('execution', event, 'execution_completed references verification for a different start');
      valid = false;
    }
    if (valid) {
      validExecutionCompletions.push(event);
    }
  }
  if (validExecutionCompletions.length > 1) {
    addIssue('execution', null, 'The run contains multiple execution completion events');
  }
  if (verificationBlocked && validExecutionCompletions.length > 0) {
    addIssue('execution', validExecutionCompletions[0], 'A completion claim conflicts with a recorded failed verification');
  }

  const recordedOwnerDecisions = new Map();
  const ownerDecisionEvents = events.filter((event) => event.type === 'owner_decision_disposition');
  for (const event of ownerDecisionEvents) {
    // actorType is an explicit claim; event.agent is never treated as a human identity.
    const { actorType, decisionId, disposition, evidenceRef } = event.details;
    if (!OWNER_DECISION_IDS.includes(decisionId)) {
      addIssue('owner-decision', event, 'owner_decision_disposition must identify a known owner decision');
      continue;
    }
    if (actorType !== 'human' || !isNonEmptyText(disposition) || !isNonEmptyText(evidenceRef)) {
      addIssue(
        'owner-decision',
        event,
        'owner_decision_disposition requires actorType human, disposition, and evidenceRef',
        decisionId,
      );
      continue;
    }
    if (recordedOwnerDecisions.has(decisionId)) {
      addIssue('owner-decision', event, 'The owner decision has contradictory or duplicate dispositions', decisionId);
      continue;
    }
    recordedOwnerDecisions.set(decisionId, event);
  }

  const hasExecutionEvents = executionStarts.length > 0 || verifications.length > 0 ||
    executionCompletions.length > 0;

  // The current revision is the highest revision in the chain; only an
  // approval of that revision authorizes it. Approvals of earlier revisions
  // stay recorded as claims but are superseded by the newer revision.
  const currentIndex = draftedPlanIds.size === 1 && revisionChain.length > 0
    ? revisionChain.length - 1
    : -1;
  let approvedIndex = -1;
  if (draftedPlanIds.size === 1) {
    for (let index = revisionChain.length - 1; index >= 0; index -= 1) {
      if (revisionChain[index].approvalEventIds.length > 0) {
        approvedIndex = index;
        break;
      }
    }
  }

  const planRevisions = revisionChain.map((entry, index) => {
    const approvalRecorded = entry.approvalEventIds.length > 0;
    const superseded = currentIndex >= 0 && index !== currentIndex;
    return {
      planId: entry.planId,
      planRevision: entry.planRevision,
      planHash: entry.planHash,
      planHashes: [...entry.planHashes].sort(),
      draftEventIds: entry.draftEventIds,
      approvalEventIds: entry.approvalEventIds,
      approvalRecorded,
      superseded,
      status: entry.planHashes.size > 1 ? 'conflicted'
        : superseded ? 'superseded'
          : approvalRecorded ? 'approved' : 'drafted',
    };
  });

  const currentPlanRevision = currentIndex >= 0 ? {
    planId: planRevisions[currentIndex].planId,
    planRevision: planRevisions[currentIndex].planRevision,
    planHash: planRevisions[currentIndex].planHash,
    approvalRecorded: planRevisions[currentIndex].approvalRecorded,
    status: planRevisions[currentIndex].status,
  } : null;

  const approvedPlanRevision = approvedIndex >= 0 ? {
    planId: planRevisions[approvedIndex].planId,
    planRevision: planRevisions[approvedIndex].planRevision,
    planHash: planRevisions[approvedIndex].planHash,
    approvalRecorded: true,
    superseded: planRevisions[approvedIndex].superseded,
    status: planRevisions[approvedIndex].status,
  } : null;

  const supersededPlanRevisions = planRevisions
    .filter((revision) => revision.superseded)
    .map((revision) => revision.planRevision);

  const currentRevisionApproved = Boolean(currentPlanRevision && currentPlanRevision.approvalRecorded);
  const planStatus = planInvalid
    ? 'invalid'
    : currentRevisionApproved ? 'approval-recorded'
      : validPlanDrafts.length > 0 ? 'drafted' : 'not_drafted';
  const executionStatus = executionInvalid || (planInvalid && hasExecutionEvents)
    ? 'invalid'
    : verificationBlocked ? 'blocked'
      : validExecutionCompletions.length > 0 ? 'completion-recorded'
        : validExecutionStarts.length > 0 ? 'started' : 'not_started';
  const status = issues.length > 0 ? 'invalid'
    : verificationBlocked ? 'blocked'
      : validExecutionCompletions.length > 0 ? 'completion-recorded'
        : validExecutionStarts.length > 0 ? 'running'
          : currentRevisionApproved ? 'approval-recorded' : 'not_started';

  const ownerDecisions = OWNER_DECISION_IDS.map((decisionId) => {
    const event = invalidOwnerDecisions.has(decisionId) ? null : recordedOwnerDecisions.get(decisionId);
    if (!event) return { decisionId, status: 'open' };
    return {
      decisionId,
      status: event.details.disposition === 'open' ? 'open' : 'disposition-claim-recorded',
      disposition: event.details.disposition,
      evidenceRef: event.details.evidenceRef,
      actorTypeClaim: event.details.actorType,
      eventId: event.eventId,
      claimStatus: 'not-independently-verified',
    };
  });

  // Evidence references are recorded, not authenticated by this state store.
  const planApprovalEvidence = planApprovals.map(({ eventId, at, details }) => ({
    eventId,
    at,
    evidenceRef: isNonEmptyText(details.evidenceRef) ? details.evidenceRef : null,
    claimStatus: 'recorded-claim',
    validation: 'not-cryptographically-verified',
  }));
  const completionEvidence = executionCompletions.map(({ eventId, at, details }) => ({
    eventId,
    at,
    startEventId: isNonEmptyText(details.startEventId) ? details.startEventId : null,
    verificationEventId: isNonEmptyText(details.verificationEventId) ? details.verificationEventId : null,
    claimStatus: 'completion-recorded',
    validation: 'not-externally-validated',
  }));

  return {
    status,
    planStatus,
    executionStatus,
    lifecycleIssues: issues,
    planApprovalEvidence,
    completionEvidence,
    ownerDecisions,
    planRevisions,
    currentPlanRevision,
    approvedPlanRevision,
    supersededPlanRevisions,
  };
}

function readMaintenanceRunStatus(identity, capabilities = detectCapabilities()) {
  const { runId } = validateRunIdentity(identity, capabilities);
  const { events, issues, notes } = readMaintenanceRunEvents(identity, capabilities);
  const summarize = (type) => events
    .filter((event) => event.type === type)
    .map(({ eventId, at, sessionId, agent, details }) => ({ eventId, at, sessionId, agent, details }));

  return {
    runId,
    ...reduceMaintenanceRunStatus(events, issues),
    eventCount: events.length,
    taskDispositions: summarize('task_disposition'),
    verifications: summarize('verification'),
    panelSeatDispositions: summarize('panel_seat_disposition'),
    // Non-fatal notes: entries that were ignored rather than treated as a
    // lifecycle problem. A stray file never invalidates a run.
    notes,
    // Machine-readable platform posture: which protections were actually
    // active on the platform that produced this record.
    capabilities: describeCapabilities(capabilities),
  };
}

// Prunes entries in the run events directory that are not run event files.
//
// The repair is deliberately narrow. It removes stray files — `.DS_Store`,
// editor swap files, partial downloads — and nothing else. An event record
// that is malformed is evidence, not litter: deleting it would erase the
// proof that something went wrong, so malformed records stay on disk and
// surface as lifecycle issues until an owner decides otherwise.
function repairMaintenanceRunEvents(identity, capabilities = detectCapabilities()) {
  const { stateRoot, runId } = validateRunIdentity(identity, capabilities);
  const result = { runId, removed: [], skipped: [] };

  const runsDirectory = inspectExistingDirectory(
    stateRoot,
    path.join(stateRoot, 'runs'),
    'runs directory',
    capabilities,
  );
  if (runsDirectory === null) return result;

  const runDirectory = inspectExistingDirectory(
    runsDirectory,
    path.join(runsDirectory, runId),
    'run directory',
    capabilities,
  );
  if (runDirectory === null) return result;

  const eventsDirectory = inspectExistingDirectory(
    runDirectory,
    path.join(runDirectory, 'events'),
    'run events directory',
    capabilities,
  );
  if (eventsDirectory === null) return result;

  for (const name of fs.readdirSync(eventsDirectory).sort()) {
    if (EVENT_FILE_PATTERN.test(name)) continue;
    const entryPath = path.join(eventsDirectory, name);
    let stat;
    try {
      stat = fs.lstatSync(entryPath);
    } catch (error) {
      result.skipped.push({ name, reason: `Cannot inspect entry: ${error.message}` });
      continue;
    }
    if (stat.isDirectory()) {
      result.skipped.push({ name, reason: 'Directory entry is not removed by repair' });
      continue;
    }
    try {
      fs.unlinkSync(entryPath);
    } catch (error) {
      result.skipped.push({ name, reason: `Cannot remove entry: ${error.message}` });
      continue;
    }
    result.removed.push(name);
  }

  return result;
}

function parseMaintenanceStateCliArgs(argv) {
  if (!Array.isArray(argv) || argv.length === 0) {
    throw new Error('A command is required: event, status, or artifact-root');
  }

  const [command, ...tokens] = argv;
  if (!CLI_COMMANDS.has(command)) {
    throw new Error(`Unknown command: ${command}`);
  }

  const allowedFlags = new Set(command === 'event' ? EVENT_CLI_FLAGS : BASE_CLI_FLAGS);
  if (command === 'status') allowedFlags.add('--repair');
  const args = Object.create(null);
  for (let index = 0; index < tokens.length; index += 1) {
    const flag = tokens[index];
    if (!allowedFlags.has(flag)) throw new Error(`Unknown argument: ${flag}`);
    if (Object.hasOwn(args, flag)) throw new Error(`Duplicate argument: ${flag}`);

    // `--repair` is a switch: it takes no value.
    if (flag === '--repair') {
      args[flag] = true;
      continue;
    }

    const value = tokens[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for ${flag}`);
    }
    args[flag] = value;
    index += 1;
  }

  const requiredFlags = command === 'event'
    ? [...BASE_CLI_FLAGS, '--type', '--details-json']
    : BASE_CLI_FLAGS;
  for (const flag of requiredFlags) {
    if (!Object.hasOwn(args, flag)) throw new Error(`Missing required argument: ${flag}`);
  }

  if (args['--scope'] !== 'maintenance') {
    throw new Error('Unsupported scope; expected maintenance');
  }
  if (!ID_PATTERN.test(args['--run-id'])) {
    throw new Error('--run-id must be 1-128 letters, numbers, underscores, or hyphens, starting with a letter or number');
  }

  let details;
  if (command === 'event') {
    if (!RUN_EVENT_TYPES.has(args['--type'])) {
      throw new Error(`Unsupported maintenance run event type: ${args['--type']}`);
    }
    if (Object.hasOwn(args, '--agent') !== Object.hasOwn(args, '--session-id')) {
      throw new Error('--agent and --session-id must be supplied together');
    }
    try {
      details = JSON.parse(args['--details-json']);
    } catch {
      throw new Error('--details-json must contain valid JSON');
    }
    if (!details || typeof details !== 'object' || Array.isArray(details) ||
        ![Object.prototype, null].includes(Object.getPrototypeOf(details))) {
      throw new Error('--details-json must contain a JSON object');
    }
  }

  return { command, args, details };
}

function runMaintenanceStateCommand(argv) {
  const { command, args, details } = parseMaintenanceStateCliArgs(argv);
  const identity = {
    scope: args['--scope'],
    repoRoot: args['--repo-root'],
    stateRoot: args['--state-root'],
    runId: args['--run-id'],
  };
  if (Object.hasOwn(args, '--agent')) {
    identity.agent = args['--agent'];
    identity.sessionId = args['--session-id'];
  }

  if (command === 'event') {
    return appendMaintenanceRunEvent(identity, { type: args['--type'], details });
  }
  if (command === 'status') {
    const repair = args['--repair'] === true
      ? repairMaintenanceRunEvents(identity)
      : { runId: identity.runId, removed: [], skipped: [] };
    const status = readMaintenanceRunStatus(identity);
    return { ...status, repair: { requested: args['--repair'] === true, ...repair } };
  }

  const artifactRoot = getMaintenanceArtifactRoot(identity);
  return assertMaintenanceArtifactPath(identity, artifactRoot);
}

if (require.main === module) {
  try {
    const result = runMaintenanceStateCommand(process.argv.slice(2));
    process.stdout.write(`${typeof result === 'string' ? result : JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    console.error(`maintenance_state: ${error.message}`);
    process.exitCode = 2;
  }
}

module.exports = {
  SECRET_PATTERNS,
  INJECTION_PATTERNS,
  appendMaintenanceRunEvent,
  assertMaintenanceArtifactPath,
  getMaintenanceArtifactRoot,
  readMaintenanceRunStatus,
  repairMaintenanceRunEvents,
  startMaintenanceSession,
};
