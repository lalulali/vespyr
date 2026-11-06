#!/usr/bin/env node
/**
 * Pipeline State Manager — DAG Pipeline Execution for Vespyr
 *
 * Manages pipeline state, validates outputs, tracks artifact versions,
 * and determines next actions. This script is the canonical source of
 * truth for project state — every skill calls it directly.
 * There is no @orchestrator subagent; the script itself
 * is the state machine.
 *
 * State hierarchy:
 *   Source of truth: artifacts/output/pipeline-state.json (full state: phases,
 *     artifacts, history, change_requests, last_session_write, blockers)
 *   Display mirror:  artifacts/output/sprint-status.yaml (human-readable subset)
 *   readState() prefers JSON; YAML is only a fallback when JSON is absent.
 *
 * Usage:
 *   node orchestrator_state.js init --name "My Project" --type startup
 *   node orchestrator_state.js status
 *   node orchestrator_state.js next
 *   node orchestrator_state.js complete --agent founder --artifact idea-brief.md
 *   node orchestrator_state.js complete --agent founder --artifact idea-brief.md --check-memory
 *   node orchestrator_state.js session-write --agent developer
 *   node orchestrator_state.js file-cr --from developer --to product-manager --target user-stories.md --issue "..."
 *   node orchestrator_state.js validate --phase planning
 *   node orchestrator_state.js --help | usage | -h
 */

const fs = require('fs');
const { parseFlagArgs } = require('./lib/flag_args');
const path = require('path');

const { writeFileSync: atomicWriteFileSync, writeJsonSync, readJsonSync } = require('./lib/fs_atomic.js');
const { withLock } = require('./lib/lock.js');
const { resolveSessionId, regenerateLatest } = require('./lib/session.js');
const { syncProjectContext } = require('./session_start.js');

const STATE_FILE = path.join(process.cwd(), 'artifacts', 'output', 'pipeline-state.json');
const OUTPUT_DIR = path.join(process.cwd(), 'artifacts', 'output');
const TELEMETRY_DIR = path.join(process.cwd(), 'artifacts', 'telemetry');
const PROJECT_ROOT = process.cwd();
// The one lock that guards `artifacts/memory/active-decisions.md` (and the lessons file it
// feeds). memory_write.js uses the same path. Every read-modify-write of those files must
// hold it, otherwise a compactor can overwrite an append it never saw.
//
// LOCK ORDER: orchestrator.lock -> memory.lock. Never the reverse. memory_write.js takes
// memory.lock only, and runs retention AFTER releasing it, so no process holds
// memory.lock while waiting for orchestrator.lock.
const MEMORY_LOCK = path.join(process.cwd(), '.agents', 'state', 'memory.lock');

function countTokens(text) {
  // INV-TEL-04: single canonical estimator (tools/eval/lib/tokenizer).
  // Local words/0.75 math survives only as unreachable-environment fallback.
  try {
    const { countTokens: canonical } = require('../../tools/eval/lib/tokenizer');
    if (typeof canonical === 'function') return canonical(text);
  } catch (e) {}
  if (!text || typeof text !== 'string') return 0;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round(words / 0.75);
}

/** Pull a YYYY-MM-DD out of a decision header, preferring the explicit [date:] tag. */
function extractSectionDate(headerLine) {
  const tagged = headerLine.match(/\[date:\s*(\d{4}-\d{2}-\d{2})\]/i);
  if (tagged) return tagged[1];
  const ad = headerLine.match(/(20\d{2}-\d{2}-\d{2})/);
  return ad ? ad[1] : null;
}

/** Whole days between an ISO date and today. Undated sections return Infinity. */
function ageInDays(isoDate, now) {
  if (!isoDate) return Infinity;
  const then = new Date(`${isoDate}T00:00:00Z`).getTime();
  if (!Number.isFinite(then)) return Infinity;
  return Math.floor((now.getTime() - then) / 86400000);
}

/**
 * Owner's retention model: history stays findable, the LOADED file holds only recent
 * decisions, and anything older retires itself into the archive.
 *
 * WHY THIS EXISTS. Compaction previously archived a section ONLY when a human had
 * hand-edited `**Status:**` to resolved/superseded/complete/stale. Measured on this
 * repo: 121 sections, 120 still `active`, 0 ever resolved — so `compact` archived
 * nothing, ever, and the file only ever grew. Measured 47,548 tokens against a budget,
 * which wedged `advance` and `set-phase` outright.
 *
 * The fix is NOT to loosen the budget alone — that only moves the cliff. It is to give
 * compaction a trigger that fires without a human: an entry older than
 * RETENTION_DAYS retires to artifacts/memory/archive/, where it stays fully readable.
 * Retirement is not deletion. `/memory` and the ndjson index still find it, and the
 * section keeps its full original text in the shard.
 */
const RETENTION_DAYS = 30;

/**
 * Translate FINISHED decisions into lessons, and report what looks finished.
 *
 * WHY THIS IS SEPARATE FROM compactActiveDecisions(). Two different questions:
 *
 *   compactActiveDecisions()  — "is this entry still worth LOADING?" Age-based, moves to
 *                               the cold archive, keeps the loaded file small.
 *   flushDecisionsToLessons() — "is this entry still a DECISION?" Completion-based, moves
 *                               to lessons-learned.md, which IS loaded every session.
 *
 * Conflating them would push aged entries into the warm, always-loaded file and make
 * lessons-learned the next thing to bloat. So this fires only on completion signals, never
 * on age.
 *
 * TWO SIGNALS, both explicit. A guess was measured and rejected: five of this session's
 * verdict-gate decisions shared the DECISION domain while several remained independently
 * binding, so "a newer entry exists in the same domain" would have retired live
 * constraints. Nothing here infers.
 *
 *   1. Status is resolved / superseded / complete / stale — set via
 *      `memory_write.js --resolve`, the sanctioned way (hand-editing memory is prohibited).
 *   2. Another entry DECLARES `**Supersedes:** <this header>` — written with
 *      `memory_write.js --supersedes`, so the link is recorded, not guessed.
 *
 * Domain-similar older entries are REPORTED as candidates and never moved. Visible beats
 * clever: an owner can promote a candidate with one command, and nothing binding is
 * retired by a heuristic.
 */
// Every live flush rewrites active-decisions.md (and lessons-learned.md), so it must hold
// memory.lock. A dry run only reads; locking it would just add contention.
function flushDecisionsToLessons(opts = {}) {
  if (opts.dryRun) return flushDecisionsToLessonsUnlocked(opts);
  return withLock(MEMORY_LOCK, () => flushDecisionsToLessonsUnlocked(opts));
}

