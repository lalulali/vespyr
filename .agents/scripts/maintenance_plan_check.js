#!/usr/bin/env node
'use strict';

/**
 * maintenance_plan_check.js — read-only checker for maintenance plan records.
 *
 * Scoped commands (run from the repository root; every path argument is absolute):
 *
 *   node .agents/scripts/maintenance_plan_check.js check \
 *     --scope maintenance \
 *     --repo-root <absolute-repository-root> \
 *     --state-root <absolute-external-state-root> \
 *     --run-id <maintenance-run-id> \
 *     --plan <absolute-plan-path> \
 *     --json
 *
 *   node .agents/scripts/maintenance_plan_check.js manifest \
 *     --scope maintenance \
 *     --repo-root <absolute-repository-root> \
 *     --state-root <absolute-external-state-root> \
 *     --run-id <maintenance-run-id> \
 *     --plan <absolute-plan-path> \
 *     --json
 *
 * `check` validates one draft maintenance plan. It never authorizes execution:
 * `executionAuthorized` is always false and no gate-green verdict is emitted.
 * `check` also binds the plan to the repository's real HEAD: the plan's
 * `baseRevision` must equal the current HEAD, and the plan's recorded
 * `workingTreeIdentity.HEAD` must match it.
 *
 * `manifest` computes the read-only dirty-manifest fingerprint for the plan's
 * relevant paths so the plan can carry a machine-readable `dirtyManifest`.
 *
 * Both commands are read-only. They never write to the repository, the plan,
 * the external state root, or product runtime state, and they never hash the
 * whole checkout: every Git query is either a single revision lookup
 * (`git rev-parse HEAD`) or limited to the plan's relevant paths.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const maintenanceState = require('./maintenance_state.js');

const REQUIRED_DECISIONS = ['B1', 'O-4', 'B10', 'credential-residual'];
const AUTHORIZATION_RECORD = 'Repository-owner execution authorization';
const OPTIONAL_TABLE_COLUMNS = new Set(['options', 'requirements']);
const MANIFEST_SCHEMA = 'dirty-manifest-v1';
const MANIFEST_STATUSES = new Set(['staged', 'modified', 'deleted', 'untracked']);
const MANIFEST_KIND = 'file';
const MANIFEST_MODES = new Set(['100644', '100755']);
const MANIFEST_FIELDS = ['contentSha256', 'kind', 'mode', 'path', 'status'];
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const FORBIDDEN_EXACT_PATHS = new Set([
  'artifacts/output/pipeline-state.json',
  'artifacts/output/sprint-status.yaml',
]);
const FORBIDDEN_PATH_PREFIXES = ['artifacts/memory/', '.agents/state/'];
const PATH_TOKEN = /[A-Za-z0-9_.][A-Za-z0-9_.\/-]*\.[A-Za-z][A-Za-z0-9]{0,9}/g;
// A directory segment may start with a dot, so a dot-tree citation such as
// ".agents/scripts/" is read with its leading dot intact.
//
// WHY THIS SHAPE CANNOT REINTRODUCE THE DUPLICATE: both token patterns now
// share one leading character class and one segment character set, and both
// are greedy over the same text. For any path-like string they therefore
// start at the same offset and stop at the same offset, so the two passes
// produce the same string instead of a second, dot-stripped one. The
// duplicate is also blocked structurally in extractPathTokens: a match is
// dropped when another match starts earlier and ends on the same character,
// which is exactly the shape of a match whose leading characters were
// dropped.
const DIRECTORY_TOKEN = /[A-Za-z0-9_.][A-Za-z0-9_.\-]*(?:\/[A-Za-z0-9_.][A-Za-z0-9_.\-]*)+/g;
// A cited file path ends in a dot-extension whose name starts with a letter.
// The extension must be at least two characters so prose abbreviations such
// as "e.g" or "i.e" are never mistaken for a file citation.
const PATH_CITATION_SUFFIX = /\.([A-Za-z][A-Za-z0-9]{1,9})$/;
// A token whose surrounding path run contains one of these characters belongs
// to a placeholder such as "<runId>" and is not a citation of a real file.
const PLACEHOLDER_PREFIXES = '<>{}';
const PLAN_DIGEST_FIELD = /^([ \t]*\|[ \t]*`?planDigest`?[ \t]*\|[ \t]*)([^|\r\n]*?)([ \t]*\|[^\r\n]*)$/m;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
// A recorded claim is labelled with "record"; a negated form such as
// "not recorded" records no claim at all.
const RECORDED_CLAIM_LABEL = /record/i;
const NEGATED_RECORD_LABEL = /\b(?:not|no|never|un)\s*[- ]?\s*record/i;
// An approval row may never claim authentication. Negated forms such as
// "not-cryptographically-verified" are recorded-claim labels, so they are
// removed before the assertive forms are looked for.
const NEGATED_AUTHENTICATION_LABEL =
  /\b(?:not|never|un)\s*[- ]?\s*(?:(?:independently|cryptographically)[- ]+)?(?:authenticated|verified|approved)\b/gi;
const AUTHENTICATION_LABEL = /authenticat|cryptograph|identity[- ]verif/i;
const TASK_ID = /^T[A-Za-z0-9_-]{1,127}$/;
const FINDING_STATUSES = new Set(['OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'DEFERRED', 'FALSIFIED']);
const TASK_STATUSES = new Set(['PLANNED', 'BLOCKED', 'READY', 'EXECUTABLE', 'IN_PROGRESS', 'DONE', 'DEFERRED']);
// Only an explicit authorizing status counts as an authorization. Every other
// value — PENDING, REJECTED, "PENDING - awaiting owner", or free text — is a
// claim that does not authorize anything.
const AUTHORIZATION_STATUSES = new Set(['AUTHORIZED', 'APPROVED']);
const DIGEST_TOKEN = /sha256:[a-f0-9]{64}/;
const DIGEST_TOKEN_GLOBAL = /sha256:[a-f0-9]{64}/g;
// A task reference inside free text. "B1" never matches "B10" because the
// pattern stops at the first character that cannot continue the identifier.
const TASK_REFERENCE = /(?<![A-Za-z0-9_-])T[A-Za-z0-9_-]{1,127}(?![A-Za-z0-9_-])/g;

function addIssue(issues, code, message) {
  issues.push({ code, message });
}

function parseArguments(argv) {
  const command = argv[0];
  if (command !== 'check' && command !== 'manifest') {
    throw new Error('Command must be: check or manifest');
  }

  const values = new Map();
  const allowed = new Set(['--scope', '--repo-root', '--state-root', '--run-id', '--plan']);
  let json = false;
  for (let index = 1; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--json') {
      if (json) throw new Error('Duplicate argument: --json');
      json = true;
      continue;
    }
    if (!allowed.has(flag)) throw new Error(`Unknown argument: ${flag}`);
    if (values.has(flag)) throw new Error(`Duplicate argument: ${flag}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    values.set(flag, value);
    index += 1;
  }

  for (const flag of allowed) {
    if (!values.has(flag)) throw new Error(`Missing required argument: ${flag}`);
  }
  if (!json) throw new Error('Missing required argument: --json');
  if (values.get('--scope') !== 'maintenance') throw new Error('Unsupported scope; expected maintenance');
  if (!SAFE_ID.test(values.get('--run-id'))) {
    throw new Error('--run-id must be 1-128 letters, numbers, underscores, or hyphens, starting with a letter or number');
  }

  return {
    command,
    scope: values.get('--scope'),
    repoRoot: values.get('--repo-root'),
    stateRoot: values.get('--state-root'),
    runId: values.get('--run-id'),
    planPath: values.get('--plan'),
  };
}

function normalizeHeader(value) {
  return value.replace(/`/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function cleanCell(value) {
  return value.trim().replace(/^`(.*)`$/s, '$1').trim();
}

// A status cell is compared case-insensitively and without surrounding
// brackets, so "AUTHORIZED", "[authorized]", and "`AUTHORIZED`" are the same
// recorded status.
function normalizeAuthorizationStatus(value) {
  return cleanCell(value).replace(/^\[/, '').replace(/\]$/, '').trim().toUpperCase();
}

function splitTableRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
  return trimmed.slice(1, -1).split('|').map((cell) => cleanCell(cell));
}

function isSeparatorRow(row) {
  return row.length > 0 && row.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, '')));
}

function parseTables(lines) {
  const tables = [];
  for (let index = 0; index < lines.length;) {
    if (!lines[index].trim().startsWith('|')) {
      index += 1;
      continue;
    }
    const start = index;
    while (index < lines.length && lines[index].trim().startsWith('|')) index += 1;
    if (index - start < 2) continue;

    const rows = lines.slice(start, index).map(splitTableRow);
    if (rows.some((row) => row === null) || !isSeparatorRow(rows[1]) ||
        rows.some((row) => row.length !== rows[0].length)) {
      tables.push({ malformed: true, headers: [], rows: [] });
      continue;
    }
    tables.push({
      malformed: false,
      headers: rows[0].map(normalizeHeader),
      rows: rows.slice(2),
    });
  }
  return tables;
}

function sectionLines(lines, headings) {
  const wanted = new Set(headings.map((heading) => heading.toLowerCase()));
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(lines[index]);
    if (!match || match[1].length !== 2) continue;
    const title = match[2].replace(/^\d+\.\s*/, '').toLowerCase();
    if (!wanted.has(title)) continue;
    let end = index + 1;
    while (end < lines.length) {
      const nextHeading = /^(#{1,6})\s+/.exec(lines[end]);
      if (nextHeading && nextHeading[1].length <= 2) break;
      end += 1;
    }
    return lines.slice(index + 1, end);
  }
  return null;
}

function findTable(lines, heading, headingAliases, columnAliases, issues) {
  const section = sectionLines(lines, headingAliases);
  if (!section) {
    addIssue(issues, 'MISSING_SECTION', `Missing required section: ${heading}`);
    return null;
  }

  const tables = parseTables(section).filter((table) => !table.malformed);
  const matches = tables.filter((table) => Object.entries(columnAliases).every(([name, aliases]) =>
    OPTIONAL_TABLE_COLUMNS.has(name) || aliases.some((alias) => table.headers.includes(normalizeHeader(alias))),
  ));
  if (matches.length !== 1) {
    addIssue(issues, 'INVALID_TABLE', `${heading} must contain exactly one table with its required columns`);
    return null;
  }

  const table = matches[0];
  const columns = Object.create(null);
  for (const [name, aliases] of Object.entries(columnAliases)) {
    const indexes = table.headers
      .map((header, index) => aliases.map(normalizeHeader).includes(header) ? index : -1)
      .filter((index) => index >= 0);
    if (OPTIONAL_TABLE_COLUMNS.has(name) && indexes.length === 0) {
      columns[name] = -1;
      continue;
    }
    if (indexes.length !== 1) {
      addIssue(issues, 'INVALID_TABLE', `${heading} has a missing or duplicate ${name} column`);
      return null;
    }
    columns[name] = indexes[0];
  }
  return { rows: table.rows, columns };
}

function valueAt(row, columns, name) {
  const index = columns[name];
  return index === undefined || index < 0 || row[index] === undefined ? '' : cleanCell(row[index]);
}

function isMissingText(value) {
  const text = value.trim();
  return !text || /^(?:\{.*\}|<.*>|TBD|TODO|N\/A|NONE|—|-)$/i.test(text);
}

function isMissingLink(value) {
  return isMissingText(value) || /^(?:OPEN|UNVERIFIED|NOT AVAILABLE)$/i.test(value.trim());
}

