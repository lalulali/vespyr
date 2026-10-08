#!/usr/bin/env node
/**
 * memory_write.js — Unified Memory Entry Writer for Vespyr
 *
 * Combines validation + dedup + write + threshold check into one bash call.
 * Allows agents to bypass the @memory-controller subagent for writes
 * with a single bash command.
 *
 * Usage:
 *   node .agents/scripts/memory_write.js \
 *     --file active-decisions.md \
 *     --agent @developer \
 *     --domain ARCH \
 *     --title "Chose PostgreSQL over MongoDB" \
 *     --content "PostgreSQL chosen for ACID compliance and JSONB support..."
 *
 *   node .agents/scripts/memory_write.js \
 *     --file lessons-learned.md \
 *     --agent @qa-engineer \
 *     --domain LESSON \
 *     --title "Integration tests must mock external APIs" \
 *     --content "Without mocking, tests are flaky due to rate limits."
 *
 * Required flags:
 *   --file     Target memory file (relative to artifacts/memory/)
 *   --agent    Agent name with @ prefix (e.g. @developer)
 *   --domain   Domain tag in UPPERCASE (e.g. ARCH, CODE, LESSON, PRODUCT, RISK)
 *   --title    Short title for the entry (< 80 chars)
 *   --content  Entry body text (< 500 words enforced)
 *
 * Optional flags:
 *   --status   Entry status: active | resolved | superseded (default: active)
 *   --refs     Optional references (e.g. ADR-001, PR-042)
 */

'use strict';

const fs = require('fs');
const { writeFileSync: atomicWriteFileSync } = require('./lib/fs_atomic.js');
const { withLock } = require('./lib/lock.js');
const { resolveSessionId } = require('./lib/session.js');
const path = require('path');
const { execFileSync } = require('child_process');

const MEMORY_DIR = path.join(process.cwd(), 'artifacts', 'memory');
const SCRIPTS_DIR = __dirname;
// 02o.1: all memory-file mutations serialize through one project lock.
// Scope covers dedupe → append → compaction atomically (TOCTOU closure,
// gate-review Vera-a). LOCK_TIMEOUT is a loud rejection (exit 1), never a
// silent drop.
const MEMORY_LOCK = path.join(process.cwd(), '.agents', 'state', 'memory.lock');
const WRITE_LEDGER = path.join(process.cwd(), '.agents', 'state', 'memory-write-ledger.jsonl');

// Word-count limit per plan §6.2
const MAX_WORDS = 500;

// Allowed domain tags
const VALID_DOMAINS = new Set([
  'AUTH', 'API', 'DATA', 'ARCH', 'INFRA', 'SECURITY', 'PERF',
  'PRODUCT', 'PROCESS', 'CODE', 'TEST', 'ML', 'UX', 'MARKET',
  'RISK', 'LESSON', 'DECISION'
]);

// Allowed memory files
const ALLOWED_FILES = new Set([
  'active-decisions.md',
  'lessons-learned.md',
  'patterns-and-conventions.md',
  'blockers-and-risks.md',
  'project-context.md',
  'teaching-style.md',
]);

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

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

function scrubSecrets(text) {
  let clean = text;
  for (const { name, regex } of SECRET_PATTERNS) {
    clean = clean.replace(regex, `[REDACTED_SECRET: ${name}]`);
  }
  return clean;
}

const INJECTION_PATTERNS = [
  { id: 'INJ-PROMPT', re: /ignore\s+(all\s+|any\s+)?(previous|prior|earlier)\s+instructions|disregard\s+(all\s+|any\s+)?(previous|prior)\s+instructions|forget\s+(all\s+|any\s+)?(previous|prior)\s+instructions/i },
  { id: 'INJ-ROLE', re: /you\s+are\s+now\s+(the\s+)?(system|root|superuser)|act\s+as\s+(the\s+)?system\b|new\s+system\s+prompt:/i },
  { id: 'INJ-TOOL', re: /<(invoke|use_mcp_tool|execute_command|tool_use|antml:invoke)[^>]*>/i },
];

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