function flushDecisionsToLessonsUnlocked({ dryRun = false } = {}) {
  const memoryDir = path.join(process.cwd(), 'artifacts', 'memory');
  const decisionsPath = path.join(memoryDir, 'active-decisions.md');
  const lessonsPath = path.join(memoryDir, 'lessons-learned.md');

  const result = {
    translated: [], candidates: [], dryRun,
    activeBefore: 0, activeAfter: 0,
    unresolvedSupersedes: []
  };
  if (!fs.existsSync(decisionsPath)) return result;

  const raw = fs.readFileSync(decisionsPath, 'utf8');
  const lines = raw.split('\n');
  const starts = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('### ') || lines[i].startsWith('## AD-')) starts.push(i);
  }

  const sections = starts.map((s, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] : lines.length;
    const body = lines.slice(s, end);
    return {
      start: s, end, body,
      header: body[0].replace(/^#{2,3}\s+/, '').replace(/\s+/g, ' ').trim(),
      domain: (body[0].match(/^#{2,3}\s*\[([A-Z ]+?)\]/) || [, 'DECISION'])[1].trim(),
      date: (body[0].match(/\[date:\s*(\d{4}-\d{2}-\d{2})\]/) || [, null])[1],
      statusLine: body.find((l) => /^\s*\*\*Status:\*\*/.test(l)) || ''
    };
  });
  result.activeBefore = sections.length;

  // Signal 2: what do live entries declare they supersede?
  const supersededTargets = new Set();
  for (const s of sections) {
    const decl = s.body.find((l) => /^\s*\*\*Supersedes:\*\*/.test(l));
    if (!decl) continue;
    const target = decl.replace(/^\s*\*\*Supersedes:\*\*\s*/, '').replace(/\s+/g, ' ').trim();
    const match = sections.find((x) => x.header.startsWith(target) || target.startsWith(x.header));
    if (match) supersededTargets.add(match.header);
    else result.unresolvedSupersedes.push(target.slice(0, 70));
  }

  const DONE = /^\s*\*\*Status:\*\*\s*(resolved|superseded|complete|stale)\s*$/i;
  const toTranslate = [];
  for (const s of sections) {
    const byStatus = DONE.test(s.statusLine);
    const bySuperseded = supersededTargets.has(s.header);
    if (byStatus || bySuperseded) {
      s.reason = byStatus ? `status ${s.statusLine.replace(/^\s*\*\*Status:\*\*\s*/i, '').trim()}` : 'declared superseded';
      toTranslate.push(s);
    }
  }

  // Candidates: an entry that has a NEWER sibling in the same domain looks superseded.
  // REPORTED ONLY, never moved — domain similarity is a heuristic and a newer entry does
  // not mean an older constraint stopped binding. An owner promotes with --promote.
  //
  // Direction matters: the first version asked "does this entry have older siblings?",
  // which flagged the NEWEST entry in a domain and reported `newer: 0` — exactly the
  // inverse of the intended signal. Caught by reading the dry-run output, not by the
  // exit code.
  const selected = new Set(toTranslate.map((s) => s.header));
  for (const s of sections) {
    if (selected.has(s.header)) continue;
    const newerCount = sections.filter((o) =>
      o.domain === s.domain && o.date && s.date && o.date > s.date).length;
    if (newerCount > 0) {
      result.candidates.push({
        header: s.header.slice(0, 78), domain: s.domain, date: s.date,
        newer: newerCount,
        promote_with: `node .agents/scripts/orchestrator_state.js flush-decisions --promote "<header>"`
      });
    }
  }

  // Populated BEFORE the dry-run early return. It used to be set only on the live path,
  // so `--dry-run` reported `translated: []` even when it had found entries — a report
  // that understates what the next real run would do. Same failure shape as the archive
  // block-scoping bug: correct behaviour, dishonest output.
  result.wouldTranslate = toTranslate.length;
  result.pending = toTranslate.map((s) => ({ header: s.header.slice(0, 78), reason: s.reason }));

  if (dryRun || toTranslate.length === 0) {
    result.activeAfter = result.activeBefore - toTranslate.length;
    return result;
  }

  // Move each translated entry into lessons-learned.md as a LESSON, not a verbatim
  // decision. Framing matters: the value changes from "this is the standing choice" to
  // "this is what we decided, and here is what it produced".
  let lessons = fs.existsSync(lessonsPath) ? fs.readFileSync(lessonsPath, 'utf8') : '# Lessons Learned\n';
  const consume = new Set();
  const added = [];
  for (const s of toTranslate) {
    const titleMatch = s.header.match(/^\[([A-Z ]+?)\]\s*(.*?)(?:\s*\[date:|$)/);
    const domain = titleMatch ? titleMatch[1].trim() : s.domain;
    const title = titleMatch ? titleMatch[2].trim() : s.header;
    const bodyText = s.body.slice(1).join('\n').replace(/\*\*Status:\*\*.*$/m, '').trim();
    if (lessons.includes(title)) { consume.add(s.header); continue; } // already recorded
    const lesson =
      `\n### [LESSON] ${title} [date: ${s.date || 'unknown'}] [agent: @memory-controller]\n` +
      `**Decision:** ${s.reason}. Originally a [${domain}] entry in active-decisions.md.\n\n` +
      `${bodyText}\n` +
      `**Status:** active\n**Session:** flush-decisions\n`;
    lessons += lesson;
    added.push(s.header);
    consume.add(s.header);
  }

  if (added.length > 0) {
    // Atomic: a crash mid-write must leave the existing lessons file intact, never a
    // truncated one. Same reason active-decisions.md below uses the atomic helper.
    atomicWriteFileSync(lessonsPath, lessons, 'utf8');
    // Remove from active-decisions.md — from the bottom up so earlier indexes stay valid.
    const drop = new Set();
    for (const s of toTranslate) {
      if (!consume.has(s.header)) continue;
      for (let i = s.start; i < s.end; i++) drop.add(i);
    }
    const kept = lines.filter((_, i) => !drop.has(i)).join('\n').replace(/\n{3,}/g, '\n\n');
    atomicWriteFileSync(decisionsPath, kept, 'utf8');
    result.translated = added;
  }
  result.activeAfter = sections.length - toTranslate.length;
  return result;
}

// Compaction is a read-modify-write of active-decisions.md: it snapshots the file, then
// rewrites it. Without memory.lock, an append that lands inside that window is silently
// overwritten. The lock is acquired HERE, not at the CLI layer, so every caller
// (advance, set-phase, compact, and any future one) is covered.
function compactActiveDecisions() {
  return withLock(MEMORY_LOCK, compactActiveDecisionsUnlocked);
}

function compactActiveDecisionsUnlocked() {
  const memoryDir = path.join(process.cwd(), 'artifacts', 'memory');
  const decisionsPath = path.join(memoryDir, 'active-decisions.md');
  const archiveDir = path.join(memoryDir, 'archive');
  const archiveNdjson = path.join(archiveDir, 'index.ndjson');

  if (!fs.existsSync(decisionsPath)) return { compacted: false, count: 0, tokens: 0, underBudget: true };

  const content = fs.readFileSync(decisionsPath, 'utf8');
  const lines = content.split('\n');
  const activeSections = [];
  const archivedSections = [];
  const headerLines = [];
  let currentSection = null;
  // Hoisted so the return statement can report them. See the note at the return.
  let newlyArchived = 0;
  let duplicatesSkipped = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('### ') || line.startsWith('## AD-')) {
      if (currentSection) {
        if (currentSection.isInactive) {
          archivedSections.push(currentSection);
        } else {
          activeSections.push(currentSection);
        }
      }
      currentSection = {
        header: line.trim(),
        lines: [line],
        isInactive: false,
        // Recency is read off the section's own header, not the file mtime, so a
        // re-append or a bulk edit cannot silently make a fresh decision look old.
        date: extractSectionDate(line)
      };
    } else if (currentSection) {
      currentSection.lines.push(line);
      const trimmed = line.trim().toLowerCase();
      if (
        trimmed.includes('**status:** resolved') ||
        trimmed.includes('**status:** superseded') ||
        trimmed.includes('**status:** archived') ||
        trimmed.includes('**status:** complete') ||
        trimmed.includes('**status:** stale')
      ) {
        currentSection.isInactive = true;
      }
    } else {
      headerLines.push(line);
    }
  }

  if (currentSection) {
    if (currentSection.isInactive) {
      archivedSections.push(currentSection);
    } else {
      activeSections.push(currentSection);
    }
  }

  // AGE-BASED RETIREMENT. After the manual-status pass above, anything still active but
  // older than RETENTION_DAYS moves to the archive too. This is the trigger that was
  // missing: with 120 entries all marked `active` and none ever resolved, the manual
  // path alone archived nothing and the file grew without bound.
  //
  // Retirement is NOT deletion and NOT a claim that a decision was wrong. The full
  // section text is written to the quarterly shard and indexed in index.ndjson, so
  // `/memory` still finds it. `retiredByAge` is recorded so a future reader can tell an
  // aged-out entry from one a human deliberately superseded.
  //
  // Undated sections are NEVER auto-retired. If an entry carries no parseable date we
  // cannot claim it is stale, and guessing would silently drop live decisions. Those stay
  // and are counted in `undatedRetained` so the condition is visible.
  const nowForAge = new Date();
  const agedOut = [];
  const stillActive = [];
  for (const s of activeSections) {
    const age = ageInDays(s.date, nowForAge);
    if (Number.isFinite(age) && age > RETENTION_DAYS) {
      s.retiredByAge = true;
      agedOut.push(s);
    } else {
      stillActive.push(s);
    }
  }
  for (const s of agedOut) archivedSections.push(s);
  activeSections.length = 0;
  activeSections.push(...stillActive);

  // If there are inactive sections, shard them into archive/
  if (archivedSections.length > 0) {
    if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3) + 1;
    const shardFile = path.join(archiveDir, `${now.getFullYear()}-Q${q}-archive.md`);

    // DEDUPE AGAINST WHAT IS ALREADY SHARDED (2026-10-05).
    //
    // Measured on this repo: 51 sections appeared TWICE in the archive shard and 54 titles
    // appeared 2-3x in index.ndjson. Cause: the shard was append-only with no identity
    // check, so retiring an entry, then re-running compaction over a file that still
    // contained it (or a manual re-run before the source file had been rewritten), appended
    // the same decision again. Retirement is supposed to be idempotent — once archived,
    // an entry must never be written twice.
    //
    // Identity = the section's header text with whitespace normalised. Header text is
    // stable for a given decision and does not depend on the entry's body.
    const normaliseHeader = (h) => String(h).replace(/\s+/g, ' ').trim();
    const alreadyArchived = new Set();
    if (fs.existsSync(shardFile)) {
      for (const line of fs.readFileSync(shardFile, 'utf8').split('\n')) {
        if (line.startsWith('### ') || line.startsWith('## AD-')) {
          alreadyArchived.add(normaliseHeader(line));
        }
      }
    }
    // Same guard for the ndjson index, which is searched by /memory.
    const alreadyIndexed = new Set();
    if (fs.existsSync(archiveNdjson)) {
      for (const line of fs.readFileSync(archiveNdjson, 'utf8').split('\n')) {
        if (!line.trim()) continue;
        try { alreadyIndexed.add(normaliseHeader(JSON.parse(line).header || '')); } catch { /* header line */ }
      }
    }

    const fresh = archivedSections.filter(s => {
      const key = normaliseHeader(s.header);
      if (alreadyArchived.has(key)) return false;
      alreadyArchived.add(key);
      return true;
    });
    const duplicatesSkippedRun = archivedSections.length - fresh.length;
    newlyArchived = fresh.length;
    duplicatesSkipped = duplicatesSkippedRun;

    const shardEntries = fresh.map(s => s.lines.join('\n').trim()).join('\n\n---\n\n');
    if (fresh.length > 0) {
      if (!fs.existsSync(shardFile)) {
        const shardHeader = `# Memory Archive (${now.getFullYear()} Q${q})\n\n`;
        atomicWriteFileSync(shardFile, shardHeader + shardEntries + '\n', 'utf8');
      } else {
        fs.appendFileSync(shardFile, '\n\n---\n\n' + shardEntries + '\n', 'utf8');
      }
    }

    // Append to index.ndjson — from `fresh` only, so a repeated compaction cannot
    // re-index an entry that is already in the shard.
    for (const s of fresh) {
      const headerText = s.header.replace(/^#{2,3}\s+/, '');
      const idMatch = headerText.match(/\[([A-Z]+)\]\s*([^[]+)/) || headerText.match(/(AD-\d{4}-\d{2}-\d{2})\s*—?\s*(.*)/);
      const domain = idMatch ? idMatch[1] : 'DECISION';
      const title = idMatch ? (idMatch[2] || '').trim() : headerText;
      const dateMatch = headerText.match(/\[date:\s*(\d{4}-\d{2}-\d{2})\]/) || headerText.match(/(20\d{2}-\d{2}-\d{2})/);
      const date = dateMatch ? dateMatch[1] : now.toISOString().split('T')[0];
      const entryObj = {
        id: `ARCH-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        // header is the dedupe key /memory reads back. Without it, an entry could be
        // re-indexed on every run because title is truncated to 80 chars.
        header: s.header,
        title: title.slice(0, 80),
        domain,
        keywords: [domain.toLowerCase(), ...title.toLowerCase().split(/\s+/).filter(w => w.length > 2)],
        date,
        status: 'superseded',
        summary: s.lines.slice(1, 4).join(' ').trim().slice(0, 200),
        location: `archive/${now.getFullYear()}-Q${q}-archive.md`,
        archived_by: '@orchestrator',
        archived_on: now.toISOString().split('T')[0]
      };
      if (!fs.existsSync(archiveNdjson)) {
        const ndHeader = JSON.stringify({ schema_version: '1.0', created: date, last_updated: date }) + '\n';
        atomicWriteFileSync(archiveNdjson, ndHeader + JSON.stringify(entryObj) + '\n', 'utf8');
      } else {
        fs.appendFileSync(archiveNdjson, JSON.stringify(entryObj) + '\n', 'utf8');
      }
    }

    const newHeader = headerLines.join('\n').trim() || '# Active Decisions\n\nCritical active design choices and architectural constraints for Vespyr development.';
    const newBody = activeSections.map(s => s.lines.join('\n').trim()).join('\n\n---\n\n');
    const newContent = newHeader + '\n\n---\n\n' + newBody + '\n';
    atomicWriteFileSync(decisionsPath, newContent, 'utf8');
  }

  const finalContent = fs.existsSync(decisionsPath) ? fs.readFileSync(decisionsPath, 'utf8') : '';
  const tokens = countTokens(finalContent);

  return {
    compacted: archivedSections.length > 0,
    // `archivedCount` is what the caller cares about: how many entries left the loaded file.
    archivedCount: archivedSections.length,
    // Reported separately so a repeat run is visible instead of looking like new work.
    // Hoisted out of the `if` block: these were originally `const` inside it, so the
    // `typeof x !== 'undefined'` guard below always took the fallback branch and reported
    // `archivedSections.length` — which made a fully-deduped run indistinguishable from
    // new work. The archive was correct; only the report lied.
    newlyArchived,
    duplicatesSkipped,
    activeCount: activeSections.length,
    tokens,
    underBudget: tokens <= ACTIVE_DECISIONS_TOKEN_BUDGET
  };
}

// Canonical phase order — single source of truth: .agents/references/phase-table.md.
// 11 phases: Validation (Phase -1, pre-phase gate, no folder) + folder phases 0-9.
/**
 * Token budget for artifacts/memory/active-decisions.md, checked by compaction and
 * enforced as a precondition for `advance` / `set-phase`.
 *
 * WHY A NAMED CONSTANT AND NOT A LITERAL. The budget was a bare `400` hardcoded in four
 * places (the check plus three error payloads). Nothing in `.agents/references/` explained
 * what it was for, so when it wedged the pipeline nobody could tell whether to raise it or
 * to compact the file — which is exactly what happened: `advance` and `set-phase` both
 * failed with OVER_BUDGET for weeks against a 47,548-token file, and the 400 was simply
 * wrong for any real corpus. A gate nobody can reason about is a gate nobody maintains.
 *
 * WHAT 2500 BUYS. The owner's stated model: keep active-decision HISTORY findable, and let
 * the loaded file hold only the most recent live decisions. Measured on this repo, ~1,900
 * tokens is the floor — the file header plus the current and previous decision sections,
 * which is the minimum that leaves an agent the decision in flight and the one before it.
 * That leaves ~600 tokens of headroom for a third section, so the common case (two or three
 * live decisions) loads without tripping the gate, and a fourth triggers compaction.
 *
 * This is a HEADROOM budget, not a target. Compact before you hit it; do not treat the
 * ceiling as a quota to fill.
 */
const ACTIVE_DECISIONS_TOKEN_BUDGET = 2500;

// Canonical phase order — single source of truth: .agents/references/phase-table.md.
const PHASE_ORDER = [
  'validation', 'discovery', 'research', 'strategy', 'architecture',
  'planning', 'execution', 'launch', 'iteration', 'documentation', 'retro'
];

function ensureDir() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Parse sprint-status.yaml into a state-compatible object.
// This is a lightweight parser for the known YAML schema — no external deps.
function readYaml() {
  if (!fs.existsSync(YAML_STATE)) return null;
  try {
    const raw = fs.readFileSync(YAML_STATE, 'utf8');
    const lines = raw.split('\n');
    const state = {
      project: { name: '', type: '' },
      created_at: null,
      last_updated: null,
      current_phase: 'discovery',
      phases: {},
      artifacts: {},
      change_requests: [],
      blockers: [],
      stories: {},
      history: []
    };

    let section = null; // 'phases' | 'stories'
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || trimmed === '') continue;

      // Top-level scalar fields
      if (trimmed.startsWith('generated:')) {
        state.created_at = trimmed.split(':').slice(1).join(':').trim();
      } else if (trimmed.startsWith('last_updated:')) {
        state.last_updated = trimmed.split(':').slice(1).join(':').trim();
      } else if (trimmed.startsWith('project:') && !trimmed.startsWith('project_key:')) {
        state.project.name = trimmed.split(':').slice(1).join(':').trim();
        state.name = state.project.name;
      } else if (trimmed.startsWith('phase:')) {
        state.current_phase = trimmed.split(':').slice(1).join(':').trim();
        state.phase = state.current_phase;
      } else if (trimmed === 'phases:') {
        section = 'phases';
      } else if (trimmed === 'stories:') {
        section = 'stories';
      } else if (section && line.startsWith('  ') && trimmed.includes(':')) {
        const [key, ...valParts] = trimmed.split(':');
        const val = valParts.join(':').trim();
        if (section === 'phases') {
          state.phases[key.trim()] = { status: val, started_at: null, completed_at: null, agents: [] };
        } else if (section === 'stories') {
          state.stories[key.trim()] = val;
        }
      }
    }
    return state;
  } catch (e) {
    return null;
  }
}

/**
 * Reconcile the state's phases map with PHASE_ORDER.
 *
 * WHY THIS EXISTS. Measured on the live repo: `current_phase` was "validation" while
 * the phases map held only the other 10 keys — no `validation` entry at all. Three
 * silent failures followed, none of which raised an error:
 *
 *   1. syncYaml() renders the phases block by iterating the map, so the ACTIVE phase was
 *      simply absent. sprint-status.yaml read like a complete 11-phase board with every
 *      phase `pending`, while the one phase actually in flight was missing from it.
 *      That is worse than a visible gap: the mirror looked authoritative and was wrong.
 *   2. advance() marks the current phase complete behind an `if (state.phases[current])`
 *      guard, so advancing out of a keyless phase silently discarded its completion
 *      record — `completed_at` stayed null forever.
 *   3. Nothing warned. The JSON parsed fine; every command exited 0.
 *
 * A state file can also be rebuilt from the YAML mirror by readYaml() after the JSON is
 * lost, and that path reproduces exactly this shape, so the condition is reachable
 * without any phase ever being advanced.
 *
 * Idempotent, and never clobbers an existing entry: missing keys are backfilled as
 * `pending`, and only a `pending` current phase is promoted to `in-progress`. Existing
 * statuses, timestamps and agent lists are left untouched.
 */
function normalizePhases(state) {
  if (!state.phases || typeof state.phases !== 'object') state.phases = {};
  for (const p of PHASE_ORDER) {
    if (!state.phases[p]) {
      state.phases[p] = { status: 'pending', started_at: null, completed_at: null, agents: [] };
    } else if (typeof state.phases[p] === 'string') {
      // Tolerate the lossy string form the YAML mirror can carry.
      state.phases[p] = { status: state.phases[p], started_at: null, completed_at: null, agents: [] };
    }
  }
  const current = resolveCurrentPhase(state);
  const entry = state.phases[current];
  // Only a pending current phase is promoted. A `complete` current phase is left alone:
  // that is a real state meaning "finished, awaiting advance", and silently rewriting it
  // would hide the need to advance.
  if (entry && entry.status === 'pending') {
    entry.status = 'in-progress';
    entry.started_at = entry.started_at || new Date().toISOString();
  }
  return state;
}

function readState() {
  // Source of truth: pipeline-state.json (full state). The YAML mirror is
  // lossy (no artifacts/history/change_requests), so it must never be the
  // primary read source — otherwise every writeState() round-trip would
  // wipe data written by `complete` and `session-write`.
  if (fs.existsSync(STATE_FILE)) {
    try {
      return normalizePhases(JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')));
    } catch (e) {
      // Corrupt JSON: fall through to YAML mirror, then auto-init.
    }
  }
  const yamlState = readYaml();
  if (yamlState) return normalizePhases(yamlState);
  if (!fs.existsSync(STATE_FILE)) {
    // Auto-initialize if missing, to prevent "No pipeline state found" errors.
    try {
      const name = path.basename(process.cwd());
      const state = createInitialState(name, 'startup');
      writeState(state);
      
      // Pre-create project-context.md under artifacts/memory/
      const memoryDir = path.join(process.cwd(), 'artifacts', 'memory');
      if (!fs.existsSync(memoryDir)) {
        fs.mkdirSync(memoryDir, { recursive: true });
      }
      const projectContextFile = path.join(memoryDir, 'project-context.md');
      if (!fs.existsSync(projectContextFile)) {
        const content = `# Project Context\n\n## [CORE]\nProject: ${name} (startup)\nStack: None\nPhase: ${state.current_phase}\nSprint: none\nBlockers: 0\n\n## [IDENTITY]\nUser Nickname: User\n`;
        atomicWriteFileSync(projectContextFile, content, 'utf8');
      }
      return state;
    } catch (e) {
      return null;
    }
  }
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeState(state) {
  ensureDir();
  writeJsonSync(STATE_FILE, state, 2);
  syncYaml(state);
}

// Sync pipeline state to sprint-status.yaml (human-readable mirror)
const YAML_STATE = path.join(OUTPUT_DIR, 'sprint-status.yaml');

function syncYaml(state) {
  const name = (state.project && state.project.name) || state.name || '';
  const phase = state.current_phase || state.phase || PHASE_ORDER[0];
  const yaml = [
    '# artifacts/output/sprint-status.yaml',
    `generated: ${state.created_at ? state.created_at.split('T')[0] : new Date().toISOString().split('T')[0]}`,
    `last_updated: ${new Date().toISOString().split('T')[0]}`,
    `project: ${name}`,
    `project_key: ${name.toLowerCase().replace(/\s+/g, '-')}`,
    'tracking_system: file-system',
    `phase: ${phase}`,
    '',
    '# Phase-level status',
    'phases:',
  ];
  // PHASE_ORDER, not map insertion order — same reason as printDashboard. Emitting the
  // whole canonical order also guarantees the mirror can never omit a phase again.
  for (const p of PHASE_ORDER) {
    const v = (state.phases || {})[p];
    const status = typeof v === 'string' ? v : (v ? (v.status || 'pending') : 'pending');
    yaml.push(`  ${p}: ${status}`);
  }
  yaml.push('');
  yaml.push('# Story-level status (when in development)');
  yaml.push('stories:');
  if (state.stories && Object.keys(state.stories).length > 0) {
    for (const [id, v] of Object.entries(state.stories)) {
      const status = typeof v === 'string' ? v : (v.status || v);
      yaml.push(`  ${id}: ${status}`);
    }
  } else {
    yaml.push('  # US-001-feature-name: done');
  }
  yaml.push('');
  writeYaml(yaml);
}

// Best-effort write of sprint-status.yaml; never blocks orchestration on write failure.
// Symmetric with readYaml() — readYaml parses YAML_STATE, writeYaml persists it.
function writeYaml(lines) {
  try {
    atomicWriteFileSync(YAML_STATE, lines.join('\n'), 'utf8');
  } catch (e) {
    // YAML sync is best-effort; don't block on write failure
  }
}

// Markdown dashboard for 'status' command (DNA 6: tables, not ASCII boxes)
function printDashboard(state) {
  const icon = (s) => s === 'done' ? '✅' : s === 'in-progress' ? '▶️' : s === 'pending' ? '·' : '·';
  const name = (state.project && state.project.name) || state.name || 'unnamed';
  const phase = resolveCurrentPhase(state);
  console.log(`\n## Project: ${name}`);
  console.log(`**Active phase:** ${phase}\n`);
  console.log(`| Phase | Status |`);
  console.log(`|---|---|`);
  // Render in PHASE_ORDER, not map insertion order. A phase backfilled by
  // normalizePhases() is appended last, which put `validation` — the FIRST phase —
  // at the bottom of the board. A pipeline board that does not read in pipeline order
  // is a list, not a pipeline.
  for (const p of PHASE_ORDER) {
    const v = state.phases ? state.phases[p] : null;
    const s = typeof v === 'string' ? v : (v ? (v.status || 'pending') : 'pending');
    console.log(`| ${icon(s)} ${p} | ${s} |`);
  }
  console.log('');
}

// Markdown dashboard for 'next' command
function printNextDashboard(state, action) {
  printDashboard(state);
  const current = resolveCurrentPhase(state);
  const phaseObj = state.phases[current];
  const status = phaseObj ? (typeof phaseObj === 'string' ? phaseObj : (phaseObj.status || 'pending')) : 'pending';
  console.log(`**Current phase:** ${current}`);
  console.log(`**Phase status:** ${status}\n`);
  if (action.action === 'generate-artifacts' && (action.artifacts || action.missing)) {
    console.log(`**Action needed:** generate artifacts\n`);
    for (const a of (action.artifacts || action.missing)) {
      console.log(`- ${a}`);
    }
    console.log('');
  } else if (action.action === 'advance-phase') {
    console.log(`**Next phase:** ${action.to || 'unknown'}\n`);
  }
  if (action.recommendations) {
    console.log(`### Recommendations\n`);
    for (const r of action.recommendations) {
      console.log(`- ${r}`);
    }
    console.log('');
  }
}

// Best-effort token estimate from file content via canonical countTokens().
// Used only when the caller does not supply --tokens.
// Single canonical estimator. recordSpanForAgent and estimateTokensFromFile
// must both call countTokens() — no len/4, no floor-8.
function estimateTokensFromFile(absPath) {
  try {
    if (!fs.existsSync(absPath)) return 0;
    const content = fs.readFileSync(absPath, 'utf8');
    return Math.max(1, countTokens(content));
  } catch (e) {
    return 0;
  }
}

// Auto-record a telemetry event. Never throws — telemetry must not block orchestration.
function recordTelemetry(eventType, fields) {
  const telemetryScript = path.join(__dirname, 'swarm_telemetry.js');
  if (!fs.existsSync(telemetryScript)) return;
  try {
    if (!fs.existsSync(TELEMETRY_DIR)) fs.mkdirSync(TELEMETRY_DIR, { recursive: true });
    const args = [telemetryScript, 'record', '--type', String(eventType)];
    if (fields.agent) args.push('--agent', String(fields.agent));
    if (fields.phase) args.push('--phase', String(fields.phase));
    if (fields.data) args.push('--data', JSON.stringify(fields.data));
    require('child_process').execFileSync(process.execPath, args, { stdio: 'ignore' });
  } catch (e) {
    // Silent fail
  }
}

// 02l Option A: also emit minimal OTel span via direct recordSpan (hybrid exactness).
// Never throws; cost nullable, estimated flag derived from presence of prompt/completion.
// Now computes real RQS-D via biomarkers when artifact exists, renders thin scorecard, and checks Tier B guard.
function recordSpanForAgent(agent, phase, tokens, durationMs, artifact) {
  try {
    const crypto = require('crypto');
    const traceId = process.env.VESPYR_TRACE_ID || (crypto.randomUUID ? crypto.randomUUID() : 'trace-' + Date.now());
    const spanId = crypto.randomUUID ? crypto.randomUUID() : 'span-' + Date.now() + '-' + Math.random();
    const hasExact = tokens != null && tokens > 0 && durationMs != null;
    // Real token fallback: countTokens() on artifact file content when tokens missing (not just name)
    let estTokens = tokens;
    let artifactText = null;
    if (artifact) {
      try {
        const p = path.isAbsolute(artifact) ? artifact : path.join(process.cwd(), artifact);
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          artifactText = fs.readFileSync(p, 'utf8');
        }
      } catch {}
    }
    if (!hasExact) {
      const fallback = artifactText ? countTokens(artifactText) : 0;
      estTokens = tokens && tokens > 0 ? tokens : Math.max(1, fallback);
    }
    const usage = hasExact ? { prompt_tokens: Math.floor(tokens*0.6), completion_tokens: Math.ceil(tokens*0.4), total_tokens: tokens, cost_usd: null, estimated: false } : { prompt_tokens: 0, completion_tokens: 0, total_tokens: estTokens, cost_usd: null, estimated: true };
    // Compute real RQS-D when artifact text available via biomarkers (02l §3.1), else fallback 0.9
    let rqsD = 0.9, biomarkers = { scr: 1, msha: 1, placeholder_density: 0, pci: 0, ac_testability: 1, srsr: null, scope_drift: null }, rating = 'PASS', tier0Checks = [];
    try {
      const { computeRQSDWithDetails } = require('../../tools/eval/lib/biomarkers');
      if (artifactText) {
        const r = computeRQSDWithDetails(artifactText, {});
        rqsD = r.rqs_d_score;
        biomarkers = r.biomarkers;
        rating = r.rating;
        tier0Checks = r.checks || [];
      }
    } catch {}
    const span = {
      trace_id: traceId,
      span_id: spanId,
      parent_span_id: process.env.VESPYR_PARENT_SPAN_ID || null,
      timestamp: new Date().toISOString(),
      session_id: process.env.VESPYR_SESSION_ID || 'local',
      workflow: phase || 'unknown',
      agent_persona: agent || 'unknown',
      model: { provider: 'unknown', model_id: process.env.VESPYR_MODEL_ID || 'unknown', temperature: 0 },
      usage,
      duration_ms: durationMs || 0,
      quality_scorecard: { rqs_d_score: rqsD, rqs_j_score: null, rating, biomarkers },
      tier0_evaluation: { executed: tier0Checks.length>0, passed: rqsD>=0.85, checks: tier0Checks },
      error: null
    };
    // Tier B guard (INV-TEL-05) — audit tag, not a span block: demotions are
    // recorded as span.error TIER_DEMOTION and `swarm_telemetry.js verify`
    // fails closed on them (tier_pass:false → exit 2). Standalone guard
    // exit 2 alone never blocked releases; wire CI to the verify gate.
    try {
      const { checkTier } = require('../../tools/telemetry/modelTierGuards');
      const chk = checkTier(agent, process.env.VESPYR_MODEL_ID || span.model.model_id);
      if (chk.warning) span.error = { code: chk.code, message: chk.message };
    } catch {}
    const swarm = require('./swarm_telemetry.js');
    if (swarm && typeof swarm.recordSpan === 'function') swarm.recordSpan(span);
    // Thin scorecard auto-render (DoD §9.2) — console.log after every invocation (visible, not silent)
    try {
      const { renderRQScorecard } = require('../../tools/telemetry/telemetry_display');
      const card = renderRQScorecard({ rqs_d_score: rqsD, agent_persona: agent, workflow: phase, model: span.model, duration_ms: durationMs||0, usage, biomarkers, artifact, estimated: usage.estimated });
      console.log(card);
    } catch {}
  } catch (e) {}
}

function createInitialState(name, type) {
  const defaultPhases = {
    validation: { status: 'pending', started_at: null, completed_at: null, agents: ['founder'] },
    discovery: { status: 'pending', started_at: null, completed_at: null, agents: ['researcher', 'user-researcher'] },
    research: { status: 'pending', started_at: null, completed_at: null, agents: ['researcher', 'user-researcher'] },
    strategy: { status: 'pending', started_at: null, completed_at: null, agents: ['product-manager', 'product-designer'] },
    architecture: { status: 'pending', started_at: null, completed_at: null, agents: ['architect'] },
    planning: { status: 'pending', started_at: null, completed_at: null, agents: ['tech-lead'] },
    execution: { status: 'pending', started_at: null, completed_at: null, agents: ['developer', 'code-reviewer', 'qa-engineer'] },
    launch: { status: 'pending', started_at: null, completed_at: null, agents: ['devops-engineer', 'product-manager'] },
    iteration: { status: 'pending', started_at: null, completed_at: null, agents: ['product-manager', 'data-analyst'] },
    documentation: { status: 'pending', started_at: null, completed_at: null, agents: ['technical-writer'] },
    retro: { status: 'pending', started_at: null, completed_at: null, agents: ['product-manager'] }
  };

  let startPhase = PHASE_ORDER[0];
  for (const phaseKey of PHASE_ORDER) {
    if (defaultPhases[phaseKey].status !== 'complete') {
      startPhase = phaseKey;
      break;
    }
  }

  return {
    project: { name, type },
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    current_phase: startPhase,
    phases: defaultPhases,
    artifacts: {},
    change_requests: [],
    blockers: [],
    history: []
  };
}

function getPhaseArtifacts(phase) {
  // Canonical artifact maps sourced from .agents/references/phase-table.md and
  // .agents/workflow.md §2 Handoff Contracts. Phases without a canonical map
  // (execution, documentation) are intentionally omitted so validatePhaseArtifacts
  // warns instead of vacuously passing — see validatePhaseArtifacts().
  const artifactMap = {
    validation: [
      { name: 'idea-brief.md', path: '01-discovery/idea-brief.md', required: true, fallbackPath: '01-discovery/validation-brief.md', fallbackName: 'validation-brief.md' }
    ],
    discovery: [
      { name: 'idea-brief.md', path: '01-discovery/idea-brief.md', required: true, fallbackPath: '01-discovery/validation-brief.md', fallbackName: 'validation-brief.md' }
    ],
    research: [
      { name: 'market-analysis.md', path: '02-research/market-analysis.md', required: true },
      { name: 'competitive-analysis.md', path: '02-research/competitive-analysis.md', required: true },
      { name: 'user-personas.md', path: '02-research/user-personas.md', required: true }
    ],
    strategy: [
      { name: 'requirements.md', path: '03-strategy/requirements.md', required: true },
      { name: 'user-stories.md', path: '03-strategy/user-stories.md', required: true },
      { name: 'product-spec.md', path: '03-strategy/product-spec.md', required: true }
    ],
    // workflow.md §2: @architect → @tech-lead requires ADRs in 04-architecture/
    // ("Must contain data model, API contracts, and tech stack decision").
    // ADRs are numbered (adr-NNN-short-name.md) — check the directory glob.
    architecture: [
      { name: 'adr-*.md', dir: '04-architecture', glob: /^adr-.*\.md$/, required: true }
    ],
    planning: [
      { name: 'execution-plan.md', path: '05-planning/execution-plan.md', required: true },
      { name: 'change-requests.md', path: '05-planning/change-requests.md', required: false }
    ],
    // execution: gate is "all tests green" (workflow.md §2 Quality Gates → Launch);
    // code/tests live in src/ — no canonical artifact file, validated via warning.
    launch: [
      { name: 'go-nogo-decision.md', path: '06-launch/go-nogo-decision.md', required: true },
      { name: 'post-launch-report.md', path: '06-launch/post-launch-report.md', required: true }
    ],
    iteration: [
      { name: 'iteration-results.md', path: '07-iteration/iteration-results.md', required: true }
    ],
    // documentation: cross-cutting (phase-table.md Phase 8, "Docs current") —
    // no canonical artifact path, validated via warning.
    retro: [
      { name: 'action-items.md', path: '09-retro/action-items.md', required: true }
    ]
  };
  return artifactMap[phase] || [];
}

function validatePhaseArtifacts(phase) {
  // Phases outside the canonical 11-phase model (e.g., legacy 4-phase names)
  // must never green-light. Report the phase as invalid.
  if (!PHASE_ORDER.includes(phase)) {
    return {
      allPresent: false,
      checked: 0,
      artifacts: [],
      warning: `'${phase}' is not a canonical phase. Valid phases: ${PHASE_ORDER.join(', ')}`
    };
  }

  const artifacts = getPhaseArtifacts(phase);

  // Canonical phase without a sourced artifact map: warn instead of a
  // vacuous green pass. checked: 0 tells callers nothing was validated.
  if (artifacts.length === 0) {
    return {
      allPresent: false,
      checked: 0,
      artifacts: [],
      warning: `No canonical artifact map for phase '${phase}' (see .agents/references/phase-table.md). Validation skipped — not a green pass.`
    };
  }

  const results = [];
  let allPresent = true;

  for (const art of artifacts) {
    let fullPath = null;
    let exists = false;
    let name = art.name;
    let actualPath = art.path || (art.dir ? `${art.dir}/${art.name}` : null);

    if (art.glob) {
      // Directory-level canonical artifact (e.g., ADRs in 04-architecture/):
      // at least one file matching the glob must exist.
      const dir = path.join(OUTPUT_DIR, art.dir || '');
      if (fs.existsSync(dir)) {
        const matches = fs.readdirSync(dir).filter(f => art.glob.test(f));
        if (matches.length > 0) {
          fullPath = path.join(dir, matches[0]);
          exists = true;
          actualPath = `${art.dir}/${matches[0]}`;
        }
      }
    } else {
      fullPath = path.join(OUTPUT_DIR, art.path);
      exists = fs.existsSync(fullPath);

      if (!exists && art.fallbackPath) {
        const fallbackFullPath = path.join(OUTPUT_DIR, art.fallbackPath);
        if (fs.existsSync(fallbackFullPath)) {
          fullPath = fallbackFullPath;
          exists = true;
          name = art.fallbackName;
          actualPath = art.fallbackPath;
        }
      }
    }

    if (!exists && art.required) allPresent = false;

    let version = null;
    if (exists) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const versionMatch = content.match(/\*\*Version:\*\*\s*(\d+)/);
      version = versionMatch ? parseInt(versionMatch[1], 10) : null;
    }

    results.push({
      name: name,
      path: actualPath,
      required: art.required,
      exists,
      version
    });
  }

  return { allPresent, checked: results.length, artifacts: results };
}