// The dirtyManifest field holds one JSON object, so a value that starts with
// "{" is a real manifest and never a placeholder.
function isMissingIdentityValue(value) {
  const text = value.trim();
  if (!text) return true;
  return /^(?:<.*>|TBD|TODO|N\/A|NONE|—|-)$/i.test(text);
}

function bracketedStatus(value, allowed) {
  const match = /^\[([A-Za-z][A-Za-z0-9_-]*)\]$/.exec(value.trim());
  return match && allowed.has(match[1].toUpperCase()) ? match[1].toUpperCase() : '';
}

function validatePlainSentence(lines, fields, issues) {
  let sentence = fields.plainSentence || '';
  if (!sentence) {
    const titleIndex = lines.findIndex((line) => /^#\s+/.test(line));
    for (let index = titleIndex + 1; index < lines.length; index += 1) {
      const line = lines[index].trim();
      if (!line) continue;
      if (line.startsWith('#')) break;
      if (/^\*\*[^*]+:\*\*/.test(line)) continue;
      sentence = line;
      break;
    }
  }
  if (isMissingText(sentence)) addIssue(issues, 'MISSING_IDENTITY', 'The plan needs one plain-sentence summary');
}

function parseIdentity(lines, issues) {
  const table = findTable(lines, 'Record identity', ['Record identity'], {
    field: ['Field'],
    value: ['Value'],
  }, issues);
  if (!table) return Object.create(null);

  const fields = Object.create(null);
  for (const row of table.rows) {
    const key = cleanCell(row[table.columns.field] || '').replace(/`/g, '');
    const normalizedKey = key.toLowerCase();
    if (!key) continue;
    if (Object.hasOwn(fields, normalizedKey)) {
      addIssue(issues, 'DUPLICATE_IDENTITY_FIELD', `Duplicate record identity field: ${key}`);
      continue;
    }
    fields[normalizedKey] = cleanCell(row[table.columns.value] || '');
  }

  const required = [
    'runId', 'planId', 'planRevision', 'planDigest', 'baseRevision', 'workingTreeIdentity',
    'dirtyManifest', 'externalStateRoot', 'repoArtifactRoot', 'createdAt', 'author', 'recordStatus',
  ];
  for (const name of required) {
    const value = fields[name.toLowerCase()] || '';
    const missing = name === 'dirtyManifest' ? isMissingIdentityValue(value) : isMissingText(value);
    if (missing) {
      addIssue(issues, 'MISSING_IDENTITY', `Missing record identity field: ${name}`);
    }
  }
  return fields;
}

function computePlanDigest(source) {
  return crypto.createHash('sha256').update(canonicalPlanBytes(source), 'utf8').digest('hex');
}

function canonicalPlanBytes(source) {
  return source.replace(PLAN_DIGEST_FIELD, (_line, prefix, _value, suffix) => `${prefix}[DIGEST OMITTED]${suffix}`);
}

// The repository-owner execution authorization row binds itself to one exact
// plan digest, so the digest it carries cannot also be part of the bytes it
// digests. The bound canonical form therefore normalises that cell exactly
// the way the planDigest field is normalised, which keeps the plan
// self-consistent: the digest in the cell is the digest of the plan without
// the cell.
function authorizationIdentityLine(source) {
  for (const line of source.split(/\r?\n/)) {
    const row = splitTableRow(line);
    if (!row) continue;
    if (cleanCell(row[0] || '').replace(/`/g, '') === AUTHORIZATION_RECORD) return line;
  }
  return null;
}

function canonicalPlanBytesWithAuthorizationBinding(source) {
  const line = authorizationIdentityLine(source);
  if (!line) return canonicalPlanBytes(source);
  const normalized = line.replace(DIGEST_TOKEN_GLOBAL, '[DIGEST OMITTED]');
  return canonicalPlanBytes(source.replace(line, normalized));
}

// A plan is accepted when its recorded digest matches either canonical form:
// the documented form (only the planDigest field is normalised) or the bound
// form (the authorization row's digest cell is normalised as well).
function computePlanDigests(source) {
  return {
    documented: computePlanDigest(source),
    bound: crypto
      .createHash('sha256')
      .update(canonicalPlanBytesWithAuthorizationBinding(source), 'utf8')
      .digest('hex'),
  };
}

// The digest the plan already records, when it is a well-formed one.
function recordedPlanDigest(source) {
  const match = PLAN_DIGEST_FIELD.exec(source);
  if (!match) return null;
  const digest = /^sha256:([a-f0-9]{64})$/.exec(cleanCell(match[2]));
  return digest ? digest[1] : null;
}

// The digest the plan should carry. A plan that already records a digest
// keeps it, so the manifest command stays idempotent.
function planDigestForOutput(source) {
  const recorded = recordedPlanDigest(source);
  if (recorded) {
    const digests = computePlanDigests(source);
    if (recorded === digests.documented || recorded === digests.bound) return recorded;
  }
  return computePlanDigests(source).bound;
}

function validateIdentity(fields, source, options, issues) {
  const field = (name) => fields[name.toLowerCase()] || '';
  const planId = field('planId');
  const planRevision = field('planRevision');
  const planDigest = field('planDigest');
  const baseRevision = field('baseRevision');

  if (field('runId') !== options.runId) {
    addIssue(issues, 'RUN_ID_MISMATCH', 'Plan runId must match --run-id and the exact maintenance run root');
  }
  if (!SAFE_ID.test(planId)) addIssue(issues, 'INVALID_PLAN_ID', 'planId must be a path-safe stable ID');
  if (!/^[1-9]\d*$/.test(planRevision)) {
    addIssue(issues, 'INVALID_PLAN_REVISION', 'planRevision must be a canonical positive integer');
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(planDigest)) {
    addIssue(issues, 'INVALID_PLAN_DIGEST', 'planDigest must use sha256 followed by 64 lowercase hex characters');
  } else {
    if (!PLAN_DIGEST_FIELD.test(source)) {
      addIssue(issues, 'INVALID_PLAN_DIGEST', 'Cannot locate the canonical planDigest identity cell');
    } else {
      const digests = computePlanDigests(source);
      const recorded = planDigest.slice('sha256:'.length);
      if (recorded !== digests.documented && recorded !== digests.bound) {
        addIssue(issues, 'PLAN_DIGEST_MISMATCH', 'planDigest does not match the canonical plan bytes');
      }
    }
  }

  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(baseRevision)) {
    addIssue(issues, 'INVALID_BASE_REVISION', 'baseRevision must be a full 40- or 64-character lowercase Git object ID');
  } else {
    validateBaseRevision(baseRevision, options.repoRoot, issues);
  }
  if (field('externalStateRoot') !== options.stateRoot) {
    addIssue(issues, 'STATE_ROOT_MISMATCH', 'externalStateRoot must match the canonical --state-root');
  }
  if (field('repoArtifactRoot') !== `artifacts/output/maintenance/${options.runId}/`) {
    addIssue(issues, 'ARTIFACT_ROOT_MISMATCH', 'repoArtifactRoot must be the exact run-specific maintenance artifact root');
  }
  if (field('recordStatus') !== 'DRAFT') {
    addIssue(issues, 'PLAN_NOT_DRAFT', 'This checker validates draft plans only; recordStatus must be DRAFT');
  }
  if (isMissingText(field('author'))) addIssue(issues, 'MISSING_IDENTITY', 'author must be present');

  const createdAt = field('createdAt');
  const createdAtMs = Date.parse(createdAt);
  if (Number.isNaN(createdAtMs) || !Number.isFinite(createdAtMs) || new Date(createdAtMs).toISOString() !== createdAt) {
    addIssue(issues, 'INVALID_CREATED_AT', 'createdAt must be a canonical UTC ISO timestamp');
  }

  if (SAFE_ID.test(planId) && /^[1-9]\d*$/.test(planRevision)) {
    const expectedPath = path.join(options.artifactRoot, `maintenance-plan-${planId}-r${planRevision}.md`);
    if (options.planPath !== expectedPath) {
      addIssue(issues, 'PLAN_PATH_MISMATCH', 'Plan path must be the canonical revision file directly under this run artifact root');
    }
  }

  if (!source.includes('planDigest') || !source.includes('[DIGEST OMITTED]')) {
    addIssue(issues, 'MISSING_DIGEST_RULE', 'The plan must record the template digest canonicalization rule');
  }
  return validateWorkingTreeIdentity(field('workingTreeIdentity'), baseRevision, options.repoRoot, issues);
}

// The repository HEAD is read with a single revision lookup. It never scans
// the checkout and never writes to the repository.
function readRepositoryHead(repoRoot) {
  let result;
  try {
    result = gitCommand(repoRoot, ['rev-parse', '--verify', '--quiet', 'HEAD'], { allowFailure: true });
  } catch {
    return null;
  }
  if (result.status !== 0) return null;
  const head = String(result.stdout).trim();
  return /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(head) ? head : null;
}

// The plan's own recorded revision must be the repository's current HEAD.
// Comparing the plan only against itself would let a plan stay bound to a
// revision that no longer exists in the repository.
function validateBaseRevision(baseRevision, repoRoot, issues) {
  const head = readRepositoryHead(repoRoot);
  if (!head) {
    addIssue(
      issues,
      'BASE_REVISION_UNVERIFIABLE',
      'The repository HEAD cannot be read, so the plan cannot be bound to a verified revision',
    );
    return;
  }
  if (head !== baseRevision) {
    addIssue(
      issues,
      'BASE_REVISION_MISMATCH',
      `The plan is bound to a revision that is not the current one: baseRevision ${baseRevision} is not the repository HEAD ${head}`,
    );
  }
}

function validateWorkingTreeIdentity(value, baseRevision, repoRoot, issues) {
  if (!value.includes(repoRoot) || !/\bworktree\b/i.test(value) || !/worktree(?:\s*id|\s*identity)/i.test(value)) {
    addIssue(issues, 'INVALID_WORKTREE_IDENTITY', 'workingTreeIdentity must identify this repository path and its worktree');
  }
  if (!/\bbranch\b/i.test(value)) {
    addIssue(issues, 'INVALID_WORKTREE_IDENTITY', 'workingTreeIdentity must identify the branch');
  }
  const head = /\bHEAD\b\s*(?:[:=]\s*)?((?:[a-f0-9]{40}|[a-f0-9]{64}))/i.exec(value)?.[1];
  if (!head || head !== baseRevision) {
    addIssue(issues, 'INVALID_WORKTREE_IDENTITY', 'workingTreeIdentity must include the full HEAD matching baseRevision');
  }
  const saysClean = /\bclean\b/i.test(value);
  const saysDirty = /\bdirty\b/i.test(value);
  if (saysClean === saysDirty) {
    addIssue(issues, 'INVALID_WORKTREE_IDENTITY', 'workingTreeIdentity status must be explicitly clean or dirty');
    return 'unknown';
  }
  return saysDirty ? 'dirty' : 'clean';
}

function validateScope(lines, issues) {
  const section = sectionLines(lines, ['Scope']);
  if (!section) {
    addIssue(issues, 'MISSING_SECTION', 'Missing required section: Scope');
    return;
  }
  const requiredLabels = ['In scope', 'Out of scope', 'Assumptions', 'Constraints', 'Execution boundary'];
  for (const label of requiredLabels) {
    const line = section.find((candidate) => new RegExp(`^\\s*-\\s*\\*\\*${label}:\\*\\*\\s*.+$`, 'i').test(candidate));
    if (!line) addIssue(issues, 'MISSING_SCOPE_FIELD', `Scope section is missing ${label}`);
    else {
      const value = line.replace(/^\s*-\s*\*\*[^*]+:\*\*\s*/, '').trim();
      if (isMissingText(value)) addIssue(issues, 'MISSING_SCOPE_FIELD', `Scope field ${label} must be concrete`);
    }
  }
}