function buildEntry({ domain, title, agent, content, status, refs, date, sessionId, supersedes }) {
  const sanitizedContent = scrubSecrets(sanitizeContent(content.trim()));
  const sanitizedTitle = scrubSecrets(sanitizeContent(title.trim()));
  const lines = [
    `### [${domain}] ${sanitizedTitle} [date: ${date}] [agent: ${agent}]`,
    sanitizedContent,
    `**Status:** ${status}`,
  ];
  // Declared supersession (2026-10-06). The header records what this entry REPLACES, so
  // the decision->lesson flush has a decidable link instead of guessing from domain or
  // wording similarity. Domain matching was measured as unsafe: five of this session's
  // verdict-gate decisions shared a domain while several remained independently binding,
  // so "newer in same domain" would have retired live constraints.
  if (supersedes) {
    lines.push(`**Supersedes:** ${scrubSecrets(sanitizeContent(String(supersedes)))}`);
  }
  if (refs) lines.push(`**References:** ${scrubSecrets(sanitizeContent(String(refs)))}`);
  // 02o.2: session provenance on every entry (attribution before arbitration)
  lines.push(`**Session:** ${sessionId || 'unattributed'}`);
  lines.push('');
  return lines.join('\n');
}

/**
 * Set an existing entry's Status field, through the pipeline.
 *
 * WHY THIS EXISTS. The decision->lesson flush needs a completion signal, and there is
 * none: measured 0 of 120 historical entries and 0 of the current 7 carried a resolvable
 * status, so every status-driven path ever built fired on nothing. One entry was titled
 * "[RISK] RESOLVED: ..." while its Status field still read `active` — a record that
 * contradicts itself, which any status-driven sweep would either miss or misread.
 *
 * Marking an entry done by hand-editing the file is prohibited (AGENTS.md
 * §Interacting with Memory) because it bypasses scrubbing, sanitisation, provenance and
 * dedupe. This is the sanctioned way, and it is what makes the flush fire at all.
 */
function setEntryStatus({ file, headerMatch, status, agent }) {
  if (!ALLOWED_FILES.has(file)) {
    return { error: `Not a canonical memory file: ${file}` };
  }
  const valid = ['active', 'resolved', 'superseded', 'complete', 'stale'];
  if (valid.indexOf(status) === -1) {
    return { error: `Invalid status "${status}". One of: ${valid.join(', ')}` };
  }
  const filePath = path.join(MEMORY_DIR, file);
  if (!fs.existsSync(filePath)) return { error: `Not found: ${file}` };

  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n');
  const starts = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('### ') || lines[i].startsWith('## AD-')) starts.push(i);
  }
  const needle = String(headerMatch).replace(/^#{2,3}\s+/, '').replace(/\s+/g, ' ').trim();
  const hits = starts.filter((s) => {
    const stored = lines[s].replace(/^#{2,3}\s+/, '').replace(/\s+/g, ' ').trim();
    return stored === needle || stored.startsWith(needle);
  });
  if (hits.length === 0) return { error: `No entry matches in ${file}: "${headerMatch}"` };
  if (hits.length > 1) return { error: `Ambiguous: ${hits.length} entries match "${headerMatch}".` };

  const startIdx = hits[0];
  const startPos = starts.indexOf(startIdx);
  const endIdx = startPos + 1 < starts.length ? starts[startPos + 1] : lines.length;

  const block = lines.slice(startIdx, endIdx);
  let changed = false;
  for (let i = 0; i < block.length; i++) {
    if (/^\s*\*\*Status:\*\*/.test(block[i])) {
      block[i] = `**Status:** ${status}`;
      changed = true;
      break;
    }
  }
  // An entry with no Status line gets one, rather than being silently skipped — the
  // "titled RESOLVED, status active" records are exactly this case.
  if (!changed) {
    const at = block.findIndex((l) => /^\s*\*\*Session:\*\*/.test(l));
    block.splice(at === -1 ? block.length : at, 0, `**Status:** ${status}`);
  }
  block[0] = block[0].replace(/\s*\[superseded-by:[^\]]*\]/i, '');
  if (status === 'resolved' || status === 'superseded' || status === 'complete') {
    block[0] = block[0].replace(/\s*$/, '');
  }

  return withLock(MEMORY_LOCK, () => {
    const sid = resolveSessionId();
    const remaining = lines.slice(0, startIdx).concat(block, lines.slice(endIdx));
    atomicWriteFileSync(filePath, remaining.join('\n').replace(/\n{3,}/g, '\n\n'), 'utf8');
    try {
      fs.appendFileSync(WRITE_LEDGER, JSON.stringify({
        ts: new Date().toISOString(), session_id: sid,
        action: 'set-status', file, header: needle, status, agent: agent || null
      }) + '\n', 'utf8');
    } catch { /* ledger must never block */ }
    return { success: true, file, header: needle, status, session_id: sid };
  });
}