// Resolve the effective current phase. `state.current_phase` may be absent or
// reference a phase that is not a key in `state.phases` (e.g., a legacy
// 4-phase name against the canonical 11-phase map). When that happens, derive
// the current phase from the phases map: first canonical phase that is not
// pending, else the first canonical phase present in the map.
function resolveCurrentPhase(state) {
  const explicit = state.current_phase || state.phase || '';
  const phaseKeys = Object.keys(state.phases || {});
  if (explicit && phaseKeys.includes(explicit)) return explicit;
  if (explicit && PHASE_ORDER.includes(explicit)) return explicit;
  // Prefer the first phase that is actually in progress: a completed phase must
  // never shadow an in-progress phase when current_phase is absent/stale.
  for (const p of PHASE_ORDER) {
    const v = state.phases[p];
    const status = typeof v === 'string' ? v : (v ? v.status : '');
    if (status === 'in-progress' || status === 'active') return p;
  }
  for (const p of PHASE_ORDER) {
    const v = state.phases[p];
    const status = typeof v === 'string' ? v : (v ? v.status : '');
    if (status && status !== 'pending') return p;
  }
  for (const p of PHASE_ORDER) {
    const v = state.phases[p];
    const status = typeof v === 'string' ? v : (v ? v.status : '');
    if (!status || status === 'pending') return p;
  }
  return PHASE_ORDER[0];
}

