#!/usr/bin/env node
/**
 * memory_write.js — Unified Memory Entry Writer for Vespyr
 *
 * Combines validation + dedup + write + threshold check into one bash call.
 * Allows agents to bypass the @memory-controller subagent for writes,
 * going directly to @executor with a single bash command.
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
const path = require('path');
const { execFileSync } = require('child_process');

const MEMORY_DIR = path.join(process.cwd(), 'artifacts', 'memory');
const SCRIPTS_DIR = path.dirname(process.argv[1]);

// Word-count limit per plan §6.2
const MAX_WORDS = 500;

// Allowed domain tags
const VALID_DOMAINS = new Set([
  'ARCH', 'CODE', 'LESSON', 'PRODUCT', 'RISK', 'SECURITY',
  'PERF', 'ML', 'UX', 'DATA', 'OPS', 'ROUND TABLE', 'NOTE'
]);

// Allowed memory files
const ALLOWED_FILES = new Set([
  'active-decisions.md',
  'lessons-learned.md',
  'patterns-and-conventions.md',
  'blockers-and-risks.md',
  'project-context.md',
  'agent-notes/developer-notes.md',
  'agent-notes/architect-notes.md',
  'agent-notes/tech-lead-notes.md',
  'agent-notes/product-manager-notes.md',
]);

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function buildEntry({ domain, title, agent, content, status, refs, date }) {
  const lines = [
    `### [${domain}] ${title} [date: ${date}] [agent: ${agent}]`,
    content.trim(),
    `**Status:** ${status}`,
  ];
  if (refs) lines.push(`**References:** ${refs}`);
  lines.push('');
  return lines.join('\n');
}

function runDedupeValidator(filePath, title) {
  const script = path.join(SCRIPTS_DIR, 'dedupe_validator.js');
  if (!fs.existsSync(script)) return { duplicate: false };
  try {
    const out = execFileSync('node', [script, '--file', filePath, '--title', title], {
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
    execFileSync('node', [script, '--file', filePath], {
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

  // --- Deduplicate ---
  const dedupeResult = runDedupeValidator(filePath, title);
  if (dedupeResult.duplicate) {
    console.error(
      `Duplicate entry detected: "${title}" already exists in ${file}.\n` +
      'Use a different title or update the existing entry manually.'
    );
    process.exit(1);
  }

  // --- Build & Append ---
  const date = new Date().toISOString().split('T')[0];
  const entry = buildEntry({ domain, title, agent, content, status, refs, date });

  // Initialize file with a header if it doesn't exist
  if (!fs.existsSync(filePath)) {
    const header = `# ${path.basename(file, '.md').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}\n\n`;
    fs.writeFileSync(filePath, header, 'utf8');
  }

  fs.appendFileSync(filePath, '\n' + entry, 'utf8');

  // --- Compaction guard (informational) ---
  runCompactionGuard(filePath);

  console.log(JSON.stringify({
    success: true,
    file,
    domain,
    title,
    agent,
    date,
    words: wordCount
  }));
}

main();