function runDedupeValidator(filePath, title) {
  const script = path.join(SCRIPTS_DIR, 'dedupe_validator.js');
  if (!fs.existsSync(script)) return { duplicate: false };
  try {
    const out = execFileSync(process.execPath, [script, '--target', filePath, '--title', title], {
      encoding: 'utf8',
      cwd: process.cwd()
    });
    return JSON.parse(out);
  } catch (e) {
    // If dedupe validator fails, proceed anyway (non-blocking)
    return { duplicate: false };
  }
}

function runCompactionGuard(filePath) {
  const script = path.join(SCRIPTS_DIR, 'compaction_guard.js');
  if (!fs.existsSync(script)) return;
  try {
    execFileSync(process.execPath, [script, '--file', filePath], {
      encoding: 'utf8',
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'inherit']
    });
  } catch (e) {
    // Compaction guard warnings are informational — non-blocking
  }
}

/**
 * Enforce the retention policy on the WRITE path.
 *
 * WHY THIS MOVED HERE (2026-10-05). Compaction used to run only from `advance`,
 * `set-phase`, and the explicit `compact` command — all of which were, until this same
 * change, also the things that FAILED when memory was over budget. So the policy's only
 * triggers were the operations it could veto. Removing the veto without moving the
 * trigger would have left retention with nothing invoking it, and memory would have grown
 * unbounded and silently. That is strictly worse than a visible wedge.
 *
 * Now every memory write invokes the policy. Growth is bounded by
 * (creation rate x retention window) — a policy bound, which is the right kind of bound —
 * rather than by a cliff that an agent discovers only when it tries to finish work.
 *
 * Best-effort by design: a compaction failure must never cost the caller their write.
 */
