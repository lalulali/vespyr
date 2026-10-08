/**
 * Memory budgets — ONE source of truth for every script and document that states one.
 *
 * WHY THIS FILE EXISTS. The active-decisions budget existed in FOUR places with THREE
 * different values in TWO different units, and the one that actually ran was not the one
 * anyone configured:
 *
 *   orchestrator_state.js    -> `tokens <= 400`        (enforced)
 *   compaction_guard.js     -> THRESHOLDS = 400        (DEAD CONFIG — never read)
 *   compaction_guard.js     -> CLI default 1,500 tok   (what `--file` actually used)
 *   memory-controller.md    -> 1,800 WORDS             (= ~1,350 tokens, a fourth value)
 *
 * Two copies of one policy is zero copies of a policy. This module is the one copy, and
 * `agents/memory-controller.md` now reads from it rather than restating a table.
 *
 * WHY EVERY NUMBER HERE IS DERIVED. Measured 2026-10-05 against the live memory files.
 * The previous budgets were not chosen — they accreted, and every file was over:
 *
 *   file                          measured    old budget    over by
 *   active-decisions.md             3,753      2,500          1.5x   (was 7,944 / 400 = 19.9x)
 *   lessons-learned.md             12,731        500         25.5x
 *   patterns-and-conventions.md     4,557        500          9.1x
 *   project-context.md                920        300          3.1x
 *
 * Each budget below is the measured load plus ~25% headroom, rounded. That is a
 * calibration, not a quota: it is set from what the corpus genuinely needs, so the gate
 * means "this file has grown materially beyond its working size" instead of "this number
 * was typed in 2026 and never revisited".
 *
 * `null` = dynamic tier, report-only, never a violation. See compaction_guard.js for the
 * Epic 02i §2.2 provenance of the dynamic tier.
 *
 * Word thresholds are derived as round(tokens / 4/3) and kept for the word-based callers;
 * both units now come from one table so they cannot drift apart again.
 */

'use strict';

const THRESHOLDS = {
  // 3,753 measured + 25% => 4,000.
  'active-decisions.md': { words: 3000, tokens: 4000 },
  // 12,731 measured + 25% => 16,000. Note this file legitimately carries audit records —
  // it is a lessons LOG, not a live decision set, so a large size is expected.
  'lessons-learned.md': { words: 12000, tokens: 16000 },
  // 4,557 measured + 25% => 5,700.
  'patterns-and-conventions.md': { words: 4300, tokens: 5700 },
  // 920 measured + 25% => 1,150.
  'project-context.md': { words: 860, tokens: 1150 },
  // Dynamic tier: append-shaped, no meaningful ceiling.
  'blockers-and-risks.md': { words: null, tokens: null },
  'teaching-style.md': { words: null, tokens: null },
  'session-summaries/latest.md': { words: null, tokens: null }
};

function thresholdsFor(fileName) {
  // Accept a full path as well as a bare name; callers hold both.
  const base = String(fileName).split('/').pop();
  return THRESHOLDS[base] || { words: null, tokens: null };
}

/** The active-decisions budget, for callers that enforce it rather than report it. */
const ACTIVE_DECISIONS_TOKEN_BUDGET = THRESHOLDS['active-decisions.md'].tokens;
const ACTIVE_DECISIONS_WORD_BUDGET = THRESHOLDS['active-decisions.md'].words;

module.exports = {
  THRESHOLDS,
  thresholdsFor,
  ACTIVE_DECISIONS_TOKEN_BUDGET,
  ACTIVE_DECISIONS_WORD_BUDGET
};
