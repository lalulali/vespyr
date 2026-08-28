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
const SCRIPTS_DIR = path.dirname(process.argv[1]);
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
    if (pat.re.test(clean)) {
      clean = clean.replace(pat.re, '[SANITIZED_INSTRUCTION_OVERRIDE]');
    }
  }
  return clean;
}

function buildEntry({ domain, title, agent, content, status, refs, date, sessionId }) {
  const sanitizedContent = scrubSecrets(sanitizeContent(content.trim()));
  const sanitizedTitle = scrubSecrets(sanitizeContent(title.trim()));
  const lines = [
    `### [${domain}] ${sanitizedTitle} [date: ${date}] [agent: ${agent}]`,
    sanitizedContent,
    `**Status:** ${status}`,
  ];
  if (refs) lines.push(`**References:** ${refs}`);
  // 02o.2: session provenance on every entry (attribution before arbitration)
  lines.push(`**Session:** ${sessionId || 'unattributed'}`);
  lines.push('');
  return lines.join('\n');
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

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`Usage:
  node memory_write.js --file <file> --agent <@agent> --domain <DOMAIN> --title "<title>" --content "<content>"

Required: --file, --agent, --domain, --title, --content
Optional: --status active|resolved|superseded (default: active)
          --refs   "<ADR-001, PR-042>" (optional references)

Allowed files: ${[...ALLOWED_FILES].join(', ')}
Allowed domains: ${[...VALID_DOMAINS].join(', ')}`);
    process.exit(0);
  }

  let file = null, agent = null, domain = null, title = null, content = null;
  let status = 'active', refs = null;

  for (let i = 0; i < args.length; i += 2) {
    if (args[i] === '--file') file = args[i + 1];
    else if (args[i] === '--agent') agent = args[i + 1];
    else if (args[i] === '--domain') domain = args[i + 1];
    else if (args[i] === '--title') title = args[i + 1];
    else if (args[i] === '--content') content = args[i + 1];
    else if (args[i] === '--status') status = args[i + 1];
    else if (args[i] === '--refs') refs = args[i + 1];
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

      const entry = buildEntry({ domain, title, agent, content, status, refs, date, sessionId: sid });

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