function parseReferenceList(value, label, issues) {
  const trimmed = value.trim();
  if (['—', '–', '-', 'none'].includes(trimmed.toLowerCase())) return [];
  const references = trimmed.split(/[\s,;]+/).filter(Boolean);
  if (references.length === 0 || references.some((reference) => !SAFE_ID.test(reference))) {
    addIssue(issues, 'INVALID_DEPENDENCY', `${label} must be a list of task/decision IDs or —`);
    return [];
  }
  if (new Set(references).size !== references.length) {
    addIssue(issues, 'DUPLICATE_DEPENDENCY', `${label} contains a duplicate dependency`);
  }
  return [...new Set(references)];
}

function findingsTable(lines, issues) {
  return findTable(lines, 'Findings', ['Findings'], {
    id: ['Finding ID'],
    claim: ['Finding / claim and provenance', 'Claim and provenance'],
    status: ['Current status'],
    owner: ['Owner'],
    decisionOwner: ['Decision owner'],
    source: ['Exact source link(s)'],
    test: ['Exact test / verification link(s)', 'Test/verification reference(s)'],
    evidence: ['Evidence reference(s)'],
    revision: ['Revision covered'],
    blockedBy: ['Blocked by'],
  }, issues);
}

function validateFindings(table, tasks, decisions, options, issues) {
  if (!table) return;
  if (table.rows.length === 0) addIssue(issues, 'EMPTY_FINDINGS', 'Findings table must contain at least one source-linked row');

  const ids = new Set();
  table.rows.forEach((row, index) => {
    const id = valueAt(row, table.columns, 'id');
    const context = `Finding row ${index + 1}`;
    if (isMissingText(id)) addIssue(issues, 'MISSING_FINDING_ID', `${context} needs an ID`);
    else if (ids.has(id)) addIssue(issues, 'DUPLICATE_FINDING_ID', `Duplicate finding ID: ${id}`);
    else ids.add(id);

    if (isMissingText(valueAt(row, table.columns, 'claim'))) addIssue(issues, 'MISSING_FINDING_FIELD', `${context} needs a claim and provenance`);
    const status = bracketedStatus(valueAt(row, table.columns, 'status'), FINDING_STATUSES);
    if (!status) addIssue(issues, 'INVALID_FINDING_STATUS', `${context} needs an explicit supported bracketed status`);
    for (const name of ['owner', 'decisionOwner', 'source', 'test', 'evidence', 'revision']) {
      const value = valueAt(row, table.columns, name);
      if (['source', 'test', 'revision'].includes(name) ? isMissingLink(value) : isMissingText(value)) {
        addIssue(issues, 'MISSING_FINDING_FIELD', `${context} needs ${name}`);
      }
    }
    for (const name of ['source', 'test', 'evidence']) {
      requirePathCitation(valueAt(row, table.columns, name), `${context} ${name}`, options, issues);
    }

    const dependencies = parseReferenceList(valueAt(row, table.columns, 'blockedBy'), `${context} blocked by`, issues);
    for (const dependency of dependencies) {
      if (!tasks.has(dependency) && !decisions.has(dependency)) {
        addIssue(issues, 'UNKNOWN_REFERENCE', `${context} references unknown task/decision ${dependency}`);
      }
    }
  });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// A decision ID is matched on token boundaries so "B1" never matches "B10".
function containsDecisionId(text, decisionId) {
  if (typeof text !== 'string' || !text || !decisionId) return false;
  const pattern = new RegExp(`(^|[^A-Za-z0-9_-])${escapeRegExp(decisionId)}($|[^A-Za-z0-9_-])`);
  return pattern.test(text);
}

// An approval row may never assert an authenticated approval. Recorded-claim
// labels such as "not-cryptographically-verified" are not authentication
// claims, so their negated forms are removed before the check.
function assertsAuthentication(text) {
  const cleaned = String(text)
    .replace(NEGATED_AUTHENTICATION_LABEL, '')
    .replace(/\bunauthenticated\b/gi, '');
  return AUTHENTICATION_LABEL.test(cleaned);
}

// The plan's own repository-owner execution authorization row is the first of
// the three artifacts that can unblock an owner decision. It must exist in
// the plan, must carry an explicit authorizing status, must name the
// decision, must cite evidence, and must stay labelled as a recorded claim.
function evaluateAuthorizationArtifact(table, decisionId, issues) {
  if (!table) {
    return {
      recorded: false,
      reason: 'the plan carries no technical review and repository-owner execution authorization section',
    };
  }
  const matches = table.rows.filter((row) => valueAt(row, table.columns, 'record') === AUTHORIZATION_RECORD);
  if (matches.length !== 1) {
    return {
      recorded: false,
      reason: `the plan must carry exactly one "${AUTHORIZATION_RECORD}" row`,
    };
  }

  const row = matches[0];
  const status = valueAt(row, table.columns, 'status');
  const normalizedStatus = normalizeAuthorizationStatus(status);
  if (isMissingText(status) || normalizedStatus === 'PENDING') {
    return {
      recorded: false,
      reason: `the plan's "${AUTHORIZATION_RECORD}" row still records a pending status`,
    };
  }
  if (!AUTHORIZATION_STATUSES.has(normalizedStatus)) {
    if (issues) {
      addIssue(
        issues,
        'INVALID_AUTHORIZATION_STATUS',
        `The "${AUTHORIZATION_RECORD}" row records "${status}", which is not an explicit authorizing status (${[...AUTHORIZATION_STATUSES].join(' or ')})`,
      );
    }
    return {
      recorded: false,
      reason: `the plan's "${AUTHORIZATION_RECORD}" row does not record an explicit authorizing status`,
    };
  }

  const scope = valueAt(row, table.columns, 'scope');
  const evidence = valueAt(row, table.columns, 'evidence');
  if (!containsDecisionId(scope, decisionId) && !containsDecisionId(evidence, decisionId)) {
    return {
      recorded: false,
      reason: `the plan's "${AUTHORIZATION_RECORD}" row does not name decision ${decisionId}`,
    };
  }
  if (isMissingLink(evidence)) {
    return {
      recorded: false,
      reason: `the plan's "${AUTHORIZATION_RECORD}" row carries no evidence reference`,
    };
  }

  const claimStatus = valueAt(row, table.columns, 'claimStatus');
  if (assertsAuthentication(claimStatus)) {
    return {
      recorded: false,
      reason: `the plan's "${AUTHORIZATION_RECORD}" row must label a recorded claim, never an authenticated approval`,
    };
  }
  if (isMissingText(claimStatus) || NEGATED_RECORD_LABEL.test(claimStatus) ||
      !RECORDED_CLAIM_LABEL.test(claimStatus)) {
    return {
      recorded: false,
      reason: `the plan's "${AUTHORIZATION_RECORD}" row does not label a recorded claim`,
    };
  }
  return { recorded: true, reason: '' };
}

function validateOwnerDecisions(lines, runStatus, reviewTable, issues) {
  const table = findTable(lines, 'Owner decisions', [
    'Owner decisions — blockers, not estimated tasks',
    'Owner decisions are blocking dependencies',
  ], {
    id: ['Decision ID'],
    question: ['Exact question', 'Decision to be made'],
    options: ['Options shown without selection'],
    status: ['Status'],
    owner: ['Decision owner'],
    dependent: ['Dependent task/work or gate', 'Dependent work / gate'],
    evidence: ['Owner evidence', 'Owner disposition evidence'],
  }, issues);
  if (!table) return new Map();
  if (table.rows.length === 0) addIssue(issues, 'EMPTY_DECISIONS', 'Owner decisions table must contain rows');

  const decisions = new Map();
  const recorded = new Map((runStatus.ownerDecisions || []).map((decision) => [decision.decisionId, decision]));
  table.rows.forEach((row, index) => {
    const id = valueAt(row, table.columns, 'id');
    const context = `Owner decision row ${index + 1}`;
    if (!SAFE_ID.test(id)) {
      addIssue(issues, 'INVALID_DECISION_ID', `${context} needs a path-safe decision ID`);
      return;
    }
    if (decisions.has(id)) {
      addIssue(issues, 'DUPLICATE_DECISION_ID', `Duplicate decision ID: ${id}`);
      return;
    }
    const statusText = valueAt(row, table.columns, 'status');
    const evidence = valueAt(row, table.columns, 'evidence');
    const rowIsOpen = /^\[OPEN\]$/i.test(statusText.trim());
    const decision = {
      id,
      statusText,
      open: rowIsOpen,
      dependent: valueAt(row, table.columns, 'dependent'),
      resolution: rowIsOpen ? 'open' : 'claimed-disposition',
    };
    decisions.set(id, decision);

    for (const name of ['question', 'owner', 'dependent', 'evidence']) {
      if (isMissingText(valueAt(row, table.columns, name))) {
        addIssue(issues, 'MISSING_DECISION_FIELD', `${context} needs ${name}`);
      }
    }
    if (table.columns.options >= 0 && isMissingText(valueAt(row, table.columns, 'options'))) {
      addIssue(issues, 'MISSING_DECISION_FIELD', `${context} needs options shown without selection`);
    }
    if (REQUIRED_DECISIONS.includes(id) && !/repository owner/i.test(valueAt(row, table.columns, 'owner'))) {
      addIssue(issues, 'INVALID_DECISION_OWNER', `${id} must name Repository owner as the decision owner`);
    }

    // Artifact 3: external state holds a recorded disposition claim for this
    // decision, and the plan cites that claim's evidence reference.
    const claim = recorded.get(id);
    const claimRecorded = Boolean(claim) && claim.status === 'disposition-claim-recorded' &&
      claim.claimStatus === 'not-independently-verified' && claim.actorTypeClaim === 'human' &&
      typeof claim.disposition === 'string' && claim.disposition.trim() !== '' &&
      typeof claim.evidenceRef === 'string' && claim.evidenceRef.trim() !== '';
    const claimCited = claimRecorded && evidence.includes(claim.evidenceRef);
    const statedDisposition = statusText.replace(/^\[|\]$/g, '').trim().toLowerCase();
    const dispositionMatches = claimRecorded && claim.disposition.trim().toLowerCase() === statedDisposition;

    if (!rowIsOpen && !(claimRecorded && dispositionMatches && claimCited)) {
      addIssue(issues, 'UNSUPPORTED_DECISION_STATUS', `${id} must remain [OPEN] unless a matching evidence-backed disposition claim is recorded`);
    }

    // An owner decision is unblocked only when three independent artifacts
    // agree: the plan's own repository-owner execution authorization row, the
    // plan's decision row for that ID, and a recorded disposition claim in
    // external state. A state event alone is a recorded claim, never an
    // authenticated approval, so it never unblocks work by itself.
    const authorization = evaluateAuthorizationArtifact(reviewTable, id, issues);
    const artifacts = {
      authorization: authorization.recorded,
      decisionRow: !rowIsOpen,
      dispositionClaim: claimCited,
    };
    const present = Object.values(artifacts).filter(Boolean).length;
    if (present === 3) {
      decision.open = false;
      decision.resolution = 'recorded-claim';
    } else {
      decision.open = true;
      decision.resolution = 'open';
      // A plain draft records nothing, so it reports nothing beyond the
      // decision staying open.
      if (present > 0) {
        const missing = [];
        if (!artifacts.authorization) missing.push(authorization.reason);
        if (!artifacts.decisionRow) missing.push(`the plan's decision row for ${id} still records [OPEN]`);
        if (!artifacts.dispositionClaim) {
          missing.push(`external state holds no recorded disposition claim for ${id} that this plan cites`);
        }
        addIssue(
          issues,
          'INCOMPLETE_DECISION_RESOLUTION',
          `${id} stays a blocking owner decision: ${missing.join('; ')}`,
        );
      }
    }
  });

  for (const id of REQUIRED_DECISIONS) {
    if (!decisions.has(id)) addIssue(issues, 'MISSING_REQUIRED_DECISION', `Required owner decision ${id} must remain present`);
  }
  return decisions;
}

function parseTaskEvidence(value, taskId, issues) {
  const match = /^(CODE|NON-CODE)\s*:\s*(.*)$/i.exec(value.trim());
  if (!match) {
    addIssue(issues, 'AMBIGUOUS_TASK_EVIDENCE', `${taskId} evidence must start with CODE: or NON-CODE: so its verification form is explicit`);
    return;
  }

  const kind = match[1].toUpperCase();
  const fields = Object.create(null);
  for (const part of match[2].split(';')) {
    const item = /^\s*([A-Za-z][A-Za-z0-9 _-]*)\s*:\s*(.*?)\s*$/.exec(part);
    if (!item) continue;
    const key = item[1].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (key) fields[key] = item[2];
  }
  const get = (...names) => names.map((name) => fields[name]).find((valueForName) => !isMissingText(valueForName || '')) || '';

  if (kind === 'CODE') {
    const testFile = get('testfile', 'exacttestfile');
    const testName = get('testname', 'testcase', 'casename', 'behavioraltest');
    const command = get('command', 'testcommand');
    const revertProof = get('revertproof', 'failureonrevert', 'failswhenreverted');
    if (!/(?:^|[/\\])[^/\\]+\.[A-Za-z0-9]+$/.test(testFile)) {
      addIssue(issues, 'MISSING_CODE_TEST', `${taskId} must name an exact behavior-test file`);
    }
    if (!testName) addIssue(issues, 'MISSING_CODE_TEST', `${taskId} must name a behavior test case`);
    if (!command || (testFile && !command.includes(testFile))) {
      addIssue(issues, 'MISSING_CODE_TEST', `${taskId} must name the command that runs its behavior test`);
    }
    if (!revertProof || !/fail/i.test(revertProof) || !/revert/i.test(revertProof)) {
      addIssue(issues, 'MISSING_REVERT_PROOF', `${taskId} must describe how the behavior test fails when the fix is reverted`);
    }
  } else {
    for (const name of ['steps', 'expected', 'observed', 'verifier', 'date', 'revision']) {
      if (!get(name)) addIssue(issues, 'MISSING_MANUAL_EVIDENCE', `${taskId} non-code evidence needs ${name}`);
    }
  }
}

function tasksTable(lines, issues) {
  return findTable(lines, 'Task list', [
    'Task list',
    'Work-item rows and dependency graph',
  ], {
    id: ['Task ID'],
    work: ['Work item and estimate (1–4h)', 'Work item and estimate (1-4h)', 'Work and estimate (1–4h)', 'Work and estimate (1-4h)'],
    firstAction: ['First action'],
    done: ['Done evidence'],
    status: ['Status', 'Current status'],
    owner: ['Owner'],
    decisionOwner: ['Decision owner'],
    requirements: ['Requirement/story/AC IDs'],
    source: ['Exact source link(s)'],
    verification: ['Revert-proof test or manual evidence', 'Test or manual evidence'],
    depends: ['Depends on'],
    parallel: ['Parallel with'],
  }, issues);
}

// A source, test, or evidence cell must name at least one file the checker can
// resolve. A prose-only citation contributes no path, so the real dependency
// would be absent from the manifest and a later change to it would be
// invisible.
function requirePathCitation(value, context, options, issues) {
  if (!options) return;
  if (isMissingText(value) || isMissingLink(value)) return;
  if (!citationHasResolvablePath(value, options)) {
    addIssue(
      issues,
      'MISSING_PATH_CITATION',
      `${context} must cite at least one resolvable file path; a prose-only citation names no file the checker can fingerprint`,
    );
  }
}

function validateTasks(table, options, issues) {
  if (!table) return new Map();
  if (table.rows.length === 0) addIssue(issues, 'EMPTY_TASKS', 'Task list must contain at least one task');

  const tasks = new Map();
  table.rows.forEach((row, index) => {
    const id = valueAt(row, table.columns, 'id');
    const context = `Task row ${index + 1}`;
    if (!TASK_ID.test(id)) {
      addIssue(issues, 'INVALID_TASK_ID', `${context} needs a T-prefixed task ID`);
      return;
    }
    if (tasks.has(id)) {
      addIssue(issues, 'DUPLICATE_TASK_ID', `Duplicate task ID: ${id}`);
      return;
    }

    const work = valueAt(row, table.columns, 'work');
    const estimates = [...work.matchAll(/\b(\d+(?:\.\d+)?)\s*(?:h|hours?)\b/gi)];
    if (estimates.length !== 1 || Number(estimates[0]?.[1]) < 1 || Number(estimates[0]?.[1]) > 4) {
      addIssue(issues, 'INVALID_ESTIMATE', `${id} must have exactly one estimate from 1 through 4 hours`);
    }

    for (const name of ['work', 'firstAction', 'done', 'status', 'owner', 'decisionOwner', 'source', 'verification', 'depends', 'parallel']) {
      const value = valueAt(row, table.columns, name);
      const missing = ['depends', 'parallel'].includes(name)
        ? !value.trim()
        : name === 'source' ? isMissingLink(value) : isMissingText(value);
      if (missing) {
        addIssue(issues, 'MISSING_TASK_FIELD', `${id} needs ${name}`);
      }
    }
    if (table.columns.requirements >= 0 && isMissingText(valueAt(row, table.columns, 'requirements'))) {
      addIssue(issues, 'MISSING_TASK_FIELD', `${id} needs requirement/story/AC IDs`);
    }
    for (const name of ['source', 'verification']) {
      requirePathCitation(valueAt(row, table.columns, name), `${id} ${name}`, options, issues);
    }

    const status = bracketedStatus(valueAt(row, table.columns, 'status'), TASK_STATUSES);
    if (!status) addIssue(issues, 'INVALID_TASK_STATUS', `${id} needs an explicit supported bracketed status`);

    const task = {
      id,
      status,
      depends: parseReferenceList(valueAt(row, table.columns, 'depends'), `${id} Depends on`, issues),
      parallel: parseReferenceList(valueAt(row, table.columns, 'parallel'), `${id} Parallel with`, issues),
    };
    tasks.set(id, task);
    parseTaskEvidence(valueAt(row, table.columns, 'verification'), id, issues);
  });
  return tasks;
}

function parseGraphEndpoint(value) {
  const match = /^([A-Za-z0-9_-]+)(?:\["([^"]+)"\])?$/.exec(value.trim());
  if (!match) return null;
  const alias = match[1];
  const label = match[2] || '';
  if (alias.startsWith('D_')) {
    const decisionId = alias.slice(2);
    if (label && label !== `${decisionId} [OPEN]`) return null;
    return { type: 'decision', id: decisionId };
  }
  const taskId = alias;
  if (label && label !== alias) return null;
  if (!TASK_ID.test(taskId)) return null;
  return { type: 'task', id: taskId };
}

function parseDependencyGraph(lines, issues) {
  const section = sectionLines(lines, ['Dependency graph', 'Work-item rows and dependency graph']);
  if (!section) {
    addIssue(issues, 'MISSING_SECTION', 'Missing required section: Dependency graph');
    return [];
  }
  const blocks = [];
  for (let index = 0; index < section.length; index += 1) {
    if (!/^\s*```mermaid\s*$/i.test(section[index])) continue;
    const end = section.findIndex((line, searchFrom) => searchFrom > index && /^\s*```\s*$/.test(line));
    if (end < 0) {
      addIssue(issues, 'INVALID_DEPENDENCY_GRAPH', 'Mermaid dependency graph fence is not closed');
      break;
    }
    blocks.push(section.slice(index + 1, end));
    index = end;
  }
  if (blocks.length !== 1) {
    addIssue(issues, 'INVALID_DEPENDENCY_GRAPH', 'Dependency graph must contain exactly one Mermaid block');
    return [];
  }

  const edges = [];
  let hasFlowchart = false;
  for (const line of blocks[0]) {
    const text = line.trim();
    if (!text || text.startsWith('%%')) continue;
    if (/^flowchart\s+(?:LR|RL|TB|TD|BT)\s*$/i.test(text)) {
      if (hasFlowchart) addIssue(issues, 'INVALID_DEPENDENCY_GRAPH', 'Dependency graph must have one flowchart declaration');
      hasFlowchart = true;
      continue;
    }
    const edge = /^(.+?)\s+(-->|-\.\s*blocks\s*\.->)\s+(.+?)\s*$/i.exec(text);
    if (!edge) {
      addIssue(issues, 'INVALID_DEPENDENCY_GRAPH', `Unsupported dependency graph line: ${text}`);
      continue;
    }
    const from = parseGraphEndpoint(edge[1]);
    const to = parseGraphEndpoint(edge[3]);
    if (!from || !to) {
      addIssue(issues, 'INVALID_DEPENDENCY_GRAPH', `Unsupported Mermaid dependency edge: ${text}`);
      continue;
    }
    const type = edge[2] === '-->' ? 'task' : 'decision';
    if (type === 'task' && (from.type !== 'task' || to.type !== 'task')) {
      addIssue(issues, 'INVALID_DEPENDENCY_GRAPH', 'Task dependencies must use task-to-task --> edges');
      continue;
    }
    if (type === 'decision' && (from.type !== 'decision' || to.type !== 'task')) {
      addIssue(issues, 'INVALID_DEPENDENCY_GRAPH', 'Decision blockers must use decision-to-task -. blocks .-> edges');
      continue;
    }
    edges.push({ type, from: from.id, to: to.id });
  }
  if (!hasFlowchart) addIssue(issues, 'INVALID_DEPENDENCY_GRAPH', 'Mermaid graph must declare a flowchart direction');
  return edges;
}

function validateDependencies(tasks, decisions, graphEdges, issues) {
  const expected = new Set();
  for (const task of tasks.values()) {
    for (const dependency of task.depends) {
      if (tasks.has(dependency)) expected.add(`task:${dependency}->${task.id}`);
      else if (decisions.has(dependency)) expected.add(`decision:${dependency}->${task.id}`);
      else addIssue(issues, 'UNKNOWN_REFERENCE', `${task.id} depends on unknown task/decision ${dependency}`);
    }
  }

  const actual = new Set();
  for (const edge of graphEdges) {
    if (edge.type === 'task' && (!tasks.has(edge.from) || !tasks.has(edge.to))) {
      addIssue(issues, 'UNKNOWN_REFERENCE', `Dependency graph references unknown task ${!tasks.has(edge.from) ? edge.from : edge.to}`);
    } else if (edge.type === 'decision' && (!decisions.has(edge.from) || !tasks.has(edge.to))) {
      addIssue(issues, 'UNKNOWN_REFERENCE', `Dependency graph references unknown task/decision ${!decisions.has(edge.from) ? edge.from : edge.to}`);
    }
    const key = `${edge.type}:${edge.from}->${edge.to}`;
    if (actual.has(key)) addIssue(issues, 'DUPLICATE_GRAPH_EDGE', `Dependency graph repeats edge ${key}`);
    actual.add(key);
  }

  for (const edge of expected) {
    if (!actual.has(edge)) addIssue(issues, 'DEPENDENCY_GRAPH_MISMATCH', `Dependency graph is missing ${edge}`);
  }
  for (const edge of actual) {
    if (!expected.has(edge)) addIssue(issues, 'DEPENDENCY_GRAPH_MISMATCH', `Dependency graph has extra edge ${edge}`);
  }

  const visitState = new Map();
  let cycleFound = false;
  function visit(taskId) {
    if (visitState.get(taskId) === 1) {
      cycleFound = true;
      return;
    }
    if (visitState.get(taskId) === 2) return;
    visitState.set(taskId, 1);
    const task = tasks.get(taskId);
    for (const dependency of task.depends) if (tasks.has(dependency)) visit(dependency);
    visitState.set(taskId, 2);
  }
  for (const taskId of tasks.keys()) visit(taskId);
  if (cycleFound) addIssue(issues, 'DEPENDENCY_CYCLE', 'Task dependencies must not contain a cycle');

  // Every decision in a dependency list is checked. Returning on the first
  // decision found let a resolved decision mask an open one later in the same
  // list, so "B10, B1" passed while B1 was still open.
  function dependsOnOpenDecision(taskId, seen = new Set()) {
    if (seen.has(taskId)) return false;
    seen.add(taskId);
    const task = tasks.get(taskId);
    if (!task) return false;
    for (const dependency of task.depends) {
      if (decisions.has(dependency)) {
        if (decisions.get(dependency).open) return true;
        continue;
      }
      if (tasks.has(dependency) && dependsOnOpenDecision(dependency, seen)) return true;
    }
    return false;
  }

  for (const task of tasks.values()) {
    const executable = ['READY', 'EXECUTABLE', 'IN_PROGRESS'].includes(task.status);
    if (executable && dependsOnOpenDecision(task.id)) {
      addIssue(issues, 'OPEN_DECISION_TASK_EXECUTABLE', `${task.id} depends on an open owner decision and cannot be ready or executable`);
    }
    if (dependsOnOpenDecision(task.id) && task.status !== 'BLOCKED') {
      addIssue(issues, 'OPEN_DECISION_TASK_NOT_BLOCKED', `${task.id} depends on an open owner decision and must be marked blocked`);
    }
  }

  for (const task of tasks.values()) {
    for (const peerId of task.parallel) {
      if (!tasks.has(peerId)) {
        addIssue(issues, 'UNKNOWN_REFERENCE', `${task.id} lists unknown parallel task ${peerId}`);
      } else if (!tasks.get(peerId).parallel.includes(task.id)) {
        addIssue(issues, 'ASYMMETRIC_PARALLELISM', `${task.id} and ${peerId} must list each other as parallel`);
      }
    }
  }
}

// The decisions table and the task table must agree about who waits for what.
// A decision that names a dependent task obliges that task to declare the
// decision, and a task that declares an open decision must be blocked. Without
// this reconciliation a task could be marked ready while the decision table
// still says the work waits for the ruling.
function validateDecisionTaskReconciliation(tasks, decisions, issues) {
  for (const decision of decisions.values()) {
    for (const taskId of extractTaskReferences(decision.dependent)) {
      const task = tasks.get(taskId);
      if (!task) {
        addIssue(issues, 'UNKNOWN_REFERENCE', `Owner decision ${decision.id} names unknown task ${taskId}`);
        continue;
      }
      if (!task.depends.includes(decision.id)) {
        addIssue(
          issues,
          'DECISION_TASK_DEPENDENCY_MISMATCH',
          `${taskId} is named as dependent work of owner decision ${decision.id} but does not declare ${decision.id} in its Depends on`,
        );
      }
    }
  }
}

function extractTaskReferences(text) {
  if (typeof text !== 'string' || !text) return [];
  const references = [];
  for (const match of text.matchAll(TASK_REFERENCE)) {
    if (!references.includes(match[0])) references.push(match[0]);
  }
  return references;
}

function reviewAuthorizationTable(lines, issues) {
  return findTable(lines, 'Technical review and repository-owner execution authorization', [
    'Technical review and repository-owner execution authorization',
    'Separate technical review and execution authorization',
  ], {
    record: ['Record'],
    status: ['Status'],
    reviewer: ['Required reviewer/owner'],
    scope: ['Scope / task IDs'],
    identity: ['Exact plan revision and digest'],
    evidence: ['Evidence reference'],
    claimStatus: ['Claim status'],
  }, issues);
}

function validateReviewAndAuthorization(table, options, fields, issues) {
  if (!table) return;

  const requiredRecords = [
    { name: 'Technical plan review', owner: /@tech-lead/i },
    { name: 'Repository-owner execution authorization', owner: /repository owner/i },
  ];
  for (const required of requiredRecords) {
    const matches = table.rows.filter((row) => valueAt(row, table.columns, 'record') === required.name);
    if (matches.length !== 1) {
      addIssue(issues, 'MISSING_REVIEW_RECORD', `A separate ${required.name} record is required`);
      continue;
    }
    const row = matches[0];
    if (!required.owner.test(valueAt(row, table.columns, 'reviewer'))) {
      addIssue(issues, 'INVALID_REVIEW_RECORD', `${required.name} must name its distinct required reviewer/owner`);
    }
    for (const name of ['status', 'scope', 'identity', 'evidence', 'claimStatus']) {
      if (isMissingText(valueAt(row, table.columns, name))) {
        addIssue(issues, 'INVALID_REVIEW_RECORD', `${required.name} needs ${name}`);
      }
    }
    const boundIdentity = valueAt(row, table.columns, 'identity');
    for (const token of [options.runId, fields.planid, fields.planrevision]) {
      if (token && !boundIdentity.includes(token)) {
        addIssue(issues, 'INVALID_REVIEW_RECORD', `${required.name} identity must name the current run, plan, and revision`);
        break;
      }
    }
  }

  // A row that claims authorization must also bind itself to the exact plan
  // digest. Without the digest an authorization row names only the run, the
  // plan, and the revision, so it would still look bound after the plan bytes
  // changed.
  const authorizationRow = table.rows.find((row) => valueAt(row, table.columns, 'record') === AUTHORIZATION_RECORD);
  if (authorizationRow) {
    const status = normalizeAuthorizationStatus(valueAt(authorizationRow, table.columns, 'status'));
    if (AUTHORIZATION_STATUSES.has(status)) {
      const identity = valueAt(authorizationRow, table.columns, 'identity');
      const digestToken = DIGEST_TOKEN.exec(identity);
      const planDigest = (fields.plandigest || '').trim();
      if (!digestToken) {
        addIssue(
          issues,
          'AUTHORIZATION_IDENTITY_MISSING_DIGEST',
          `The "${AUTHORIZATION_RECORD}" row must bind itself to the exact plan digest, not only the run, plan, and revision`,
        );
      } else if (!planDigest || digestToken[0] !== planDigest) {
        addIssue(
          issues,
          'AUTHORIZATION_IDENTITY_MISSING_DIGEST',
          `The "${AUTHORIZATION_RECORD}" row binds ${digestToken[0]}, which is not this plan's digest ${planDigest || '(missing)'}`,
        );
      }
    }
  }

  // These records remain claims/pending fields; they are not authorization.
}

function sha256Hex(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function gitCommand(repoRoot, args, { allowFailure = false, binary = false } = {}) {
  const result = spawnSync('git', ['--no-optional-locks', ...args], {
    cwd: repoRoot,
    encoding: binary ? 'buffer' : 'utf8',
    env: {
      ...process.env,
      GIT_OPTIONAL_LOCKS: '0',
      GIT_TERMINAL_PROMPT: '0',
      LC_ALL: 'C',
    },
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw new Error(`git ${args[0]} failed: ${result.error.message}`);
  if (result.status !== 0 && !allowFailure) {
    const stderr = binary ? String(result.stderr || '') : (result.stderr || '');
    throw new Error(`git ${args[0]} exited with status ${result.status}: ${String(stderr).trim()}`);
  }
  return {
    status: result.status,
    stdout: binary ? result.stdout : (result.stdout || ''),
    stderr: result.stderr || '',
  };
}

function parseIndexEntries(output) {
  const entries = new Map();
  for (const record of String(output).split('\0')) {
    if (!record) continue;
    const tab = record.indexOf('\t');
    if (tab < 0) continue;
    const meta = record.slice(0, tab).split(' ');
    if (meta.length < 3) continue;
    entries.set(record.slice(tab + 1), { mode: meta[0], sha: meta[1], stage: meta[2] });
  }
  return entries;
}

function parseRawDiff(output) {
  const changes = new Map();
  const parts = String(output).split('\0');
  for (let index = 0; index < parts.length; index += 1) {
    const header = parts[index];
    if (!header || !header.startsWith(':')) continue;
    const filePath = parts[index + 1];
    index += 1;
    if (typeof filePath !== 'string') continue;
    const meta = header.slice(1).split(' ');
    changes.set(filePath, { oldMode: meta[0], newMode: meta[1], status: (meta[4] || '').slice(0, 1) });
  }
  return changes;
}

function readCoreFileMode(repoRoot) {
  const result = gitCommand(repoRoot, ['config', '--bool', '--get', 'core.fileMode'], { allowFailure: true });
  if (result.status !== 0) return true;
  return String(result.stdout).trim() !== 'false';
}

function isGitWorkTree(repoRoot) {
  const result = gitCommand(repoRoot, ['rev-parse', '--show-toplevel'], { allowFailure: true });
  if (result.status !== 0) return false;
  const toplevel = String(result.stdout).trim();
  if (!toplevel) return false;
  let realRepoRoot;
  try {
    realRepoRoot = fs.realpathSync(repoRoot);
  } catch {
    realRepoRoot = repoRoot;
  }
  return path.resolve(toplevel) === path.resolve(realRepoRoot);
}

function compareManifestEntries(left, right) {
  if (left.path !== right.path) return left.path < right.path ? -1 : 1;
  if (left.status !== right.status) return left.status < right.status ? -1 : 1;
  return 0;
}

function pathExists(absolute) {
  try {
    fs.lstatSync(absolute);
    return true;
  } catch {
    return false;
  }
}

// Resolves a repo-relative path one component at a time. No component may be
// a symbolic link, so a cited path can never be redirected into a forbidden
// product-state tree through an intermediate link. This mirrors
// maintenance_state.js assertNoSymlinkComponents.
function resolveRepoPath(repoRoot, relativePath) {
  const components = relativePath.split('/').filter(Boolean);
  let current = repoRoot;
  for (let index = 0; index < components.length; index += 1) {
    current = path.join(current, components[index]);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return { kind: 'absent', relativePath };
      return { kind: 'error', relativePath, message: error.message };
    }
    if (stat.isSymbolicLink()) {
      return { kind: 'symlink', relativePath, component: components[index] };
    }
    const isLast = index === components.length - 1;
    if (!isLast && !stat.isDirectory()) {
      return { kind: 'error', relativePath, message: `the parent component ${components[index]} is not a directory` };
    }
    if (isLast) {
      if (stat.isDirectory()) return { kind: 'directory', relativePath };
      if (stat.isFile()) return { kind: 'file', relativePath };
      return { kind: 'error', relativePath, message: 'the path is not a regular file' };
    }
  }
  return { kind: 'absent', relativePath };
}

// The real target of a cited path, used to test the forbidden trees. The
// forbidden test runs on the resolved path, never only on the cited string.
function realTargetRelativePath(repoRoot, relativePath) {
  let realPath;
  try {
    realPath = fs.realpathSync(path.join(repoRoot, relativePath));
  } catch {
    return null;
  }
  const relative = path.relative(repoRoot, realPath);
  if (!relative || relative.startsWith('..')) return null;
  return normalizeRepoPath(relative);
}

function normalizeRepoPath(candidate) {
  if (typeof candidate !== 'string') return null;
  const unified = candidate.trim().replace(/\\/g, '/');
  if (!unified || unified.startsWith('/')) return null;
  const parts = [];
  for (const part of unified.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') return null;
    parts.push(part);
  }
  return parts.length ? parts.join('/') : null;
}

function isForbiddenPath(relativePath, runId) {
  if (FORBIDDEN_EXACT_PATHS.has(relativePath)) return true;
  for (const prefix of FORBIDDEN_PATH_PREFIXES) {
    if (relativePath === prefix.slice(0, -1) || relativePath.startsWith(prefix)) return true;
  }
  const runRoot = `artifacts/output/maintenance/${runId}`;
  if (relativePath === runRoot) return false;
  if (relativePath.startsWith('artifacts/output/') && !relativePath.startsWith(`${runRoot}/`)) return true;
  return false;
}

function readWorktreeFile(repoRoot, relativePath, issues) {
  let stat;
  try {
    stat = fs.lstatSync(path.join(repoRoot, relativePath));
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return { kind: 'absent' };
    addIssue(issues, 'UNSUPPORTED_PATH_KIND', `The relevant path ${relativePath} cannot be inspected: ${error.message}`);
    return null;
  }
  if (stat.isSymbolicLink()) {
    addIssue(issues, 'UNSUPPORTED_PATH_KIND', `The relevant path ${relativePath} is a symbolic link; only regular files are supported`);
    return null;
  }
  if (stat.isDirectory()) {
    // A directory citation hides every file beneath it, so it can never be
    // fingerprinted. It fails closed instead of being silently skipped.
    addIssue(
      issues,
      'DIRECTORY_RELEVANT_PATH',
      `The relevant path ${relativePath} is a directory; a directory citation hides every file beneath it, so only regular files may be cited`,
    );
    addIssue(issues, 'UNSUPPORTED_PATH_KIND', `The relevant path ${relativePath} is a directory; only regular files are supported`);
    return { kind: 'directory' };
  }
  if (!stat.isFile()) {
    addIssue(issues, 'UNSUPPORTED_PATH_KIND', `The relevant path ${relativePath} is not a regular file; only regular files are supported`);
    return null;
  }
  const content = fs.readFileSync(path.join(repoRoot, relativePath));
  return {
    kind: 'file',
    mode: (stat.mode & 0o111) !== 0 ? '100755' : '100644',
    contentSha256: sha256Hex(content),
  };
}

function computeDirtyEntries(repoRoot, relevantPaths, issues) {
  if (relevantPaths.length === 0) return [];

  const toplevel = gitCommand(repoRoot, ['rev-parse', '--show-toplevel'], { allowFailure: true });
  if (toplevel.status !== 0) {
    addIssue(issues, 'MANIFEST_UNVERIFIABLE', 'The repository root is not a Git work tree, so the dirty manifest cannot be computed');
    return null;
  }
  let realRepoRoot;
  try {
    realRepoRoot = fs.realpathSync(repoRoot);
  } catch {
    realRepoRoot = repoRoot;
  }
  if (path.resolve(String(toplevel.stdout).trim()) !== path.resolve(realRepoRoot)) {
    addIssue(issues, 'MANIFEST_UNVERIFIABLE', 'The repository root must be the top level of the Git work tree so fingerprints stay repo-relative');
    return null;
  }

  const pathspecs = relevantPaths.map((entry) => `:(literal)${entry}`);
  const indexEntries = parseIndexEntries(gitCommand(repoRoot, ['ls-files', '-s', '-z', '--', ...pathspecs]).stdout);
  const head = gitCommand(repoRoot, ['rev-parse', '--verify', '--quiet', 'HEAD'], { allowFailure: true });
  const headTree = head.status === 0 ? 'HEAD' : EMPTY_TREE;
  const staged = parseRawDiff(gitCommand(repoRoot, [
    'diff-index', '--cached', '--raw', '-z', headTree, '--', ...pathspecs,
  ]).stdout);
  const coreFileMode = readCoreFileMode(repoRoot);

  const entries = [];
  for (const relativePath of relevantPaths) {
    const indexEntry = indexEntries.get(relativePath);
    if (indexEntry && indexEntry.stage !== '0') {
      addIssue(issues, 'UNSUPPORTED_PATH_KIND', `The relevant path ${relativePath} has an unmerged index entry that cannot be fingerprinted`);
      continue;
    }
    if (indexEntry && !MANIFEST_MODES.has(indexEntry.mode)) {
      addIssue(issues, 'UNSUPPORTED_PATH_KIND', `The relevant path ${relativePath} uses unsupported index mode ${indexEntry.mode}; only regular files are supported`);
      continue;
    }
    const stagedChange = staged.get(relativePath);
    if (stagedChange && !['A', 'M', 'D'].includes(stagedChange.status)) {
      addIssue(issues, 'UNSUPPORTED_PATH_KIND', `The relevant path ${relativePath} has an unsupported staged change type ${stagedChange.status}`);
      continue;
    }

    const worktree = readWorktreeFile(repoRoot, relativePath, issues);
    if (!worktree) continue;

    if (worktree.kind === 'directory') {
      if (indexEntry) {
        addIssue(issues, 'UNSUPPORTED_PATH_KIND', `The relevant path ${relativePath} is a directory but is tracked as a file; only regular files are supported`);
      } else if (pathExists(path.join(repoRoot, relativePath, '.git'))) {
        addIssue(issues, 'UNSUPPORTED_PATH_KIND', `The relevant path ${relativePath} is a submodule checkout; only regular files are supported`);
      }
      continue;
    }

    const indexSha256 = indexEntry
      ? sha256Hex(gitCommand(repoRoot, ['cat-file', 'blob', indexEntry.sha], { binary: true }).stdout)
      : null;

    if (stagedChange) {
      if (stagedChange.status === 'D' || !indexEntry) {
        entries.push({ status: 'staged', path: relativePath, kind: MANIFEST_KIND, mode: null, contentSha256: null });
      } else {
        entries.push({
          status: 'staged', path: relativePath, kind: MANIFEST_KIND,
          mode: indexEntry.mode, contentSha256: indexSha256,
        });
      }
    }

    if (indexEntry) {
      if (worktree.kind === 'absent') {
        entries.push({ status: 'deleted', path: relativePath, kind: MANIFEST_KIND, mode: null, contentSha256: null });
        continue;
      }
      const modeDiffers = coreFileMode && worktree.mode !== indexEntry.mode;
      if (indexSha256 !== worktree.contentSha256 || modeDiffers) {
        entries.push({
          status: 'modified', path: relativePath, kind: MANIFEST_KIND,
          mode: coreFileMode ? worktree.mode : indexEntry.mode,
          contentSha256: worktree.contentSha256,
        });
      }
    } else if (worktree.kind === 'file') {
      entries.push({
        status: 'untracked', path: relativePath, kind: MANIFEST_KIND,
        mode: worktree.mode, contentSha256: worktree.contentSha256,
      });
    }
  }
  return entries.sort(compareManifestEntries);
}

function isPlaceholderFragment(text, index) {
  if (typeof index !== 'number' || index <= 0) return false;
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const character = text[cursor];
    if (PLACEHOLDER_PREFIXES.includes(character)) return true;
    if (!/[A-Za-z0-9_.\-/]/.test(character)) break;
  }
  return false;
}

// A cited file path is a token that ends in a dot-extension. Bare words,
// directory mentions, and prose abbreviations are not citations.
function isPathCitation(token) {
  return PATH_CITATION_SUFFIX.test(token);
}

// One path can be matched by both token patterns, so every match is recorded
// with the span it covers. A match is dropped only when another match starts
// earlier and ends on the same character: that is exactly the shape of a
// duplicated match whose leading characters were dropped ("agents/x.md"
// inside ".agents/x.md"). Two paths written in the same cell never overlap,
// so two genuinely different paths are both kept — including "src/app.js"
// and "app.js", where dropping the shorter one would hide a real file from
// the dirty manifest.
function collapseDuplicateMatches(matches) {
  return matches.filter((candidate) => !matches.some((other) =>
    other !== candidate && other.start < candidate.start && other.end === candidate.end));
}

function extractPathTokens(text) {
  if (typeof text !== 'string' || !text) return [];
  const cleaned = text
    .replace(/[A-Za-z][A-Za-z0-9+.-]*:\/\/[^\s|)>,;]+/g, ' ')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+:[^\s|)>,;]+/g, ' ')
    .replace(/(?<![\w.\/-])\/[^\s|)>,;]+/g, ' ')
    .replace(/\b[0-9a-f]{40,64}\b/gi, ' ');
  const matches = [];
  for (const pattern of [PATH_TOKEN, DIRECTORY_TOKEN]) {
    for (const match of cleaned.matchAll(pattern)) {
      if (isPlaceholderFragment(cleaned, match.index)) continue;
      matches.push({ value: match[0], start: match.index, end: match.index + match[0].length });
    }
  }
  const tokens = [];
  for (const match of collapseDuplicateMatches(matches)) {
    if (!tokens.includes(match.value)) tokens.push(match.value);
  }
  return tokens;
}

