/**
 * AST & Markdown Structure Parser for vespyr-eval
 * Extracts code fences, headings, checklists, verdict gates,
 * and deterministically calculates SPC metrics (PCI, SRSR, Zero-Blueprint-on-NO-GO).
 *
 * TWO DISTINCT GATES, KEPT SEPARATE ON PURPOSE. Flattening them into one list is
 * an engine defect (vespyr-dna.md:41): a Decision run and a Review run would
 * render indistinguishably in telemetry, and tier0 trap matching would no longer
 * know which gate a benchmark is actually testing. Precedent: roundtable_eval.js
 * keeps DECISION_VERDICTS and ALL_VERDICTS as separate values for the same reason.
 *
 *   Decision Gate (VERDICT_FORMS)      — [GO] / [RESHAPE] / [NO-GO]
 *   Review Gate  (REVIEW_VERDICT_FORMS) — [CONFIRMED] / [PARTIAL] / [FALSIFIED]
 *
 * A THIRD gate exists: the Shaping Gate (`Shaping: ready|needs-evidence|not-viable`)
 * that shape-up emits alongside a Decision Gate. It answers "is this brief shaped
 * enough to hand to /design?", NOT "should this concept exist?". Collapsing it onto
 * a Decision token would make a brief with unverified assumptions look [GO] on
 * concept viability when the skill only ever claimed shaping-readiness.
 *
 * Legacy decision tokens [PASS] / [PIVOT] / [KILL] are still accepted (dated
 * records are never rewritten) and normalize onto the canonical fields. See
 * .agents/references/vespyr-dna.md#legacy-vocabulary-2026-08-24--2026-09-02--read-only-mapping
 */

const { countTokens } = require("./tokenizer");

/** Decision Gate — ideas, proposals, designs, stack selections. */
const VERDICT_FORMS = {
  GO: ["GO", "PASS"],
  RESHAPE: ["RESHAPE", "PIVOT"],
  NO_GO: ["NO-GO", "KILL"]
};

/** Review Gate — claims about existing state. No legacy aliases. */
const REVIEW_VERDICT_FORMS = {
  CONFIRMED: ["CONFIRMED"],
  PARTIAL: ["PARTIAL"],
  FALSIFIED: ["FALSIFIED"]
};

/**
 * Shaping Gate — shape-up only. Answers "is this brief shaped enough to spec?".
 * Declared as `Shaping: <value>` on its own line, never bracketed: it is a
 * property of the brief, not a Decision Gate verdict. Owner:
 * .agents/skills/shape-up/steps/step-06-handoff.md.
 */
const SHAPING_FORMS = ["READY", "NEEDS_EVIDENCE", "NOT_VIABLE"];

/** Canonical Shaping Gate token from a raw value, or null if not one. */
function normalizeShapingGate(value) {
  if (typeof value !== "string") return null;
  const label = value.trim().toUpperCase().replace(/[\[\]]/g, "").replace(/[\s-]+/g, "_");
  if (label === "READY") return "READY";
  if (label === "NEEDS_EVIDENCE" || label === "NEEDS_EVIDENCES") return "NEEDS_EVIDENCE";
  if (label === "NOT_VIABLE" || label === "NOTVIABLE") return "NOT_VIABLE";
  return null;
}

// Anchored to the declaration line only. A prose mention ("the Shaping: gate is
// about readiness") must not register as a gate value.
const SHAPING_DECL_RE = /^[ \t]*Shaping:[ \t]*([A-Za-z_-]+)[ \t]*$/im;

/**
 * Canonical token for a Review Gate label, or null if it is not one.
 * Deliberately separate from normalizeVerdict: a legacy decision alias must
 * never resolve onto a Review Gate token.
 */
function normalizeReviewVerdict(verdict) {
  if (typeof verdict !== "string") return null;
  const label = verdict.replace(/[\[\]]/g, "").trim().toUpperCase();
  for (const [canonical, forms] of Object.entries(REVIEW_VERDICT_FORMS)) {
    if (forms.includes(label)) return canonical;
  }
  return null;
}