function determineNextAction(state) {
  const currentPhase = resolveCurrentPhase(state);
  const phaseIdx = PHASE_ORDER.indexOf(currentPhase);

  // Check for open change requests first
  const openCRs = state.change_requests.filter(cr => cr.status === 'OPEN');
  if (openCRs.length > 0) {
    return {
      action: 'resolve-cr',
      cr: openCRs[0],
      reason: `${openCRs.length} open change request(s) must be resolved before proceeding`
    };
  }

  // Check for blockers
  if (state.blockers.length > 0) {
    return {
      action: 'resolve-blocker',
      blocker: state.blockers[0],
      reason: 'Active blockers must be resolved before proceeding'
    };
  }

  // Validate current phase artifacts. Phases without a canonical artifact map
  // (checked === 0) cannot be validated here — fall through to the phase-status
  // guard below instead of blocking on a vacuous generate-artifacts action.
  const validation = validatePhaseArtifacts(currentPhase);
  if (validation.checked > 0 && !validation.allPresent) {
    const missing = validation.artifacts.filter(a => a.required && !a.exists);
    return {
      action: 'generate-artifacts',
      phase: currentPhase,
      missing: missing.map(a => a.name),
      reason: `Required artifacts missing for ${currentPhase} phase`
    };
  }

  // Only advance when the current phase is actually complete. A phase still
  // in-progress — e.g. an unmapped phase like execution, which has no artifact
  // gate and would otherwise fall through to advance — must not be skipped.
  // (Mapped phases are already gated by the generate-artifacts check above.)
  const phaseObj = state.phases[currentPhase];
  const currentStatus = typeof phaseObj === 'string' ? phaseObj : (phaseObj ? phaseObj.status : 'pending');
  if (currentStatus !== 'complete' && currentStatus !== 'done') {
    return {
      action: 'continue-phase',
      phase: currentPhase,
      reason: `${currentPhase} phase is ${currentStatus || 'unknown'}, not complete — continue work before advancing`
    };
  }

  // Current phase complete, advance to next non-complete phase
  if (phaseIdx >= 0 && phaseIdx < PHASE_ORDER.length - 1) {
    let nextPhaseIdx = phaseIdx + 1;
    while (nextPhaseIdx < PHASE_ORDER.length) {
      const nextPhase = PHASE_ORDER[nextPhaseIdx];
      const phaseObj = state.phases[nextPhase];
      const status = typeof phaseObj === 'string' ? phaseObj : (phaseObj ? phaseObj.status : 'pending');
      if (status !== 'complete') {
        return {
          action: 'advance-phase',
          from: currentPhase,
          to: nextPhase,
          reason: `${currentPhase} phase complete, ready for ${nextPhase}`
        };
      }
      nextPhaseIdx++;
    }
  }

  return {
    action: 'complete',
    reason: 'All phases complete'
  };
}