function resolveRelativeToPlan(token, options) {
  const absolute = path.resolve(path.dirname(options.planPath), token);
  const relative = path.relative(options.repoRoot, absolute);
  if (!relative || relative.startsWith('..')) return null;
  return normalizeRepoPath(relative);
}

function candidatePaths(token, options) {
  const runPrefix = `artifacts/output/maintenance/${options.runId}/`;
  const candidates = [];
  if (token.startsWith(runPrefix) || token.includes('/')) {
    candidates.push(token);
    const planRelative = resolveRelativeToPlan(token, options);
    if (planRelative) candidates.push(planRelative);
  } else {
    candidates.push(`${runPrefix}${token}`, token);
  }
  const normalized = [];
  for (const candidate of candidates) {
    const value = normalizeRepoPath(candidate);
    if (value && !normalized.includes(value)) normalized.push(value);
  }
  return normalized;
}

function collectColumnTexts(texts, table, names) {
  if (!table) return;
  for (const name of names) {
    const index = table.columns[name];
    if (index === undefined || index < 0) continue;
    for (const row of table.rows) texts.push(row[index] || '');
  }
}

function gitTrackedPaths(repoRoot, paths) {
  if (paths.length === 0) return new Set();
  if (!isGitWorkTree(repoRoot)) return null;
  const pathspecs = paths.map((entry) => `:(literal)${entry}`);
  const entries = parseIndexEntries(gitCommand(repoRoot, ['ls-files', '-s', '-z', '--', ...pathspecs]).stdout);
  return new Set(entries.keys());
}

