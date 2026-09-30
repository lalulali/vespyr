/**
 * safe_edit.js — anchor-verified, atomic edits for one-shot migration scripts.
 *
 * WHY THIS EXISTS
 * A migration that locates its insertion point with an anchor and then calls
 * `content.replace(anchor, …)` has a failure mode that is invisible in review
 * and in the output: **if the anchor is missing, `String.replace` returns the
 * original string unchanged.** The script then writes the file back
 * byte-identical, prints `OK: <name>`, and increments its success counter.
 *
 * Demonstrated on `add-socratic-stance.js` (2026-09-30): pointed at an agent
 * file with no `## Delegation Contract` heading, it printed
 * "OK: architect / Added Socratic Stance to 1 agent(s)" while the file's
 * SHA-256 was unchanged before and after. A migration that changed nothing
 * reported that it changed something.
 *
 * That matters more than it looks. These scripts mass-edit `.agents/**`
 * frontmatter and bodies. A silent no-op there means a rename or a heading
 * change upstream leaves every downstream file quietly un-migrated, and the
 * only signal is a success message nobody re-reads.
 *
 * `lib/fs_atomic.js` already solved crash-safety (write-temp-then-rename) and is
 * used by six other scripts — but it does NOT catch this. Atomicity and
 * correctness are different problems.
 *
 * THE RULES ENFORCED HERE
 *   1. The anchor must exist, or the edit fails with a reason.
 *   2. The anchor must be unique, or the edit fails — a migration that guesses
 *      which of two headings you meant is not a migration, it is a coin flip.
 *   3. The new content must DIFFER from the old, or nothing is written. A
 *      "successful" edit that changes nothing is always a bug.
 *   4. Writes go through fs_atomic, so a crash mid-run cannot truncate a file.
 *   5. Callers can aggregate failures and exit non-zero, so CI sees them.
 *
 * Usage:
 *   const { insertBefore, editFile } = require('./lib/safe_edit');
 *   const r = editFile(filePath, (c) => insertBefore(c, '## Delegation Contract', block));
 *   if (r.ok) { console.log('OK'); } else { console.error('FAIL: ' + r.reason); }
 */

const fs = require('fs');
const path = require('path');
const atomic = require('./fs_atomic');

/** Human-readable count of non-overlapping occurrences. */
function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let n = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    n++;
    i = haystack.indexOf(needle, i + needle.length);
  }
  return n;
}

/**
 * Shared anchor check. Returns null when the anchor is usable, or a reason
 * string when it is not.
 */
function anchorProblem(content, anchor, all) {
  if (typeof anchor !== 'string' || anchor.length === 0) return 'no-anchor-given';
  const n = countOccurrences(content, anchor);
  if (n === 0) return 'anchor-missing';
  if (n > 1 && !all) return `anchor-ambiguous (${n} matches)`;
  return null;
}

/**
 * Insert `insertion` immediately before the first occurrence of `anchor`.
 * Never mutates; always returns a result object.
 *
 * @returns {{ok: boolean, reason: string|null, content: string, changed: boolean}}
 */
function insertBefore(content, anchor, insertion, opts = {}) {
  const problem = anchorProblem(content, anchor, opts.all);
  if (problem) return { ok: false, reason: problem, content, changed: false };

  const at = content.indexOf(anchor);
  const next = content.slice(0, at) + insertion + content.slice(at);
  return finish(content, next, opts);
}

/** Insert `insertion` immediately after the last occurrence of `anchor`. */
function insertAfter(content, anchor, insertion, opts = {}) {
  const problem = anchorProblem(content, anchor, opts.all);
  if (problem) return { ok: false, reason: problem, content, changed: false };

  const at = content.lastIndexOf(anchor) + anchor.length;
  const next = content.slice(0, at) + insertion + content.slice(at);
  return finish(content, next, opts);
}

/** Replace `anchor` with `replacement` (all occurrences unless opts.all). */
function replaceAnchor(content, anchor, replacement, opts = {}) {
  const problem = anchorProblem(content, anchor, opts.all);
  if (problem) return { ok: false, reason: problem, content, changed: false };

  const next = opts.all
    ? content.split(anchor).join(replacement)
    : content.replace(anchor, replacement);
  return finish(content, next, opts);
}

/**
 * Gate the final content. `noChangeIsError` defaults to TRUE: an edit that
 * produces identical bytes is a defect, not a success.
 */
function finish(before, after, opts = {}) {
  if (after === before && opts.noChangeIsError !== false) {
    return { ok: false, reason: 'no-change', content: before, changed: false };
  }
  return { ok: true, reason: null, content: after, changed: true };
}

/**
 * Read a file, apply `fn` to its content, and write it back ONLY if the edit
 * succeeded and actually changed something. The file is never written on a
 * failed edit — a migration that cannot find its anchor must leave the target
 * exactly as it found it.
 *
 * @param {string} filePath
 * @param {(content: string) => {ok: boolean, reason: string|null, content: string}} fn
 * @returns {{ok: boolean, reason: string|null, path: string, changed: boolean}}
 */
function editFile(filePath, fn) {
  let original;
  try {
    original = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return { ok: false, reason: `read-failed: ${err.code || err.message}`, path: filePath, changed: false };
  }

  const result = fn(original);
  if (!result || !result.ok) {
    return { ok: false, reason: (result && result.reason) || 'edit-returned-nothing', path: filePath, changed: false };
  }
  if (result.content === original) {
    return { ok: false, reason: 'no-change', path: filePath, changed: false };
  }

  try {
    atomic.writeFileSync(filePath, result.content, 'utf8');
  } catch (err) {
    return { ok: false, reason: `write-failed: ${err.code || err.message}`, path: filePath, changed: false };
  }
  return { ok: true, reason: null, path: filePath, changed: true };
}

/**
 * Aggregate per-file results into a process exit code.
 *
 * A migration that failed on any file exits 1. This is the whole point: the
 * previous behaviour — print `OK`, count it, exit 0 — meant CI could never
 * distinguish "migrated" from "did nothing and said so".
 */
function summarize(label, results) {
  const changed = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  if (failed.length > 0) {
    console.error(`\n${label}: ${failed.length} file(s) FAILED. These were left untouched:`);
    for (const f of failed) console.error(`  - ${f.label || path.basename(f.path)}: ${f.reason}`);
    console.error('Fix the file or the anchor, then re-run. Do not treat this run as a no-op.');
  }
  console.log(`\n${label}: changed ${changed.length}, failed ${failed.length}.`);
  return failed.length === 0 ? 0 : 1;
}

module.exports = {
  countOccurrences,
  anchorProblem,
  insertBefore,
  insertAfter,
  replaceAnchor,
  editFile,
  summarize,
};