function enforceRetentionPolicy(filePath) {
  const script = path.join(SCRIPTS_DIR, 'orchestrator_state.js');
  if (!fs.existsSync(script)) return;
  try {
    execFileSync(process.execPath, [script, 'compact'], {
      encoding: 'utf8',
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (e) {
    // Non-blocking: the write already succeeded and is committed. Retention runs on
    // every subsequent write too, so a transient failure self-heals.
  }
}

/**
 * Reclassify an existing entry from one canonical memory file to another.
 *
 * WHY THIS EXISTS (2026-10-05). `active-decisions.md` is for "critical active design
 * choices and architectural constraints". Measured: 6 of its 13 entries were work
 * records — 4 `[PROCESS]` and 2 `[TEST]` audit-session logs — which are lessons, not
 * standing decisions. Moving them by hand-editing `artifacts/memory/**` is explicitly
 * prohibited by AGENTS.md §Interacting with Memory: direct edits bypass secret scrubbing,
 * injection sanitisation, provenance attestation and dedupe.
 *
 * So the move needs a sanctioned path. This reuses the SAME lock, the SAME dedupe
 * validator and the SAME ledger as an append, and additionally scrubs the content on the
 * way through — an entry that was safe to write once may carry text that predates the
 * current secret patterns, and re-writing it should not launder that.
 *
 * Atomic: source removal and destination append happen inside one lock hold. A crash
 * between them loses nothing, because the source is only removed once the destination
 * write has succeeded.
 *
 * Refuses to guess: both files must be canonical, the entry header must match exactly
 * one section, and the destination must not already contain it.
 */
function reclassifyEntry({ from, to, headerMatch, agent, reason }) {
  if (!ALLOWED_FILES.has(from) || !ALLOWED_FILES.has(to)) {
    return { error: `Both --from and --to must be canonical memory files. Allowed: ${[...ALLOWED_FILES].join(', ')}` };
  }
  if (from === to) return { error: '--from and --to are the same file; nothing to move.' };

  const fromPath = path.join(MEMORY_DIR, from);
  const toPath = path.join(MEMORY_DIR, to);
  if (!fs.existsSync(fromPath)) return { error: `Source not found: ${from}` };

  const raw = fs.readFileSync(fromPath, 'utf8');
  const lines = raw.split('\n');
  const starts = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('### ') || lines[i].startsWith('## AD-')) starts.push(i);
  }

  // Locate the single matching section. Matched on a PREFIX of the header, not equality:
  // a stored header carries trailing `[date: ...] [agent: ...]` tags, so demanding exact
  // equality would reject the obvious spelling of the title and push an operator toward
  // copy-pasting machine metadata. Still counted, so an ambiguous prefix is refused rather
  // than guessed at.
  const needle = headerMatch.replace(/^#{2,3}\s+/, '').replace(/\s+/g, ' ').trim();
  const hits = starts.filter((s) => {
    const stored = lines[s].replace(/^#{2,3}\s+/, '').replace(/\s+/g, ' ').trim();
    return stored === needle || stored.startsWith(needle);
  });
  if (hits.length === 0) return { error: `No entry matches in ${from}: "${headerMatch}"` };
  if (hits.length > 1) {
    return { error: `Ambiguous: ${hits.length} entries match "${headerMatch}". Match more of the header.` };
  }

  const startIdx = hits[0];
  // `starts` holds LINE NUMBERS, so the position of the hit must be looked up before
  // indexing it. Using startIdx directly here meant `starts[96]` on a 13-element array —
  // undefined, so endIdx fell through to lines.length and the "remove one block" step
  // actually truncated the file from the target entry to the end. Measured: moving ONE
  // entry turned 13 headers into 5. Caught only because the operation was rehearsed on a
  // throwaway copy first.
  const startPos = starts.indexOf(startIdx);
  const endIdx = startPos + 1 < starts.length ? starts[startPos + 1] : lines.length;
  const block = lines.slice(startIdx, endIdx);
  // Drop trailing separator/blank lines so they do not migrate with the entry.
  while (block.length && block[block.length - 1].trim() === '') block.pop();

  const body = block.join('\n');
  const m = body.match(/\[([A-Z]+)\]/);
  const domain = m ? m[1] : 'DECISION';
  const titleLine = block[0].replace(/^#{2,3}\s+/, '').trim();
  const titleMatch = titleLine.match(/^\[([A-Z ]+?)\]\s*(.*?)(?:\s*\[date:|\s*$)/);
  const title = titleMatch ? titleMatch[2].trim() : titleLine;
  const dateMatch = titleLine.match(/\[date:\s*(\d{4}-\d{2}-\d{2})\]/);
  const entryDate = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];
  const agentMatch = titleLine.match(/\[agent:\s*(@[^\]]+)\]/);
  const contentBody = body.split('\n').slice(1).join('\n').trim();

  const scrubbed = sanitizeContent(contentBody || title);

  return withLock(MEMORY_LOCK, () => {
    const sid = resolveSessionId();

    // Destination dedupe — refuse to create a second copy of the same lesson.
    const dedupeResult = runDedupeValidator(toPath, title);
    if (dedupeResult && (dedupeResult.duplicate === true || dedupeResult.status === 'duplicate')) {
      return { error: `${to} already contains an entry matching "${title}". Nothing moved.` };
    }

    if (!fs.existsSync(toPath)) {
      const header = `# ${path.basename(to, '.md').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}\n\n`;
      atomicWriteFileSync(toPath, header);
    }

    // Append FIRST. If this throws, the source is untouched and nothing is lost.
    const entry = buildEntry({
      domain, title,
      agent: agentMatch ? agentMatch[1] : (agent || '@memory-controller'),
      content: scrubbed,
      status: 'active',
      refs: null,
      date: entryDate,
      sessionId: sid
    });
    fs.appendFileSync(toPath, '\n' + entry, 'utf8');

    // Then remove from source, and only the moved block.
    const remaining = lines.slice(0, startIdx).concat(lines.slice(endIdx));
    atomicWriteFileSync(fromPath, remaining.join('\n').replace(/\n{3,}/g, '\n\n'), 'utf8');

    try {
      fs.appendFileSync(WRITE_LEDGER, JSON.stringify({
        ts: new Date().toISOString(),
        session_id: sid,
        action: 'reclassify',
        from, to, title,
        reason: reason || null
      }) + '\n', 'utf8');
    } catch { /* ledger must never block the move */ }

    runCompactionGuard(toPath);
    enforceRetentionPolicy(toPath);

    return { success: true, from, to, title, domain, date: entryDate, session_id: sid };
  });
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`Usage:
  node memory_write.js --file <file> --agent <@agent> --domain <DOMAIN> --title "<title>" --content "<content>"

  node memory_write.js --reclassify --from <file> --to <file> --header "<exact entry header>" [--reason "..."]

Required: --file, --agent, --domain, --title, --content
Optional: --status active|resolved|superseded (default: active)
          --refs   "<ADR-001, PR-042>" (optional references)

--reclassify moves an EXISTING entry between canonical memory files, atomically and under
the memory lock. Use it when an entry was filed in the wrong file — e.g. an audit-session
work log sitting in active-decisions.md, which is for standing design choices only. Both
files must be canonical, the header must match exactly one section, and the destination
must not already contain it. Nothing is deleted: the entry is rewritten in the
destination with its content scrubbed, and recorded in the write ledger.

Allowed files: ${[...ALLOWED_FILES].join(', ')}
Allowed domains: ${[...VALID_DOMAINS].join(', ')}`);
    process.exit(0);
  }

  /**
 * Routing advisory: warn when an entry's domain suggests it was filed in the wrong file.
 *
 * WHY A WARNING, NOT A GATE. Measured and deliberately non-decidable: "all memory writes
 * go through memory_write.js" is a PROCESS entry that genuinely IS a standing constraint
 * and belongs in active-decisions.md. A hard block on PROCESS/TEST there would fire on
 * correct entries — the same false-positive machine that was already rejected once on
 * ZERO-CONSUMPTION. So this reports and lets the author decide, then --reclassify moves
 * it. A gate nobody can pass is a gate nobody reads.
 *
 * Basis for the advice: 6 of 13 entries in active-decisions.md were [PROCESS]/[TEST] work
 * records, which is what pushed that file to 7,944 tokens against a 2,500 budget.
 */
function routingAdvisory(file, domain) {
  if (file !== 'active-decisions.md') return null;
  const workRecord = ['PROCESS', 'TEST', 'LESSON'].indexOf(domain) >= 0;
  if (!workRecord) return null;
  return (
    `[routing] "${domain}" in active-decisions.md is usually a WORK RECORD, not a standing ` +
    `design choice. If this entry describes something that was done, found, or fixed, it ` +
    `belongs in lessons-learned.md — that file is loaded every session and this one should ` +
    `hold only constraints that still bind. Move it with:\n` +
    `  node .agents/scripts/memory_write.js --reclassify --from active-decisions.md ` +
    `--to lessons-learned.md --header "<exact title>"`
  );
}

// --- Resolve: mark an existing entry's lifecycle status (drives the lesson flush) ---
  if (args.includes('--resolve')) {
    const get = (flag) => {
      const i = args.indexOf(flag);
      return i !== -1 ? args[i + 1] : null;
    };
    const file = get('--file');
    const header = get('--header');
    const status = get('--status') || 'resolved';
    if (!file || !header) {
      console.error('--resolve requires --file and --header');
      process.exit(1);
    }
    const result = setEntryStatus({ file, headerMatch: header, status, agent: get('--agent') });
    if (result.error) {
      console.error(`Resolve refused: ${result.error}`);
      process.exit(1);
    }
    console.log(JSON.stringify(result));
    process.exit(0);
  }

  // --- Reclassify: move an existing entry to its correct file ---
  if (args.includes('--reclassify')) {
    const get = (flag) => {
      const i = args.indexOf(flag);
      return i !== -1 ? args[i + 1] : null;
    };
    const from = get('--from');
    const to = get('--to');
    const header = get('--header');
    if (!from || !to || !header) {
      console.error('--reclassify requires --from, --to and --header');
      process.exit(1);
    }
    const result = reclassifyEntry({
      from, to, headerMatch: header,
      agent: get('--agent'),
      reason: get('--reason')
    });
    if (result.error) {
      console.error(`Reclassify refused: ${result.error}`);
      process.exit(1);
    }
    console.log(JSON.stringify(result));
    process.exit(0);
  }

  let file = null, agent = null, domain = null, title = null, content = null;
  let status = 'active', refs = null, supersedes = null;

  for (let i = 0; i < args.length; i += 2) {
    if (args[i] === '--file') file = args[i + 1];
    else if (args[i] === '--agent') agent = args[i + 1];
    else if (args[i] === '--domain') domain = args[i + 1];
    else if (args[i] === '--title') title = args[i + 1];
    else if (args[i] === '--content') content = args[i + 1];
    else if (args[i] === '--status') status = args[i + 1];
    else if (args[i] === '--refs') refs = args[i + 1];
    else if (args[i] === '--supersedes') supersedes = args[i + 1];
  }

  // --- Validation ---
  const errors = [];
  if (!file) errors.push('--file is required');
  if (!agent) errors.push('--agent is required (e.g. @developer)');
  if (!domain) errors.push('--domain is required (e.g. ARCH, CODE, LESSON)');
  if (!title) errors.push('--title is required');
  if (!content) errors.push('--content is required');

  if (errors.length > 0) {
    console.error('Validation errors:\n' + errors.map(e => '  ' + e).join('\n'));
    process.exit(1);
  }

  // Normalize domain to uppercase
  domain = domain.toUpperCase();
  if (!VALID_DOMAINS.has(domain)) {
    console.error(`Invalid --domain "${domain}". Allowed: ${[...VALID_DOMAINS].join(', ')}`);
    process.exit(1);
  }

  // Target file must be in the canonical allow-list
  if (!ALLOWED_FILES.has(file)) {
    console.error(`Invalid --file "${file}". Allowed: ${[...ALLOWED_FILES].join(', ')}`);
    process.exit(1);
  }

  // Agent/status are interpolated raw into the entry header (buildEntry) — outside
  // the content scrub path. Fail closed: attacker-controlled newlines here forge
  // sections that parseSections re-parses as real entries (Victor R1, Wave 6).
  agent = String(agent).replace(/^@+/, '');
  if (!/^[A-Za-z0-9][A-Za-z0-9\-_]*$/.test(agent)) {
    console.error(`Invalid --agent "${agent}". Use a plain agent name (letters, digits, -, _).`);
    process.exit(1);
  }
  const VALID_STATUSES = new Set(['active', 'resolved', 'superseded', 'archived', 'complete', 'stale']);
  if (!VALID_STATUSES.has(String(status))) {
    console.error(`Invalid --status "${status}". Allowed: ${[...VALID_STATUSES].join(', ')}`);
    process.exit(1);
  }

  // Word count check
  const wordCount = countWords(content);
  if (wordCount > MAX_WORDS) {
    console.error(`Content too long: ${wordCount} words (max ${MAX_WORDS}). Summarize before writing.`);
    process.exit(1);
  }

  // Resolve full file path
  const filePath = path.join(MEMORY_DIR, file);
  const fileDir = path.dirname(filePath);
  if (!fs.existsSync(fileDir)) {
    fs.mkdirSync(fileDir, { recursive: true });
  }

  // --- Deduplicate → Build → Append (02o.1: atomic under memory.lock) ---
  const date = new Date().toISOString().split('T')[0];
  let sessionId;
  try {
    sessionId = withLock(MEMORY_LOCK, () => {
      const sid = resolveSessionId();

      const dedupeResult = runDedupeValidator(filePath, title);
      if (dedupeResult && (dedupeResult.duplicate === true || dedupeResult.status === 'duplicate')) {
        return { duplicate: true };
      }
      if (dedupeResult && dedupeResult.status === 'possible_duplicate') {
        console.error(`Warning: possible duplicate of existing entry (score ${dedupeResult.score ?? 'n/a'}) — admitted with provenance.`);
      }

      const entry = buildEntry({ domain, title, agent, content, status, refs, date, sessionId: sid, supersedes });

      // Routing advisory — printed, never enforced. See routingAdvisory() for why a gate
      // here would be a false-positive machine.
      const advisory = routingAdvisory(file, domain);
      if (advisory) console.error(advisory);

      // Header-init inside the lock — the unlocked atomic-rename here could
      // wipe a concurrent append (gate-review Nina-a corruption mode 1).
      if (!fs.existsSync(filePath)) {
        const header = `# ${path.basename(file, '.md').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}\n\n`;
        atomicWriteFileSync(filePath, header);
      }

      fs.appendFileSync(filePath, '\n' + entry, 'utf8');

      // Write ledger (02o.4 ledger source) — inside the lock, cheap append
      try {
        fs.appendFileSync(WRITE_LEDGER, JSON.stringify({
          ts: new Date().toISOString(),
          session_id: sid,
          file,
          title
        }) + '\n', 'utf8');
      } catch { /* ledger must never block the write */ }

      // --- Compaction guard (informational; may rewrite file → in-lock) ---
      runCompactionGuard(filePath);
      // --- Retention policy (2026-10-05) ---
      // Runs inside the same lock so a compaction can never interleave with a write and
      // lose an entry. This is the write-path trigger that replaced the phase-transition
      // trigger; see enforceRetentionPolicy() for why the trigger had to move.
      enforceRetentionPolicy(filePath);
      return { duplicate: false, sessionId: sid };
    });
  } catch (e) {
    if (String(e.message).startsWith('LOCK_TIMEOUT')) {
      console.error(
        `LOCK_TIMEOUT: memory write rejected — another session holds the memory lock.\n` +
        `The write was NOT applied (loud loss). Retry after the other session finishes.`
      );
      process.exit(1);
    }
    throw e;
  }

  if (sessionId.duplicate) {
    console.error(
      `Duplicate entry detected: "${title}" already exists in ${file}.\n` +
      'Use a different title or update the existing entry manually.'
    );
    process.exit(1);
  }
  sessionId = sessionId.sessionId;

  console.log(JSON.stringify({
    success: true,
    file,
    domain,
    title,
    agent,
    date,
    words: wordCount,
    session_id: sessionId
  }));
}

if (require.main === module) {
  main();
}

module.exports = {
  reclassifyEntry,
  scrubSecrets,
  sanitizeContent,
  buildEntry,
  countWords,
  runDedupeValidator,
  runCompactionGuard,
  SECRET_PATTERNS,
  INJECTION_PATTERNS,
  VALID_DOMAINS,
  ALLOWED_FILES
};