function trackedPathsFor(options, candidates) {
  if (!options.trackedPathsCache) options.trackedPathsCache = new Map();
  const key = [...candidates].sort().join('\u0000');
  if (!options.trackedPathsCache.has(key)) {
    options.trackedPathsCache.set(key, gitTrackedPaths(options.repoRoot, [...candidates]));
  }
  return options.trackedPathsCache.get(key);
}

// A citation counts as a path citation only when at least one of its path
// tokens resolves to a real file in the working tree or in the Git index. A
// prose-only citation names no file, so the manifest could never fingerprint
// the plan's real dependency.
function citationHasResolvablePath(value, options) {
  const tokens = extractPathTokens(value);
  if (tokens.length === 0) return false;
  const candidates = [];
  for (const token of tokens) {
    for (const candidate of candidatePaths(token, options)) candidates.push(candidate);
  }
  const trackedPaths = trackedPathsFor(options, candidates);
  return tokens.some((token) => candidatePaths(token, options).some((candidate) => {
    const resolved = resolveRepoPath(options.repoRoot, candidate);
    if (resolved.kind === 'file') return true;
    if (resolved.kind === 'absent') return trackedPaths ? trackedPaths.has(candidate) : false;
    return false;
  }));
}

function deriveRelevantPaths(lines, findings, tasks, options, issues) {
  const texts = [];
  collectColumnTexts(texts, findings, ['source', 'test', 'evidence']);
  collectColumnTexts(texts, tasks, ['source', 'verification']);

  const inputs = sectionLines(lines, ['Inputs and reconciliation']);
  if (inputs) {
    for (const table of parseTables(inputs)) {
      if (table.malformed) continue;
      const index = table.headers.indexOf(normalizeHeader('Run-root path'));
      if (index < 0) continue;
      for (const row of table.rows) texts.push(row[index] || '');
    }
    for (const line of inputs) {
      if (/repository source references/i.test(line)) texts.push(line);
    }
  }

  const tokens = [];
  for (const text of texts) tokens.push(...extractPathTokens(text));

  const forbidden = new Set();
  for (const token of tokens) {
    for (const candidate of candidatePaths(token, options)) {
      if (isForbiddenPath(candidate, options.runId)) forbidden.add(candidate);
    }
  }
  if (forbidden.size > 0) {
    for (const candidate of [...forbidden].sort()) {
      addIssue(issues, 'FORBIDDEN_RELEVANT_PATH', `The plan references a forbidden product-state path: ${candidate}`);
    }
    return [];
  }

  const planRelative = normalizeRepoPath(path.relative(options.repoRoot, options.planPath));
  const candidateSet = new Set();
  for (const token of tokens) {
    for (const candidate of candidatePaths(token, options)) candidateSet.add(candidate);
  }
  const trackedPaths = trackedPathsFor(options, [...candidateSet]);

  const relevant = new Set();
  for (const token of tokens) {
    const candidates = candidatePaths(token, options);
    // Every cited path is resolved component by component before anything is
    // read, so a symlinked parent can never redirect a read into a forbidden
    // product-state tree.
    const rejected = new Set();
    for (const candidate of candidates) {
      const resolved = resolveRepoPath(options.repoRoot, candidate);
      if (resolved.kind !== 'symlink') continue;
      rejected.add(candidate);
      addIssue(
        issues,
        'UNSUPPORTED_PATH_KIND',
        `The relevant path ${candidate} is reached through the symbolic link ${resolved.component}; only regular files with no symlinked component are supported`,
      );
      addIssue(
        issues,
        'SYMLINKED_RELEVANT_PATH',
        `The relevant path ${candidate} cannot be resolved because the component ${resolved.component} is a symbolic link`,
      );
      const realTarget = realTargetRelativePath(options.repoRoot, candidate);
      if (realTarget && isForbiddenPath(realTarget, options.runId)) {
        addIssue(
          issues,
          'FORBIDDEN_RELEVANT_PATH',
          `The plan references a forbidden product-state path through a symbolic link: ${candidate} resolves to ${realTarget}`,
        );
      }
    }

    const resolvable = candidates.filter((candidate) => {
      if (rejected.has(candidate)) return false;
      const resolved = resolveRepoPath(options.repoRoot, candidate);
      if (resolved.kind === 'file') return true;
      if (resolved.kind === 'directory') {
        addIssue(
          issues,
          'DIRECTORY_RELEVANT_PATH',
          `The relevant path ${candidate} is a directory; a directory citation hides every file beneath it, so only regular files may be cited`,
        );
        addIssue(
          issues,
          'UNSUPPORTED_PATH_KIND',
          `The relevant path ${candidate} is a directory; only regular files are supported`,
        );
        return false;
      }
      if (resolved.kind === 'absent') return trackedPaths ? trackedPaths.has(candidate) : false;
      return false;
    });
    if (resolvable.length === 0) {
      // A cited file that resolves nowhere must fail closed. Dropping it
      // would let the dirty manifest omit a file the plan depends on.
      if (isPathCitation(token) && !rejected.size) {
        addIssue(
          issues,
          'UNRESOLVABLE_RELEVANT_PATH',
          `The plan cites a file path that resolves neither in the working tree nor in the Git index: ${token}`,
        );
      }
      continue;
    }
    const chosen = resolvable[0];
    if (planRelative && chosen === planRelative) continue;
    relevant.add(chosen);
  }
  return [...relevant].sort();
}