/**
 * Map any legacy or canonical verdict label onto its canonical token.
 * "[KILL]" -> "NO-GO", "PIVOT" -> "RESHAPE", "PASS" -> "GO".
 * Returns the input unchanged for Review Gate labels (CONFIRMED/PARTIAL/FALSIFIED) —
 * use normalizeReviewVerdict to test for those.
 */
function normalizeVerdict(verdict) {
  if (typeof verdict !== "string") return verdict;
  const label = verdict.replace(/[\[\]]/g, "").trim().toUpperCase();
  for (const [canonical, forms] of Object.entries(VERDICT_FORMS)) {
    if (forms.includes(label)) return canonical === "NO_GO" ? "NO-GO" : canonical;
  }
  return label;
}

function parseMarkdownAST(content) {
  if (!content || typeof content !== "string") {
    return {
      raw: "",
      totalTokens: 0,
      headings: [],
      codeBlocks: [],
      verdicts: [],
      reviewVerdicts: [],
      shapingVerdicts: [],
      shapingGate: null,
      declaredVerdicts: [],
      declaredReviewVerdicts: [],
      allVerdicts: [],
      verdictPrecededByProse: null,
      atomicPlainSentence: null,
      hasGoVerdict: false,
      hasReshapeVerdict: false,
      hasNoGoVerdict: false,
      hasKillVerdict: false,
      hasPivotVerdict: false,
      hasPassVerdict: false,
      codeBlocksPreDecision: [],
      codeBlocksPostDecision: [],
      pci: 0.0,
      goMissingWhenAxis: false,
      violatesZeroBlueprintOnNoGo: false,
      violatesZeroBlueprintOnKill: false
    };
  }

  const lines = content.split(/\r?\n/);
  const headings = [];
  const codeBlocks = [];
  let inCodeBlock = false;
  let currentCodeBlock = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (!inCodeBlock && headingMatch) {
      headings.push({
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
        line: i + 1
      });
    }

    const fenceMatch = line.match(/^(```|~~~)(\w*)/);
    if (fenceMatch) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        currentCodeBlock = {
          lang: fenceMatch[2] || "",
          startLine: i + 1,
          lines: []
        };
      } else {
        inCodeBlock = false;
        if (currentCodeBlock) {
          currentCodeBlock.endLine = i + 1;
          currentCodeBlock.content = currentCodeBlock.lines.join("\n");
          currentCodeBlock.tokens = countTokens(currentCodeBlock.content);
          codeBlocks.push(currentCodeBlock);
          currentCodeBlock = null;
        }
      }
      continue;
    }

    if (inCodeBlock && currentCodeBlock) {
      currentCodeBlock.lines.push(line);
    }
  }

  // Check for verdict tokens — canonical form first, legacy form as alias.
  //
  // This scan is deliberately LOOSE (whole-document) and load-bearing: ZERO-BLUEPRINT-
  // ON-NO-GO must catch a [NO-GO] even when the wording is not a clean declaration.
  // Tightening it would silently weaken that invariant.
  //
  // One exclusion is still required. explore-idea emits TWO gates in TWO files:
  // `MARKET VERDICT:` (step 2a, about the market) and `VERDICT:` (step 3c, about the
  // whole concept). They are different decisions. Counting the market sub-gate as a
  // concept Decision Gate made a market-[GO]/concept-[NO-GO] document report both GO
  // and NO-GO on `verdicts`, so a benchmark expecting [NO-GO] saw a phantom GO and
  // Zero-Blueprint measured placement from the WRONG line.
  //
  // Only the Decision-gate list excludes the market line. hasNoGoVerdict below still
  // scans the full text, so Zero-Blueprint detection is unchanged.
  const MARKET_VERDICT_LINE_RE = /^[ \t]*(?:[-*+>][ \t]+)?(?:\*\*|__)?[ \t]*MARKET[ \t]+VERDICT[ \t]*:/im;
  const contentForDecisionGate = content
    .split(/\r?\n/)
    .map((l) => (MARKET_VERDICT_LINE_RE.test(l) ? "" : l))
    .join("\n");

  const verdicts = [];
  const hasForm = (token) => new RegExp(`\\[${token.replace("-", "\\-")}\\]`, "i").test(contentForDecisionGate);
  const hasGoVerdict = hasForm("GO") || hasForm("PASS");
  const hasReshapeVerdict = hasForm("RESHAPE") || hasForm("PIVOT");
  const hasNoGoVerdict = hasForm("NO-GO") || hasForm("KILL");
  const hasPassVerdict = hasGoVerdict;
  const hasPivotVerdict = hasReshapeVerdict;
  const hasKillVerdict = hasNoGoVerdict;
  if (hasGoVerdict) verdicts.push("GO");
  if (hasReshapeVerdict) verdicts.push("RESHAPE");
  if (hasNoGoVerdict) verdicts.push("NO-GO");

  // Review Gate — detected SEPARATELY, never folded into `verdicts`. A Decision
  // run and a Review run must stay distinguishable in telemetry (dna.md:41).
  const reviewVerdicts = [];
  if (hasForm("CONFIRMED")) reviewVerdicts.push("CONFIRMED");
  if (hasForm("PARTIAL")) reviewVerdicts.push("PARTIAL");
  if (hasForm("FALSIFIED")) reviewVerdicts.push("FALSIFIED");
  const allVerdicts = [...verdicts, ...reviewVerdicts];

  // DECLARED Review verdicts — the tight counterpart to the loose `reviewVerdicts`,
  // mirroring `declaredVerdicts` for the Decision gate.
  //
  // Same measured problem. A design review that correctly states "this skill emits
  // `[GO]`/`[RESHAPE]`/`[NO-GO]` never" — which is exactly what the /design skill now
  // instructs — puts all three Decision tokens in the document on purpose. And an
  // artifact that lists its own Review vocabulary reports CONFIRMED, PARTIAL and
  // FALSIFIED at once. On a real /design validate run:
  //     reviewVerdicts -> ['CONFIRMED','PARTIAL','FALSIFIED']   (all merely discussed)
  //     verdicts       -> ['GO','RESHAPE','NO-GO']              (all merely disclaimed)
  // Neither is wrong; both are the loose scan doing its job. A caller asking "what did
  // this document DECIDE" wants the declared fields.
  const DECLARED_REVIEW_RE =
    /^[ \t]*(?:[-*+>][ \t]+)?(?:\*\*|__)?[ \t]*(?:VERDICT|REVIEW)[ \t]*:[ \t]*(?:.*?[ \t])?\[(CONFIRMED|PARTIAL|FALSIFIED)\]/im;
  const declaredReviewRaw = (contentForDecisionGate.match(DECLARED_REVIEW_RE) || [])[1];
  const declaredReviewVerdicts = declaredReviewRaw ? [declaredReviewRaw] : [];

  // DECLARED verdicts — the tight counterpart to the loose `verdicts` scan.
  //
  // The loose scan is required (Zero-Blueprint must catch a [NO-GO] even when the
  // wording is not a clean declaration) but it has a known cost: a brief that argues
  // "why this is not [GO]" and "why this is not [NO-GO]" in prose registers all three
  // tokens. Measured on a real explore-idea run, a clean concept [RESHAPE] reported
  // ['GO','RESHAPE','NO-GO'] — every token the document *discussed*, not just the one
  // it *declared*.
  //
  // So both values ship and the difference is deliberate:
  //   verdicts        — loose, load-bearing for Zero-Blueprint. Any mention counts.
  //   declaredVerdicts — tight, declaration-anchored. Only the gate line counts.
  // A benchmark asserting "what verdict did this document DECIDE" wants the second.
  // A benchmark asserting "did this document ever contain a NO-GO" wants the first.
  const DECLARED_TOKEN_RE =
    /^[ \t]*(?:[-*+>][ \t]+)?(?:\*\*|__)?[ \t]*(?:VERDICT|Decision|VERDICT)[ \t]*:[ \t]*(?:.*?[ \t])?\[(GO|RESHAPE|NO-GO|PASS|PIVOT|KILL)\]/im;
  const declaredRaw = (contentForDecisionGate.match(DECLARED_TOKEN_RE) || [])[1];
  const declaredVerdicts = declaredRaw ? [normalizeVerdict(declaredRaw)] : [];

  // Shaping Gate — a third, separate gate. Kept out of `verdicts` AND out of
  // `reviewVerdicts` for the same reason those two are kept apart: it answers a
  // different question, and a reader must not have to guess which one is reported.
  const shapingMatch = (content.match(SHAPING_DECL_RE) || [])[1];
  const shapingGate = normalizeShapingGate(shapingMatch);
  const shapingVerdicts = shapingGate ? [shapingGate] : [];

  // PLAIN-SENTENCE-FIRST CHECK (both gates). The token is the machine companion,
  // never the message: a reader who has never seen this engine cannot act on
  // "[RESHAPE]" (dna.md §The Plain Sentence). A verdict that opens the response
  // with no prose before it is a defect even when the token parses.
  //
  // Reported as a metric, never a hard failure here — enforcing it is the
  // caller's opt-in choice (benchmark.requirePlainSentenceBeforeVerdict),
  // mirroring requireZeroBlueprintOnNoGo. A fake gate is worse than none.
  // A verdict DECLARATION, not an incidental mention. The earlier pattern matched any
  // `[GO]` anywhere, so a document that wrote "Any red flag blocks `[GO]`" in a table row
  // anchored the plain-sentence and atomic-sentence checks to that table row instead of the
  // real card — measured in the shape-up/validate-idea simulation, where it walked up into a
  // markdown table, found no sentence punctuation, and returned false for a correct artifact.
  //
  // Anchors on: a VERDICT:/MARKET VERDICT:/GATE:/SYNTHESIS: declaration, or a line that STARTS
  // with a bare bracketed token (the bracketed-only form). Excludes tokens mid-sentence.
  const VERDICT_DECL_RE = /^\s*(?:[-*+>]\s+)?(?:\*\*|__)?\s*(?:(?:MARKET\s+)?VERDICT|GATE|SYNTHESIS)\s*:|^\s*(?:[-*+>]\s+)?\[(?:(?:MARKET\s+)?VERDICT|SYNTHESIS|GATE)\s*:|^\s*(?:[-*+>]\s+)?(?:\*\*|__)?\s*\[\s*(?:GO|RESHAPE|NO-GO|PASS|PIVOT|KILL|CONFIRMED|PARTIAL|FALSIFIED)\s*\]/;
  let verdictPrecededByProse = null; // null = no verdict present, nothing to judge
  let firstVerdictIdx = lines.findIndex((l) => VERDICT_DECL_RE.test(l));
  if (firstVerdictIdx === -1) {
    // No declaration line — fall back to the old loose anchor so chat-sized output that
    // simply leads with `[RESHAPE]` is still judged rather than silently skipped.
    firstVerdictIdx = lines.findIndex((l) => /\[[A-Z][A-Z-]*(?:\s*\|\s*[A-Z-]+)*\]/.test(l));
  }
  let atomicPlainSentence = null; // null = nothing to judge
  if (firstVerdictIdx !== -1) {
    const MIN_PLAIN_SENTENCE_CHARS = 40;

    // ANCHOR TO THE ADJACENT PARAGRAPH, not the document start.
    //
    // The earlier version summed every prose line from the top of the document down to the
    // card. That made the check almost vacuous for documents: a brief with an Alternatives
    // table above the gate returned `true` even after the gate's own sentence was deleted.
    // Verified false negative:
    //     "sentence adjacent to card"             -> true   (correct)
    //     "unrelated prose above, no sentence"    -> true   (WRONG — nothing to do with the verdict)
    //     "card alone at the top of a doc"        -> false  (correct)
    //
    // The contract is about the verdict's OWN sentence, so scan upward for the nearest prose
    // block. The card usually lives inside a fenced block, so fences and their contents are
    // skipped rather than treated as a boundary.
    // Precompute fence depth per line ONCE, top-down. Walking upward, a line is usable
    // prose only when its depth is 0 — this is what lets the scan step out of the fenced
    // card block and find the sentence above it. A naive toggle while walking upward gets
    // the polarity wrong: the first fence hit from inside is the block's OPENING delimiter,
    // so everything above it is outside and must be collected.
    const fenceDepth = [];
    {
      let d = 0;
      for (const l of lines) {
        fenceDepth.push(d);
        if (/^\s*(`{3,}|~{3,})/.test(l)) d = d > 0 ? d - 1 : d + 1;
      }
    }
    const isHeading = (l) => /^\s*#{1,6}\s/.test(l);
    const buf = [];
    for (let i = firstVerdictIdx - 1; i >= 0; i--) {
      const l = lines[i];
      if (fenceDepth[i] > 0) { if (buf.length) break; else continue; } // fenced content
      if (/^\s*(`{3,}|~{3,})/.test(l)) { if (buf.length) break; else continue; } // fence delimiter
      if (!l.trim()) { if (buf.length) break; else continue; }               // blank ends the paragraph
      if (isHeading(l)) { if (buf.length) break; else continue; }            // heading is a label
      buf.unshift(l.replace(/^\s*(?:[-*+]\s+|>\s+|\d+[.)]\s+)/, "").trim());
    }
    const trimmed = buf.join(" ").trim();
    verdictPrecededByProse =
      trimmed.length >= MIN_PLAIN_SENTENCE_CHARS && /[.!?]/.test(trimmed);

    // Locate the timing axis on the verdict line or within the next 2 lines.
    const whenLine = (() => {
      for (let i = 0; i < Math.min(lines.length, firstVerdictIdx + 3); i++) {
        const m = lines[i].match(/\bWhen\s*:\s*([A-Z-]+)/i);
        if (m) return m[1].toUpperCase();
      }
      return null;
    })();

    // ATOMIC PLAIN SENTENCE. When the timing axis is not NOW, the FIRST sentence must
    // already carry the condition. Leading with a bare "Build this." and hedging in a
    // later clause is the confusion bug: the reader takes clause one, then meets
    // `When: GATED` and reads a contradiction (dna.md §The Plain Sentence).
    //
    // Structural, not keyword-based: the bug's signature is that the first sentence is
    // nothing BUT a bare verdict. Anything carrying a condition ("once it has run a
    // week", "next quarter, during planning") is atomic by definition — guessing from a
    // fixed word list previously mis-flagged "next quarter" as non-atomic.
    // A bare verdict is only acceptable when there is no condition to carry. Only the
    // deferral axes (GATED, NEXT-CYCLE) impose one; NOW and NEVER both mean "no condition" —
    // "Don't build this." IS the complete answer for [NO-GO], so requiring a qualifier
    // there would have been a false positive.
    //
    // BARE_LABEL covers literal translations of the machine vocabulary. "Gated.", "This
    // needs reshaping.", "Verdict: next cycle." decode a label AT the reader instead of
    // stating a consequence (dna.md §Human wording, not token translation). Never
    // acceptable in any context. BARE_VERDICT covers the verdict restatements that are
    // wrong only when a condition was owed (i.e. on the deferral axes).
    const BARE_VERDICT = /^(build this|go ahead and build this|don'?t build this|do not build this|this is not something we should be doing|reshape|keep the why,?\s*replace the how)[\s.!]*$/i;
    const BARE_LABEL = /^(?:verdict\s*[:\-—]?\s*)?(?:this\s+(?:is|needs?|requires?)\s+)?(?:go|no-?go|re-?shap(?:e|es|ing)|gated|gat(?:e|es|ing)|next[\s-]?cycle|defer(?:red|s)?)[\s.!]*$/i;
    const DEFERRAL_AXES = new Set(["GATED", "NEXT-CYCLE"]);
    if (firstVerdictIdx !== -1 && trimmed) {
      // Strip emphasis BEFORE splitting on sentence boundaries: in "**Build this.** Healthy…"
      // the period is followed by `*`, not whitespace, so splitting first would treat the
      // whole paragraph as one sentence and never match the bare-verdict form.
      const deEmphasised = trimmed.replace(/[*_`]/g, "");
      const firstSentence = (deEmphasised.split(/(?<=[.!?])\s/)[0] || "").trim();
      if (!firstSentence) {
        atomicPlainSentence = null;
      } else if (whenLine && DEFERRAL_AXES.has(whenLine)) {
        atomicPlainSentence = !(BARE_VERDICT.test(firstSentence) || BARE_LABEL.test(firstSentence));
      } else {
        // No deferral axis: a bare LABEL is still never acceptable, but a plain
        // "Build this." / "Don't build this." restatement is fine — those two translate.
        atomicPlainSentence = !BARE_LABEL.test(firstSentence);
      }
    }
  }

  // Every canonical [GO] must carry a When: axis (NOW | GATED | NEXT-CYCLE | NEVER).
  // The axis may sit on the verdict line or within the next 2 lines of the card.
  // Legacy [PASS] records predate the axis and are exempt.
  const goWindow = (i) => lines.slice(i, i + 3).join("\n");
  let goMissingWhenAxis = false;
  for (let i = 0; i < lines.length; i++) {
    if (!/\[GO\]/i.test(lines[i])) continue;
    if (!/\bWhen\s*:/i.test(goWindow(i))) { goMissingWhenAxis = true; break; }
  }

  // Find decision log line anchor: first heading naming a decision surface.
  // Fallback: the first verdict-token line itself (a verdict without a heading
  // still anchors "before vs after the decision"). If neither exists there is
  // no decision to converge before, so PCI is 0.0 — previously every code
  // block counted as pre-decision and legit codeless-of-heading outputs
  // scored PCI ~0.9 (false positive).
  let decisionLogLine = -1;
  for (const h of headings) {
    if (/decision|verdict|socratic|consensus/i.test(h.text)) {
      decisionLogLine = h.line;
      break;
    }
  }
  if (decisionLogLine === -1 && verdicts.length > 0) {
    for (let i = 0; i < lines.length; i++) {
      if (/\[(GO|RESHAPE|NO-GO|PASS|PIVOT|KILL)\]/i.test(lines[i])) {
        decisionLogLine = i + 1;
        break;
      }
    }
  }

  const codeBlocksPreDecision = [];
  const codeBlocksPostDecision = [];

  for (const cb of codeBlocks) {
    if (decisionLogLine !== -1 && cb.startLine < decisionLogLine) {
      codeBlocksPreDecision.push(cb);
    } else {
      codeBlocksPostDecision.push(cb);
    }
  }

  const totalTokens = countTokens(content);
  const preDecisionCodeTokens = codeBlocksPreDecision.reduce((sum, cb) => sum + cb.tokens, 0);

  // PCI: Premature Convergence Index = tokens spent on codegen before decision log / total tokens
  const pci = totalTokens > 0 ? Number((preDecisionCodeTokens / totalTokens).toFixed(4)) : 0.0;

  // ZERO-BLUEPRINT-ON-NO-GO INVARIANT (placement-aware):
  // only code blocks AFTER the first [NO-GO]/[KILL] verdict line breach.
  // Code before the verdict is deliberation context, not a shipped blueprint.
  let noGoLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/\[(NO-GO|KILL)\]/i.test(lines[i])) {
      noGoLine = i + 1;
      break;
    }
  }
  const violatesZeroBlueprintOnNoGo = (hasNoGoVerdict || hasKillVerdict) &&
    (noGoLine === -1
      ? codeBlocks.length > 0
      : codeBlocks.some(cb => cb.startLine > noGoLine));

  return {
    raw: content,
    totalTokens,
    headings,
    codeBlocks,
    verdicts,
    reviewVerdicts,
    shapingVerdicts,
    shapingGate,
    declaredVerdicts,
    declaredReviewVerdicts,
    allVerdicts,
    verdictPrecededByProse,
    atomicPlainSentence,
    hasGoVerdict,
    hasReshapeVerdict,
    hasNoGoVerdict,
    hasPassVerdict,
    hasPivotVerdict,
    hasKillVerdict,
    codeBlocksPreDecision,
    codeBlocksPostDecision,
    pci,
    goMissingWhenAxis,
    violatesZeroBlueprintOnNoGo,
    violatesZeroBlueprintOnKill: violatesZeroBlueprintOnNoGo
  };
}

module.exports = {
  parseMarkdownAST,
  VERDICT_FORMS,
  REVIEW_VERDICT_FORMS,
  SHAPING_FORMS,
  normalizeShapingGate,
  normalizeVerdict,
  normalizeReviewVerdict
};