// CLI
const USAGE = `Usage:
  node orchestrator_state.js init --name "Project" --type startup
  node orchestrator_state.js status
  node orchestrator_state.js next
  node orchestrator_state.js advance
  node orchestrator_state.js set-phase --phase planning
  node orchestrator_state.js complete --agent founder --artifact idea-brief.md
  node orchestrator_state.js file-cr --from developer --to product-manager --target user-stories.md --issue "..."
  node orchestrator_state.js session-write --agent developer
  node orchestrator_state.js compact
  node orchestrator_state.js validate --phase planning
  node orchestrator_state.js --help | usage | -h`;

function mainDispatch(args) {
  const cmd = args[0];

  try {

    if (cmd === 'init') {
      let name = 'Untitled';
      let type = 'startup';
      ({ name, type: typeArg } = parseFlagArgs(args, ['--name', '--type'], [], 'begin'));
      if (typeArg) type = typeArg;
      const state = createInitialState(name, type);
      writeState(state);

      // Pre-create and write project-context.md if artifacts/memory/ exists
      const memoryDir = path.join(process.cwd(), 'artifacts', 'memory');
      const projectContextFile = path.join(memoryDir, 'project-context.md');
      if (fs.existsSync(memoryDir)) {
        let content = `# Project Context\n\n## [CORE]\nProject: ${name} (${type})\nStack: None\nPhase: ${state.current_phase}\nSprint: none\nBlockers: 0\n\n## [IDENTITY]\nUser Nickname: User\n`;
        atomicWriteFileSync(projectContextFile, content, 'utf8');
      }

      console.log(JSON.stringify({ success: true, project: name, type, state_file: STATE_FILE }));

      recordTelemetry('phase_transition', {
        phase: state.current_phase,
        data: { action: 'init', project: name, type }
      });

    }

    if (cmd === 'status') {
      const state = readState();
      if (!state) {
        console.log(JSON.stringify({ error: 'No pipeline state found. Run init first.' }));
        process.exit(1);
      }
      const useJson = args.includes('--json');
      if (useJson) {
        console.log(JSON.stringify(state, null, 2));
      } else {
        printDashboard(state);
      }
    }

    if (cmd === 'next') {
      const state = readState();
      if (!state) {
        console.log(JSON.stringify({
          action: 'init-required',
          reason: 'No pipeline state found. Project is uninitialized.'
        }));
        return;
      }
      const action = determineNextAction(state);
      const useJson = args.includes('--json');
      if (useJson) {
        console.log(JSON.stringify(action, null, 2));
      } else {
        printNextDashboard(state, action);
      }
    }

    if (cmd === 'complete') {
      let agent = null;
      let artifact = null;
      let tokens = null;
      let durationMs = null;
      let checkMemory = false;
      let nextStep = null;
      // Walk by ONE and consume a value only for flags that take one.
      //
      // This loop used to step by two, assuming every flag carries a value. That silently ate the
      // argument following any unrecognised flag: `complete --dry-run --agent x` lost `--agent`
      // entirely and reported "Missing --agent". Measured in a blind /launch run (2026-10-08).
      // A parser that eats its own arguments is how a flag ends up looking accepted while being
      // silently ignored -- the exact defect this pass has been removing everywhere else.
      const VALUE_FLAGS = new Set(['--agent', '--artifact', '--tokens', '--duration-ms', '--next']);
      let dryRun = false;
      for (let i = 1; i < args.length; i++) {
        const a = args[i];
        if (a === '--dry-run') { dryRun = true; continue; }
        if (a === '--check-memory') { checkMemory = true; continue; }
        if (VALUE_FLAGS.has(a)) {
          const v = args[i + 1];
          if (v === undefined) {
            console.error(`Missing value for ${a}`);
            process.exit(2);
          }
          i += 1;
          if (a === '--agent') agent = v;
          else if (a === '--artifact') artifact = v;
          else if (a === '--next') nextStep = v;
          else if (a === '--tokens') { const n = parseInt(v, 10); tokens = Number.isFinite(n) ? n : null; }
          else if (a === '--duration-ms') { const n = parseInt(v, 10); durationMs = Number.isFinite(n) ? n : null; }
          continue;
        }
        console.error(`Unknown flag for 'complete': ${a} (ignored)`);
      }
      if (!agent || !artifact) {
        console.error('Missing --agent or --artifact');
        process.exit(1);
      }

      const state = readState();
      if (!state) {
        console.log(JSON.stringify({ error: 'No pipeline state found.' }));
        process.exit(1);
      }

      const artifactPath = path.join(OUTPUT_DIR, artifact);
      let version = null;
      if (fs.existsSync(artifactPath)) {
        const content = fs.readFileSync(artifactPath, 'utf8');
        const versionMatch = content.match(/\*\*Version:\*\*\s*(\d+)/);
        version = versionMatch ? parseInt(versionMatch[1], 10) : 1;
      }

      // Auto-estimate tokens from artifact size when caller did not supply them.
      // This guarantees telemetry is never empty during real workflow runs.
      if (tokens === null) {
        tokens = estimateTokensFromFile(artifactPath);
      }

      // --dry-run MEANT NO WRITES.
      //
      // Measured (blind /launch run 2026-10-08): `complete --dry-run` wrote to FIVE files --
      // pipeline-state.json, sprint-status.yaml, three telemetry NDJSON streams, and
      // artifacts/memory/project-context.md, which is SHARED memory. An agent rehearsing a command
      // corrupted live state and told nobody, because the flag was accepted and ignored.
      //
      // The computation still runs and is still reported, so a dry run rehearses the real logic
      // rather than being a silent no-op. That is the entire point of the flag.
      if (dryRun) {
        console.log(JSON.stringify({
          dry_run: true,
          would_write: [
            'artifacts/output/pipeline-state.json',
            'artifacts/telemetry/*.ndjson',
            'artifacts/memory/project-context.md',
          ],
          artifact,
          agent,
          version,
          tokens,
          duration_ms: durationMs,
          note: 'DRY RUN -- nothing was written. Omit --dry-run to apply.',
        }, null, 2));
        if (checkMemory) {
          const lsw = state.last_session_write;
          if (!lsw || lsw.agent !== agent) {
            console.log(`  would warn: no session-write recorded for @${agent}`);
          }
        }
        return;
      }

      state.artifacts[artifact] = {
        agent,
        completed_at: new Date().toISOString(),
        version,
        phase: resolveCurrentPhase(state)
      };

      state.history.push({
        action: 'artifact-complete',
        agent,
        artifact,
        version,
        tokens,
        duration_ms: durationMs,
        timestamp: new Date().toISOString()
      });

      state.last_updated = new Date().toISOString();
      writeState(state);

      // Session Activity backstop: guarantee project-context.md is refreshed
      // even when the agent skipped session-start. The complete call is
      // non-negotiable for every agent, so this closes the enforcement gap.
      try {
        const lsw = state.last_session_write || null;
        const workedOn = lsw && lsw.agent === agent ? lsw.worked_on : null;
        const goal = workedOn && workedOn !== '(not specified)' ? workedOn.slice(0, 80) : null;
        syncProjectContext({ agent, domain: 'session', goal, ensureMarker: true });
      } catch (e) {
        // project-context refresh is best-effort; never block completion on it
      }

      // Session checkpoint retired by Epic 02i (latest.md is the live cursor).
      // Former writeCheckpoint() call removed — it referenced an undefined
      // symbol and the stub writes nothing. See session_checkpoint.js header.

      // Memory enforcement check: warn if no session-write was recorded for this agent.
      if (checkMemory) {
        const lsw = state.last_session_write;
        if (!lsw || lsw.agent !== agent) {
          console.error(
            `Warning: No session-write detected for @${agent}. ` +
            `Run: @memory-controller session-write [agent: @${agent}] OR ` +
            `node .agents/scripts/orchestrator_state.js session-write --agent ${agent}`
          );
        }
      }

      // Always record an agent_invoke telemetry event. Use provided duration_ms or 0.
      recordTelemetry('agent_invoke', {
        agent,
        phase: resolveCurrentPhase(state),
        data: { tokens, duration_ms: durationMs, artifact, version }
      });
      // 02l Option A thin slice: also emit OTel span (hybrid, cost nullable, estimated flag per tokens)
      recordSpanForAgent(agent, resolveCurrentPhase(state), tokens, durationMs, artifact);

      console.log(JSON.stringify({ success: true, agent, artifact, version, tokens, duration_ms: durationMs }));
    }

    if (cmd === 'session-start') {
      let agent = null;
      let domain = null;
      let goal = null;
          ({ agent, domain, goal } = parseFlagArgs(args, ['--agent', '--domain', '--goal'], [], 'session-start'));
      if (!agent) {
        console.error('Missing --agent');
        process.exit(1);
      }

      const state = readState();
      if (!state) {
        console.log(JSON.stringify({ error: 'No pipeline state found.' }));
        process.exit(1);
      }

      // Record in pipeline state (for --check-memory enforcement at complete time)
      state.last_session_start = {
        agent,
        domain,
        goal,
        timestamp: new Date().toISOString()
      };
      state.last_updated = new Date().toISOString();
      writeState(state);

      // CLI parity (P0-3): the direct-CLI path rebuilds latest.md on start;
      // do the same here so both session-start paths converge on a fresh cursor.
      try {
        regenerateLatest();
      } catch (e) {
        // cursor rebuild is best-effort; never block session start on it
      }

      // Refresh project-context.md (Phase / Blockers / Session Activity / footer)
      let result;
      try {
        result = syncProjectContext({ agent, domain, goal });
      } catch (e) {
        console.error(JSON.stringify({ success: false, error: e.message }));
        process.exit(1);
      }

      recordTelemetry('session_start', {
        agent,
        phase: resolveCurrentPhase(state),
        data: { domain, goal }
      });

      console.log(JSON.stringify({ success: true, message: 'Session start recorded.', ...result }));
    }

    if (cmd === 'sync-context') {
      // Refresh project-context.md without an agent session — used by the
      // post-push git hook so the Repository line updates right after a push.
      try {
        const result = syncProjectContext({ agent: 'git', domain: 'repo-sync', goal: null, recordMarker: false });
        console.log(JSON.stringify({ success: true, message: 'Project context refreshed.', ...result }));
      } catch (e) {
        console.error(JSON.stringify({ success: false, error: e.message }));
        process.exit(1);
      }
    }

    if (cmd === 'session-write') {
      let agent = null;
      let workedOn = '';
      let decisions = '';
      let nextStep = '';
      let blockers = 'none';
          ({ agent, 'worked-on': workedOn, decisions, 'next-step': nextStep, blockers } =
    parseFlagArgs(args, ['--agent', '--worked-on', '--decisions', '--next-step', '--blockers'], [], 'session-write'));
      if (!agent) {
        console.error('Missing --agent');
        process.exit(1);
      }

      const state = readState();
      if (!state) {
        console.log(JSON.stringify({ error: 'No pipeline state found.' }));
        process.exit(1);
      }

      // Record in pipeline state
      state.last_session_write = {
        agent,
        timestamp: new Date().toISOString(),
        worked_on: workedOn,
        decisions,
        next_step: nextStep,
        blockers
      };
      state.last_updated = new Date().toISOString();
      writeState(state);

      // 02o.3: history.md is the append-only log; latest.md is derived.
      // The direct latest.md overwrite here was the last-writer-wins hazard
      // behind the 2026-08-28 collision.
      const sessionDir = path.join(process.cwd(), 'artifacts', 'memory', 'session-summaries');
      if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

      const ts = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const date = `${ts.getFullYear()}-${pad(ts.getMonth() + 1)}-${pad(ts.getDate())} ${pad(ts.getHours())}:${pad(ts.getMinutes())}`;

      const historyEntry = [
        ``,
        `## [${date}] Agent: @${agent}`,
        `- Worked on: ${workedOn || '(not specified)'}`,
        `- Decisions: ${decisions || 'none'}`,
        `- Next step: ${nextStep || '(not specified)'}`,
        `- Blockers: ${blockers}`,
        `- Session: ${resolveSessionId()}`,
      ].join('\n');

      try {
        fs.appendFileSync(path.join(sessionDir, 'history.md'), historyEntry + '\n', 'utf8');
        regenerateLatest();
      } catch (e) {
        console.error('Warning: Could not write session summary files: ' + e.message);
      }

      // END-OF-SESSION DECISION FLUSH (2026-10-06). A finished decision becomes a lesson
      // once, at the session boundary, so active-decisions.md holds only standing
      // choices. This is the only reliable trigger available: there is no sprint concept
      // in pipeline state (`sprint: None`), so "end of sprint" is not detectable, and
      // end-of-day is a subset of this since session-write runs many times a day.
      //
      // Best-effort and non-blocking: a flush failure must never cost the caller their
      // session summary. It only acts on entries carrying an explicit completion signal
      // (status resolved/superseded/complete/stale, or another entry declaring
      // `**Supersedes:**` it) — never on age, and never on a domain guess.
      let decisionFlush = null;
      try {
        decisionFlush = flushDecisionsToLessons();
      } catch (e) {
        decisionFlush = { error: e.message };
      }

      // Refresh project-context.md (Phase / Blockers / Repository / Stack /
      // Session Activity).
      try {
        const goal = workedOn && workedOn !== '(not specified)' ? workedOn.slice(0, 80) : null;
        const result = syncProjectContext({ agent, domain: 'session', goal });
        console.log(JSON.stringify({ success: true, agent, date, message: 'Session summary written.', decisions_flushed: decisionFlush, ...result }));
      } catch (e) {
        console.log(JSON.stringify({ success: true, agent, date, message: 'Session summary written.', decisions_flushed: decisionFlush }));
      }
    }

    if (cmd === 'file-cr') {
      let from = null, to = null, target = null, issue = null, proposedFix = null, impact = null;
          ({ from, to, target, issue, 'proposed-fix': proposedFix, impact } =
    parseFlagArgs(args, ['--from', '--to', '--target', '--issue', '--proposed-fix', '--impact'], [], 'change-request'));
      if (!from || !to || !target || !issue) {
        console.error('Missing required args: --from, --to, --target, --issue');
        process.exit(1);
      }

      const state = readState();
      if (!state) {
        console.log(JSON.stringify({ error: 'No pipeline state found.' }));
        process.exit(1);
      }

      const crId = `CR-${String(state.change_requests.length + 1).padStart(3, '0')}`;
      const cr = {
        id: crId,
        from, to, target, issue,
        proposed_fix: proposedFix || '',
        impact: impact || '',
        status: 'OPEN',
        created_at: new Date().toISOString()
      };

      state.change_requests.push(cr);
      state.last_updated = new Date().toISOString();
      writeState(state);

      console.log(JSON.stringify({ success: true, cr_id: crId, cr }));
    }

    if (cmd === 'advance') {
      const state = readState();
      if (!state) {
        console.log(JSON.stringify({ error: 'No pipeline state found. Run init first.' }));
        process.exit(1);
      }
      const currentPhase = resolveCurrentPhase(state);
      const currentIdx = PHASE_ORDER.indexOf(currentPhase);
      if (currentIdx < 0 || currentIdx >= PHASE_ORDER.length - 1) {
        console.log(JSON.stringify({ error: `Cannot advance past final phase: ${currentPhase}` }));
        process.exit(1);
      }
      const targetPhase = PHASE_ORDER[currentIdx + 1];

      // Mark current phase complete
      if (state.phases[currentPhase]) {
        state.phases[currentPhase].status = 'complete';
        state.phases[currentPhase].completed_at = new Date().toISOString();
      }
      state.current_phase = targetPhase;
      if (!state.phases[targetPhase]) {
        state.phases[targetPhase] = { status: 'in-progress', started_at: new Date().toISOString(), completed_at: null, agents: [] };
      } else {
        state.phases[targetPhase].status = 'in-progress';
        if (!state.phases[targetPhase].started_at) {
          state.phases[targetPhase].started_at = new Date().toISOString();
        }
      }

      state.history.push({
        action: 'phase-advance',
        from: currentPhase,
        to: targetPhase,
        timestamp: new Date().toISOString()
      });
      state.last_updated = new Date().toISOString();

      // Compaction still runs BEFORE the durable commit, so history is tidied as part of
      // the transition. But an over-budget result no longer BLOCKS the transition.
      //
      // WHY (2026-10-05, owner decision). This used to exit 1 on ADVANCE_OVER_BUDGET, and
      // that produced a deadlock with no in-band recovery: measured 47,548 tokens against a
      // 400 budget, and even keeping only the current day's entries measured ~7,770 tokens.
      // So the agent was told "you may not advance the phase" while the only documented
      // escape — compact memory — provably could not succeed. It was stuck permanently.
      //
      // The gate also never prevented bloat. Nothing stopped an agent writing 40,000 tokens;
      // the failure was simply deferred until the moment work was finished and the board
      // needed to move. That is not prevention, it is a delayed detonation.
      //
      // It also coupled two unrelated questions. "This phase's work is done" is semantic.
      // "How big is the context" is a cost concern. Blocking the first on the second means
      // finishing the work and being unable to record that you finished it.
      //
      // Now: compact, REPORT, and continue. The budget is visible telemetry and a warning,
      // not a wall. A gate that can wedge is worse than no gate.
      const compactionResult = compactActiveDecisions();
      const memoryStatus = {
        tokens: compactionResult.tokens,
        budget: ACTIVE_DECISIONS_TOKEN_BUDGET,
        under_budget: compactionResult.underBudget,
        retired: compactionResult.archivedCount
      };
      if (!compactionResult.underBudget) {
        // Non-blocking. Telemetry only — nothing below this branch changes behaviour.
        recordTelemetry('phase_transition', {
          phase: targetPhase,
          data: { action: 'advance', from: currentPhase, to: targetPhase, over_budget: true, compaction: memoryStatus }
        });
        console.error(
          `[warn] active-decisions.md is ${compactionResult.tokens} tokens (budget ${ACTIVE_DECISIONS_TOKEN_BUDGET}). ` +
          `Phase advanced anyway — this is a cost warning, not a blocker. ` +
          `Run: node .agents/scripts/orchestrator_state.js compact`
        );
      }

      writeState(state);

      // Sync project context
      try {
        syncProjectContext({ agent: 'orchestrator', domain: 'phase-advance', goal: `Advanced to ${targetPhase}` });
      } catch (e) {}

      recordTelemetry('phase_transition', {
        phase: targetPhase,
        data: { action: 'advance', from: currentPhase, to: targetPhase, compaction: compactionResult }
      });

      console.log(JSON.stringify({
        success: true,
        from: currentPhase,
        to: targetPhase,
        memory: memoryStatus
      }));
    }

    if (cmd === 'flush-decisions') {
      const promote = (() => {
        const i = args.indexOf('--promote');
        return i !== -1 ? args[i + 1] : null;
      })();
      const dry = args.includes('--dry-run');
      if (promote) {
        // Promote one REPORTED candidate. Deliberately explicit: candidates are a
        // heuristic surface, so moving one is a human decision, not an automatic one.
        const mw = path.join(process.cwd(), '.agents/scripts/memory_write.js');
        const { spawnSync } = require('child_process');
        const r = spawnSync(process.execPath, [mw, '--resolve',
          '--file', 'active-decisions.md', '--header', promote, '--status', 'superseded'],
          { encoding: 'utf8', cwd: process.cwd() });
        if (r.status !== 0) {
          console.log(JSON.stringify({ success: false, error: (r.stderr || '').trim() }));
          process.exit(1);
        }
      }
      const result = flushDecisionsToLessons({ dryRun: dry });
      console.log(JSON.stringify({ success: true, ...result }));
    }

    if (cmd === 'compact') {
      const result = compactActiveDecisions();
      console.log(JSON.stringify({ success: true, ...result }));
    }

    if (cmd === 'set-phase') {
      let phase = null;
          ({ phase } = parseFlagArgs(args, ['--phase'], [], cmd));
      if (!phase) {
        console.error('Missing --phase');
        process.exit(1);
      }
      const state = readState();
      if (!state) {
        console.log(JSON.stringify({ error: 'No pipeline state found. Run init first.' }));
        process.exit(1);
      }

      if (!PHASE_ORDER.includes(phase)) {
        console.error(JSON.stringify({ error: `Invalid phase: ${phase}. Must be one of ${PHASE_ORDER.join(', ')}` }));
        process.exit(1);
      }

      const oldPhase = resolveCurrentPhase(state);
      state.current_phase = phase;

      // Ensure the phase key exists in the map so next/status stay consistent
      if (!state.phases[phase]) {
        state.phases[phase] = { status: 'pending', started_at: null, completed_at: null, agents: [] };
      }

      if (state.phases[phase].status === 'pending') {
        state.phases[phase].status = 'in-progress';
        state.phases[phase].started_at = new Date().toISOString();
      }

      state.history.push({
        action: 'phase-switch',
        from: oldPhase,
        to: phase,
        timestamp: new Date().toISOString()
      });

      state.last_updated = new Date().toISOString();

      // Same non-blocking policy as `advance` (see the long note there). This branch is
      // the one that wedged hardest: switching to the phase that was ALREADY current
      // failed, because the guard ran before it checked whether anything needed to change.
      const compactionResult = compactActiveDecisions();
      const memoryStatus = {
        tokens: compactionResult.tokens,
        budget: ACTIVE_DECISIONS_TOKEN_BUDGET,
        under_budget: compactionResult.underBudget,
        retired: compactionResult.archivedCount
      };
      if (!compactionResult.underBudget) {
        recordTelemetry('phase_transition', {
          phase,
          data: { action: 'set-phase', from: oldPhase, to: phase, over_budget: true, compaction: memoryStatus }
        });
        console.error(
          `[warn] active-decisions.md is ${compactionResult.tokens} tokens (budget ${ACTIVE_DECISIONS_TOKEN_BUDGET}). ` +
          `Phase set anyway — this is a cost warning, not a blocker. ` +
          `Run: node .agents/scripts/orchestrator_state.js compact`
        );
      }

      writeState(state);

      // Sync back to project-context.md
      try {
        syncProjectContext({ agent: 'orchestrator', domain: 'phase-switch', goal: `Switched to ${phase}` });
      } catch (err) {}

      recordTelemetry('phase_transition', {
        phase,
        data: { action: 'set-phase', from: oldPhase, to: phase, compaction: compactionResult }
      });

      console.log(JSON.stringify({ success: true, from: oldPhase, to: phase, memory: memoryStatus }));
    }

    if (cmd === 'validate') {
      let phase = null;
          ({ phase } = parseFlagArgs(args, ['--phase'], [], cmd));
      if (!phase) {
        console.error('Missing --phase');
        process.exit(1);
      }
      const result = validatePhaseArtifacts(phase);
      console.log(JSON.stringify(result, null, 2));
      // Never green-light an unchecked or non-canonical phase: warn + non-zero exit.
      if (result.checked === 0) {
        console.error(`Warning: ${result.warning}`);
        process.exit(1);
      }
    }
  } catch (e) {
    console.error(JSON.stringify({ success: false, error: e.message }));
    process.exit(1);
  }
}

// Commands that read-modify-write pipeline-state.json / memory files run
// under a per-project exclusive lock (A2, Task 3.4/A2 — 2026-08-25), so
// concurrent agent sessions can no longer lose updates last-writer-wins.
const MUTATING_COMMANDS = new Set([
  'init', 'update', 'session-start', 'session-write', 'complete',
  'advance', 'set-phase', 'compact', 'flush-decisions', 'sync-context', 'file-cr'
]);


function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h' || args[0] === 'usage') {
    console.log(USAGE);
    process.exit(0);
  }
  if (MUTATING_COMMANDS.has(args[0])) {
    const lockPath = path.join(process.cwd(), '.agents', 'state', 'orchestrator.lock');
    withLock(lockPath, () => mainDispatch(args));
  } else {
    mainDispatch(args);
  }
}

main();