function parseDirtyManifest(value, issues) {
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    addIssue(issues, 'INVALID_DIRTY_MANIFEST', `The dirtyManifest must be valid JSON: ${error.message}`);
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    addIssue(issues, 'INVALID_DIRTY_MANIFEST', 'The dirtyManifest must be a JSON object');
    return null;
  }
  if (parsed.schema !== MANIFEST_SCHEMA) {
    addIssue(issues, 'INVALID_DIRTY_MANIFEST', `The dirtyManifest schema must be ${MANIFEST_SCHEMA}`);
    return null;
  }
  if (!Array.isArray(parsed.files)) {
    addIssue(issues, 'INVALID_DIRTY_MANIFEST', 'The dirtyManifest files field must be an array');
    return null;
  }

  const files = [];
  for (const entry of parsed.files) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      addIssue(issues, 'INVALID_DIRTY_MANIFEST', 'Every dirtyManifest entry must be a JSON object');
      return null;
    }
    const keys = Object.keys(entry).sort();
    if (keys.length !== MANIFEST_FIELDS.length || keys.some((key, index) => key !== MANIFEST_FIELDS[index])) {
      addIssue(issues, 'INVALID_DIRTY_MANIFEST', 'Every dirtyManifest entry must contain exactly the fields status, path, kind, mode, and contentSha256');
      return null;
    }
    if (!MANIFEST_STATUSES.has(entry.status)) {
      addIssue(issues, 'INVALID_DIRTY_MANIFEST', `Unsupported dirtyManifest status: ${String(entry.status)}`);
      return null;
    }
    if (entry.kind !== MANIFEST_KIND) {
      addIssue(issues, 'INVALID_DIRTY_MANIFEST', `Unsupported dirtyManifest kind: ${String(entry.kind)}`);
      return null;
    }
    const relativePath = normalizeRepoPath(entry.path);
    if (!relativePath || relativePath !== entry.path) {
      addIssue(issues, 'INVALID_DIRTY_MANIFEST', `The dirtyManifest path must be a normalized repo-relative path: ${String(entry.path)}`);
      return null;
    }
    if (entry.mode !== null && !MANIFEST_MODES.has(entry.mode)) {
      addIssue(issues, 'INVALID_DIRTY_MANIFEST', `The dirtyManifest mode must be 100644, 100755, or null: ${String(entry.mode)}`);
      return null;
    }
    if (entry.contentSha256 !== null && !/^[a-f0-9]{64}$/.test(entry.contentSha256)) {
      addIssue(issues, 'INVALID_DIRTY_MANIFEST', `The dirtyManifest contentSha256 must be 64 lowercase hex characters or null: ${String(entry.contentSha256)}`);
      return null;
    }
    if ((entry.mode === null) !== (entry.contentSha256 === null)) {
      addIssue(issues, 'INVALID_DIRTY_MANIFEST', `The dirtyManifest mode and contentSha256 must both be null or both be present: ${entry.path}`);
      return null;
    }
    const absent = entry.mode === null;
    if (entry.status === 'deleted' && !absent) {
      addIssue(issues, 'INVALID_DIRTY_MANIFEST', `A deleted dirtyManifest entry must carry a null mode and contentSha256: ${entry.path}`);
      return null;
    }
    if ((entry.status === 'modified' || entry.status === 'untracked') && absent) {
      addIssue(issues, 'INVALID_DIRTY_MANIFEST', `A ${entry.status} dirtyManifest entry must carry a mode and contentSha256: ${entry.path}`);
      return null;
    }
    files.push({
      status: entry.status,
      path: entry.path,
      kind: entry.kind,
      mode: entry.mode,
      contentSha256: entry.contentSha256,
    });
  }

  const sorted = [...files].sort(compareManifestEntries);
  if (sorted.some((file, index) => files[index] !== file)) {
    addIssue(issues, 'INVALID_DIRTY_MANIFEST', 'The dirtyManifest files must be sorted by normalized path and then status');
    return null;
  }
  return { schema: MANIFEST_SCHEMA, files };
}

function compareManifests(declaredFiles, actualEntries, relevantPaths, issues) {
  const relevant = new Set(relevantPaths);
  const keyOf = (entry) => `${entry.path}\u0000${entry.status}`;
  const actualByKey = new Map(actualEntries.map((entry) => [keyOf(entry), entry]));
  const matchedDeclared = new Set();
  const matchedActual = new Set();

  for (const file of declaredFiles) {
    const actual = actualByKey.get(keyOf(file));
    if (!actual) continue;
    matchedDeclared.add(keyOf(file));
    matchedActual.add(keyOf(file));
    if (file.kind !== actual.kind || file.mode !== actual.mode || file.contentSha256 !== actual.contentSha256) {
      addIssue(issues, 'DIRTY_MANIFEST_MISMATCH', `The dirtyManifest entry for ${file.path} (${file.status}) does not match the computed fingerprint`);
    }
  }

  const leftoverDeclared = declaredFiles.filter((file) => !matchedDeclared.has(keyOf(file)));
  const leftoverActual = actualEntries.filter((entry) => !matchedActual.has(keyOf(entry)));
  const leftoverByPath = new Map();
  for (const entry of leftoverActual) leftoverByPath.set(entry.path, entry);

  const consumed = new Set();
  for (const file of leftoverDeclared) {
    const candidate = leftoverByPath.get(file.path);
    if (candidate && !consumed.has(keyOf(candidate))) {
      consumed.add(keyOf(candidate));
      addIssue(issues, 'DIRTY_MANIFEST_MISMATCH', `The dirtyManifest status for ${file.path} does not match the computed status ${candidate.status}`);
      continue;
    }
    if (!relevant.has(file.path)) {
      addIssue(issues, 'DIRTY_MANIFEST_ENTRY_EXTRA', `The dirtyManifest declares ${file.path}, which is not in the plan's relevant-path set`);
    } else {
      addIssue(issues, 'DIRTY_MANIFEST_ENTRY_EXTRA', `The dirtyManifest declares a ${file.status} change to ${file.path} that the working tree does not contain`);
    }
  }

  for (const entry of leftoverActual) {
    if (!consumed.has(keyOf(entry))) {
      addIssue(issues, 'DIRTY_MANIFEST_ENTRY_MISSING', `The dirtyManifest does not declare the ${entry.status} change to ${entry.path}`);
    }
  }
}

function verifyDirtyManifest(options, context, issues) {
  const { fields, treeStatus, relevantPaths } = context;
  const declaredValue = (fields.dirtymanifest || '').trim();
  const declared = declaredValue ? parseDirtyManifest(declaredValue, issues) : null;

  if (!isGitWorkTree(options.repoRoot)) {
    if (declared) {
      addIssue(issues, 'MANIFEST_UNVERIFIABLE', 'The repository root is not a Git work tree, so the declared dirtyManifest cannot be verified');
    } else if (treeStatus === 'dirty') {
      addIssue(issues, 'MISSING_DIRTY_MANIFEST', 'A dirty working tree must declare a machine-readable dirtyManifest');
    }
    return;
  }

  const actual = computeDirtyEntries(options.repoRoot, relevantPaths, issues);
  if (!actual) return;

  if (treeStatus === 'clean') {
    if (actual.length > 0) {
      addIssue(issues, 'WORKTREE_IDENTITY_CONTRADICTION', 'The plan declares a clean working tree but its relevant files are dirty');
    }
    if (declared && declared.files.length > 0) {
      addIssue(issues, 'WORKTREE_IDENTITY_CONTRADICTION', 'The plan declares a clean working tree but its dirtyManifest lists changed files');
    }
  } else if (treeStatus === 'dirty' && !declared) {
    addIssue(issues, 'MISSING_DIRTY_MANIFEST', 'A dirty working tree must declare a machine-readable dirtyManifest');
    return;
  }

  if (!declared) return;
  compareManifests(declared.files, actual, relevantPaths, issues);
}

// Reads the run's recorded events straight from the external state root so the
// checker can compare the session that recorded each event. The read is
// read-only, and no component of the path may be a symbolic link.
function readRunEventRecords(stateRoot, runId, issues) {
  const relative = path.join('runs', runId, 'events');
  let current = stateRoot;
  for (const component of relative.split(path.sep)) {
    current = path.join(current, component);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      addIssue(issues, 'RUN_EVENTS_UNREADABLE', `The maintenance run events cannot be read: ${error.message}`);
      return null;
    }
    if (stat.isSymbolicLink()) {
      addIssue(issues, 'RUN_EVENTS_UNREADABLE', 'The maintenance run events must not be reached through a symbolic link');
      return null;
    }
    if (!stat.isDirectory()) {
      addIssue(issues, 'RUN_EVENTS_UNREADABLE', 'The maintenance run events path must be a directory');
      return null;
    }
  }

  let names;
  try {
    names = fs.readdirSync(current).sort();
  } catch (error) {
    addIssue(issues, 'RUN_EVENTS_UNREADABLE', `The maintenance run events cannot be listed: ${error.message}`);
    return null;
  }

  const events = [];
  for (const name of names) {
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}\.json$/.test(name)) continue;
    const eventPath = path.join(current, name);
    let stat;
    try {
      stat = fs.lstatSync(eventPath);
    } catch (error) {
      addIssue(issues, 'RUN_EVENTS_UNREADABLE', `A maintenance run event cannot be inspected: ${error.message}`);
      return null;
    }
    if (stat.isSymbolicLink() || !stat.isFile()) {
      addIssue(issues, 'RUN_EVENTS_UNREADABLE', 'A maintenance run event must be a regular file');
      return null;
    }
    let record;
    try {
      record = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    } catch (error) {
      addIssue(issues, 'RUN_EVENTS_UNREADABLE', `A maintenance run event cannot be parsed: ${error.message}`);
      return null;
    }
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      addIssue(issues, 'RUN_EVENTS_UNREADABLE', 'A maintenance run event record is malformed');
      return null;
    }
    events.push({
      eventId: typeof record.eventId === 'string' ? record.eventId : null,
      type: typeof record.type === 'string' ? record.type : null,
      sessionId: typeof record.sessionId === 'string' && record.sessionId ? record.sessionId : null,
      details: record.details && typeof record.details === 'object' && !Array.isArray(record.details)
        ? record.details
        : {},
    });
  }
  return events;
}

// The plan's bytes must be the bytes the approval recorded. An approved plan
// that is edited in place, even with its own digest recomputed, no longer
// matches the approved plan hash, so the check fails closed.
function validateApprovedPlanDigest(runStatus, fields, issues) {
  const planId = fields.planid || '';
  const planRevision = fields.planrevision || '';
  const planDigest = (fields.plandigest || '').trim();
  const revisions = (runStatus.planRevisions || []).filter((entry) =>
    entry.planId === planId && String(entry.planRevision) === String(planRevision));
  if (revisions.length !== 1) return;
  const entry = revisions[0];
  const approvalEventIds = Array.isArray(entry.approvalEventIds) ? entry.approvalEventIds : [];
  if (approvalEventIds.length === 0) return;
  const hashes = Array.isArray(entry.planHashes) && entry.planHashes.length > 0
    ? entry.planHashes
    : [entry.planHash];
  const approved = hashes
    .filter((value) => typeof value === 'string' && value.trim() !== '')
    .map((value) => value.replace(/^sha256:/, ''));
  const recorded = planDigest.replace(/^sha256:/, '');
  if (approved.length !== 1 || !recorded || approved[0] !== recorded) {
    addIssue(
      issues,
      'PLAN_APPROVAL_DIGEST_MISMATCH',
      `The plan digest does not match the plan hash the recorded approval holds for ${planId} revision ${planRevision}`,
    );
  }
}

// Two events recorded by two different sessions are two different records.
// Two events recorded by one session are one record, whatever they claim.
//
// This is separation of duties on the RECORD, not identity authentication:
// the state store records claims and never authenticates an identity, so a
// distinct session proves only that the two claims were recorded apart from
// each other. It proves nothing about who the actors were.
function sessionsDiffer(left, right) {
  return typeof left === 'string' && left !== '' && typeof right === 'string' && right !== '' && left !== right;
}

function validateSeparationOfDuties(events, fields, issues) {
  if (!events) return;

  const draftsById = new Map();
  for (const event of events) {
    if (event.type === 'plan_drafted' && event.eventId) draftsById.set(event.eventId, event);
  }

  for (const event of events) {
    if (event.type !== 'plan_approved') continue;
    const draft = draftsById.get(event.details.draftEventId);
    if (!draft) continue;
    if (!sessionsDiffer(draft.sessionId, event.sessionId)) {
      addIssue(
        issues,
        'SEPARATION_OF_DUTIES_VIOLATION',
        'The plan approval was recorded in the same session as the plan draft it references, so authoring and approving are not separated; this is separation of duties on the recorded claim chain, not identity authentication',
      );
    }
  }

  const planId = fields.planid || '';
  const planRevision = fields.planrevision || '';
  const drafts = events.filter((event) => event.type === 'plan_drafted' &&
    event.details.planId === planId &&
    String(event.details.planRevision) === String(planRevision));
  if (drafts.length === 0) return;
  const draftSession = drafts[0].sessionId;
  for (const event of events) {
    if (event.type !== 'owner_decision_disposition') continue;
    if (!sessionsDiffer(draftSession, event.sessionId)) {
      addIssue(
        issues,
        'SEPARATION_OF_DUTIES_VIOLATION',
        `The owner decision disposition for ${event.details.decisionId} was recorded in the same session as the plan draft, so authoring and disposition are not separated; this is separation of duties on the recorded claim chain, not identity authentication`,
      );
    }
  }
}

function readPlanDocument(options) {
  const identity = {
    scope: options.scope,
    repoRoot: options.repoRoot,
    stateRoot: options.stateRoot,
    runId: options.runId,
  };
  const artifactRoot = maintenanceState.getMaintenanceArtifactRoot(identity);
  options.artifactRoot = artifactRoot;
  if (!path.isAbsolute(options.planPath) || path.resolve(options.planPath) !== options.planPath) {
    throw new Error('--plan must be an absolute canonical path');
  }
  maintenanceState.assertMaintenanceArtifactPath(identity, options.planPath);
  if (path.dirname(options.planPath) !== artifactRoot) {
    throw new Error('--plan must be a direct child of the exact maintenance run artifact root');
  }

  const stat = fs.lstatSync(options.planPath);
  if (stat.isSymbolicLink() || !stat.isFile() || fs.realpathSync(options.planPath) !== options.planPath) {
    throw new Error('--plan must resolve to a canonical regular file');
  }
  const source = fs.readFileSync(options.planPath, 'utf8');
  return { source, lines: source.split(/\r?\n/) };
}

function buildManifest(options) {
  const { source, lines } = readPlanDocument(options);
  const issues = [];
  const findings = findingsTable(lines, issues);
  const tasks = tasksTable(lines, issues);
  const relevantPaths = deriveRelevantPaths(lines, findings, tasks, options, issues);
  const entries = computeDirtyEntries(options.repoRoot, relevantPaths, issues) || [];  return {
    valid: issues.length === 0,
    manifest: { schema: MANIFEST_SCHEMA, files: entries },
    relevantPaths,
    planDigest: `sha256:${planDigestForOutput(source)}`,
    issues,
  };
}

function checkPlan(options) {
  const identity = {
    scope: options.scope,
    repoRoot: options.repoRoot,
    stateRoot: options.stateRoot,
    runId: options.runId,
  };
  const artifactRoot = maintenanceState.getMaintenanceArtifactRoot(identity);
  options.artifactRoot = artifactRoot;
  if (!path.isAbsolute(options.planPath) || path.resolve(options.planPath) !== options.planPath) {
    throw new Error('--plan must be an absolute canonical path');
  }
  maintenanceState.assertMaintenanceArtifactPath(identity, options.planPath);
  if (path.dirname(options.planPath) !== artifactRoot) {
    throw new Error('--plan must be a direct child of the exact maintenance run artifact root');
  }

  const stat = fs.lstatSync(options.planPath);
  if (stat.isSymbolicLink() || !stat.isFile() || fs.realpathSync(options.planPath) !== options.planPath) {
    throw new Error('--plan must resolve to a canonical regular file');
  }
  const source = fs.readFileSync(options.planPath, 'utf8');
  const lines = source.split(/\r?\n/);
  const issues = [];
  if (source.startsWith('\uFEFF')) addIssue(issues, 'NONCANONICAL_TEXT', 'Plan must not start with a UTF-8 byte-order mark');

  const fields = parseIdentity(lines, issues);
  validatePlainSentence(lines, fields, issues);
  const treeStatus = validateIdentity(fields, source, options, issues);
  validateScope(lines, issues);

  const runStatus = maintenanceState.readMaintenanceRunStatus(identity);
  const reviewTable = reviewAuthorizationTable(lines, issues);
  const decisions = validateOwnerDecisions(lines, runStatus, reviewTable, issues);
  const findings = findingsTable(lines, issues);
  const taskTable = tasksTable(lines, issues);
  const tasks = validateTasks(taskTable, options, issues);
  validateFindings(findings, tasks, decisions, options, issues);
  const graphEdges = parseDependencyGraph(lines, issues);
  validateDependencies(tasks, decisions, graphEdges, issues);
  validateDecisionTaskReconciliation(tasks, decisions, issues);
  validateReviewAndAuthorization(reviewTable, options, fields, issues);
  validateApprovedPlanDigest(runStatus, fields, issues);
  validateSeparationOfDuties(readRunEventRecords(options.stateRoot, options.runId, issues), fields, issues);
  const relevantPaths = deriveRelevantPaths(lines, findings, taskTable, options, issues);
  verifyDirtyManifest(options, { fields, treeStatus, relevantPaths }, issues);

  return { valid: issues.length === 0, planStatus: issues.length === 0 ? 'draft' : 'invalid', issues };
}

function main() {
  let output;
  let command = 'check';
  try {
    const options = parseArguments(process.argv.slice(2));
    command = options.command;
    output = options.command === 'manifest' ? buildManifest(options) : checkPlan(options);
  } catch (error) {
    output = {
      valid: false,
      planStatus: command === 'check' ? 'invalid' : undefined,
      issues: [{ code: command === 'check' ? 'PLAN_CHECK_FAILED' : 'MANIFEST_FAILED', message: error.message }],
    };
  }
  output.executionAuthorized = false;
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  if (!output.valid) process.exitCode = 2;
}

if (require.main === module) main();

// The command line interface is the product surface of this script. The
// citation reader is exported unchanged so its regression tests can assert
// the exact tokens it reads, not only the issues the checker reports.
module.exports = { extractPathTokens };
