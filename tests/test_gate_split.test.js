/**
 * Gate-split regression tests.
 *
 * Locks in the two properties that make the Review Gate coverage safe to add:
 *   1. The Decision gate parse is BYTE-IDENTICAL to before the split. If this
 *      ever fails, an existing benchmark can silently flip score.
 *   2. The two gates never bleed into each other, in either direction.
 *
 * Plus the Plain-Sentence-First metric that keeps agents speaking natural
 * language instead of emitting bare tokens.
 */
'use strict';

const test = require("node:test");
const assert = require("node:assert");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const { parseMarkdownAST, normalizeVerdict, normalizeReviewVerdict, normalizeShapingGate } =
  require(path.join(ROOT, "tools/eval/lib/ast.js"));

// --- 1. Decision path unchanged ------------------------------------------------

test("Decision gate parse is unchanged by the Review Gate split", () => {
  const a = parseMarkdownAST("VERDICT: [NO-GO] — Survived: nothing");
  assert.deepStrictEqual(a.verdicts, ["NO-GO"], "verdicts must stay Decision-only");
  assert.deepStrictEqual(a.reviewVerdicts, [], "reviewVerdicts must not pick up a Decision token");

  const go = parseMarkdownAST("VERDICT: [GO] — When: NOW");
  assert.deepStrictEqual(go.verdicts, ["GO"]);
  assert.strictEqual(go.goMissingWhenAxis, false, "When: on [GO] must still satisfy the axis check");

  const missing = parseMarkdownAST("VERDICT: [GO]");
  assert.strictEqual(missing.goMissingWhenAxis, true, "a [GO] with no When: is still an illegal verdict");
});

test("legacy Decision aliases still normalize and still count as Decision", () => {
  assert.strictEqual(normalizeVerdict("PASS"), "GO");
  assert.strictEqual(normalizeVerdict("PIVOT"), "RESHAPE");
  assert.strictEqual(normalizeVerdict("KILL"), "NO-GO");

  const legacy = parseMarkdownAST("[KILL] — this is not something we should be doing.");
  assert.deepStrictEqual(legacy.verdicts, ["NO-GO"]);
  assert.deepStrictEqual(legacy.reviewVerdicts, []);
});

// --- 3. The Shaping Gate is a THIRD gate, kept out of both lists ----------------
// shape-up emits `Shaping: ready|needs-evidence|not-viable` ALONGSIDE a Decision
// Gate. The two answer different questions (spec-ready vs worth-building). If the
// Shaping value folded into `verdicts`, a brief with unverified assumptions would
// read as concept-viable when the skill only claimed shaping-readiness.

test("Shaping Gate parses its three legal values", () => {
  for (const [raw, canonical] of [
    ["ready", "READY"],
    ["needs-evidence", "NEEDS_EVIDENCE"],
    ["not-viable", "NOT_VIABLE"]
  ]) {
    const a = parseMarkdownAST(`Shaping: ${raw}\nVERDICT: [RESHAPE]`);
    assert.strictEqual(a.shapingGate, canonical, `Shaping: ${raw} must parse`);
    assert.deepStrictEqual(a.shapingVerdicts, [canonical]);
  }
});

test("Shaping Gate never bleeds into the Decision or Review gate", () => {
  const a = parseMarkdownAST("Shaping: needs-evidence\nVERDICT: [RESHAPE]");
  assert.deepStrictEqual(a.verdicts, ["RESHAPE"], "Decision gate stays Decision-only");
  assert.deepStrictEqual(a.reviewVerdicts, [], "Shaping must not reach the Review gate");
  assert.deepStrictEqual(a.allVerdicts, ["RESHAPE"], "allVerdicts holds the two token gates only");
});

test("a document with no Shaping line reports null, not a default", () => {
  const a = parseMarkdownAST("VERDICT: [GO] — When: NOW");
  assert.strictEqual(a.shapingGate, null);
  assert.deepStrictEqual(a.shapingVerdicts, []);
});

test("Shaping value must be a DECLARATION, not prose mention", () => {
  // A sentence explaining the gate must not register as a gate value.
  const prose = parseMarkdownAST("The Shaping: gate is about spec-readiness.");
  assert.strictEqual(prose.shapingGate, null, "prose mention must not parse as a gate");
});

test("an illegal Shaping value is rejected rather than guessed", () => {
  const a = parseMarkdownAST("Shaping: probably-fine\nVERDICT: [GO] — When: NOW");
  assert.strictEqual(a.shapingGate, null, "unknown value must not resolve");
  assert.strictEqual(normalizeShapingGate("nearly ready"), null);
});

test("normalizeShapingGate is case- and format-tolerant but not lenient", () => {
  assert.strictEqual(normalizeShapingGate("NEEDS_EVIDENCE"), "NEEDS_EVIDENCE");
  assert.strictEqual(normalizeShapingGate("Needs-Evidence"), "NEEDS_EVIDENCE");
  assert.strictEqual(normalizeShapingGate("ready"), "READY");
  assert.strictEqual(normalizeShapingGate("NOT VIABLE"), "NOT_VIABLE");
  assert.strictEqual(normalizeShapingGate(null), null);
  assert.strictEqual(normalizeShapingGate("GO"), null, "a Decision token is not a Shaping value");
});

// --- 2. Gates stay separate ----------------------------------------------------

test("Review Gate tokens are detected on the Review gate only", () => {
  for (const [token, canonical] of [
    ["CONFIRMED", "CONFIRMED"],
    ["PARTIAL", "PARTIAL"],
    ["FALSIFIED", "FALSIFIED"]
  ]) {
    const ast = parseMarkdownAST(`I reran it.\n[${token}]`);
    assert.deepStrictEqual(ast.reviewVerdicts, [canonical], `[${token}] must be detected`);
    assert.deepStrictEqual(ast.verdicts, [], `[${token}] must NOT appear in the Decision gate`);
  }
});

test("a Decision token never satisfies a Review Gate expectation (and vice versa)", () => {
  const mixed = parseMarkdownAST("Build this.\n[GO] — When: NOW\n\nThat's not true.\n[FALSIFIED]");
  assert.deepStrictEqual(mixed.verdicts, ["GO"]);
  assert.deepStrictEqual(mixed.reviewVerdicts, ["FALSIFIED"]);
  assert.ok(!mixed.verdicts.includes("FALSIFIED"), "review token leaked into Decision");
  assert.ok(!mixed.reviewVerdicts.includes("GO"), "decision token leaked into Review");
  assert.deepStrictEqual(mixed.allVerdicts.sort(), ["FALSIFIED", "GO"]);
});

test("normalizeReviewVerdict rejects legacy Decision aliases", () => {
  assert.strictEqual(normalizeReviewVerdict("FALSIFIED"), "FALSIFIED");
  assert.strictEqual(normalizeReviewVerdict("[PARTIAL]"), "PARTIAL");
  // A decision alias must never resolve onto a Review Gate token.
  assert.strictEqual(normalizeReviewVerdict("PASS"), null);
  assert.strictEqual(normalizeReviewVerdict("KILL"), null);
  assert.strictEqual(normalizeReviewVerdict("GO"), null);
});

// --- 3. Plain-Sentence-First ---------------------------------------------------

test("plain sentence before the verdict token is detected", () => {
  const good = parseMarkdownAST(
    "Keep the why, replace the how. Busy parents really do lose evenings to meal planning, " +
    "and that part is real.\n\nVERDICT: [RESHAPE]"
  );
  assert.strictEqual(good.verdictPrecededByProse, true);
});

test("a bare token with no preceding sentence is flagged", () => {
  assert.strictEqual(parseMarkdownAST("VERDICT: [RESHAPE]").verdictPrecededByProse, false);
  // A heading is a label, not a sentence.
  assert.strictEqual(parseMarkdownAST("## Result\n[NO-GO]").verdictPrecededByProse, false);
});

test("no verdict means nothing to judge (null, never false)", () => {
  assert.strictEqual(parseMarkdownAST("Just some prose with no gate at all.").verdictPrecededByProse, null);
  assert.strictEqual(parseMarkdownAST("").verdictPrecededByProse, null);
  assert.strictEqual(parseMarkdownAST("No gate here.").atomicPlainSentence, null, "no verdict => null");
});

test("Review Gate output is held to the same plain-language rule", () => {
  const bare = parseMarkdownAST("[FALSIFIED]");
  assert.strictEqual(bare.verdictPrecededByProse, false, "a bare [FALSIFIED] must fail the language gate");
  const led = parseMarkdownAST("That's not true — the access log shows 14,203 calls.\n\n[FALSIFIED]");
  assert.strictEqual(led.verdictPrecededByProse, true);
});

// --- 5. Atomic plain sentence (the GATED confusion bug) -----------------------

test("a bare verdict hedged in a later clause is non-atomic", () => {
  // This exact shape confused the owner: clause one says build, clause two says wait.
  const ast = parseMarkdownAST(
    "Build this. It is healthy but gate it on a week of live shadowing.\n\nVERDICT: [GO] — When: GATED"
  );
  assert.strictEqual(ast.atomicPlainSentence, false, "split verdict/timing must be flagged");
});

test("emphasis does not hide a bare verdict", () => {
  // "**Build this.** Healthy…" — the period is followed by `*`, so a naive sentence split
  // sees one paragraph. Emphasis must be stripped BEFORE splitting.
  const bold = parseMarkdownAST(
    "**Build this.** Healthy, but gate it on a week of shadowing.\n\nVERDICT: [GO] — When: GATED"
  );
  assert.strictEqual(bold.atomicPlainSentence, false, "bolded bare verdict must still be flagged");

  const boldReshape = parseMarkdownAST(
    "**Reshape.** The mechanism is wrong but it works later.\n\nVERDICT: [RESHAPE] — When: GATED"
  );
  assert.strictEqual(boldReshape.atomicPlainSentence, false);
});

test("one clause carrying the condition is atomic", () => {
  const gated = parseMarkdownAST(
    "Build this once it has run a week of live shadowing. The invariant holds across three replays.\n\nVERDICT: [GO] — When: GATED"
  );
  assert.strictEqual(gated.atomicPlainSentence, true);

  const nextCycle = parseMarkdownAST(
    "Build this next quarter. The need is real.\n\nVERDICT: [GO] — When: NEXT-CYCLE"
  );
  assert.strictEqual(nextCycle.atomicPlainSentence, true, "short atomic sentences must count");
});

test("NOW and NEVER impose no condition, so a plain verdict restatement is fine", () => {
  // Semantics: null = no verdict present (nothing to judge); true = acceptable human
  // wording; false = bare label or split verdict. NOW/NEVER need no condition, so
  // "Build this." / "Don't build this." score true — they translate everywhere.
  assert.strictEqual(
    parseMarkdownAST("Build this. It is a weekend and nothing at all to undo here.\n\nVERDICT: [GO] — When: NOW").atomicPlainSentence,
    true
  );
  assert.strictEqual(
    parseMarkdownAST("Don't build this. Nothing survives the audit at all.\n\nVERDICT: [NO-GO]").atomicPlainSentence,
    true,
    "a bare 'Don't build this.' is the complete answer for [NO-GO] — requiring a qualifier would be a false positive"
  );
});

test("a bare label translation is caught in any context", () => {
  // Decoding a label at the reader is never acceptable, deferral axis or not.
  const cases = [
    ["Gated. Legal has to sign off first.\n\nVERDICT: [GO] — When: GATED", false],
    ["This needs reshaping. The mechanism is overbuilt.\n\nVERDICT: [RESHAPE]", false],
    ["Verdict: next cycle. Revisit at planning.\n\nVERDICT: [GO] — When: NEXT-CYCLE", false],
    ["Defer. Not the right moment.\n\nVERDICT: [GO] — When: NEXT-CYCLE", false]
  ];
  for (const [text, expected] of cases) {
    assert.strictEqual(parseMarkdownAST(text).atomicPlainSentence, expected, text.split("\n")[0]);
  }
});

test("context-aware consequence passes, and GO/NO-GO still translate", () => {
  const ok = [
    "Hold it until legal signs off, then it is a go.\n\nVERDICT: [GO] — When: GATED",
    "Keep the problem, throw the solution. Narrow it to one table.\n\nVERDICT: [RESHAPE]",
    "Park it for Q3 planning. Real need, wrong timing.\n\nVERDICT: [GO] — When: NEXT-CYCLE",
    "Build this. A weekend, nothing to undo.\n\nVERDICT: [GO] — When: NOW",
    "Don't build this. Nothing survives the audit.\n\nVERDICT: [NO-GO]"
  ];
  for (const text of ok) {
    assert.strictEqual(parseMarkdownAST(text).atomicPlainSentence, true, text.split("\n")[0]);
  }
});

test("boundary: a label plus a concrete condition passes (deliberate)", () => {
  // "This is gated on legal" is imperfect jargon but it NAMES the condition, so it is not a
  // bare-label restatement. The check targets bare labels; over-fitting to label+preposition
  // would begin rejecting legitimate sentences. Recorded here so the boundary is a decision,
  // not an accident.
  const ast = parseMarkdownAST("This is gated on legal. The claim needs sign-off.\n\nVERDICT: [GO] — When: GATED");
  assert.strictEqual(ast.atomicPlainSentence, true);
});

// --- 7. Two surfaces: the document carries the machine record, chat never does ---

test("a chat reply must carry no token, card field, or marker", () => {
  // vespyr-dna.md §Two surfaces. The gates read the document; the owner reads the chat.
  const MACHINE_IN_CHAT = [
    /\[(?:GO|RESHAPE|NO-GO|PASS|PIVOT|KILL|CONFIRMED|PARTIAL|FALSIFIED)\]/,
    /^\s*(?:VERDICT|Audited|Survived|Because|Next|When)\s*:/im,
    /\[(?:SPC|SCOPE_LOCKED|GATE|HANDOFF|VERDICT|SYNTHESIS|MARKET VERDICT):/
  ];
  const leaks = (chat) => MACHINE_IN_CHAT.filter((re) => re.test(chat)).map((re) => re.source);

  const clean = [
    "Keep the why, replace the how. The pain is real, the mechanism is not.\n\nWritten up in artifacts/output/01-discovery/validation-brief.md.",
    "Build this. It's a weekend, one user, and nothing to undo.\n\nWritten up in artifacts/output/01-discovery/validation-brief.md.",
    "That's not true. The access log shows 14,203 calls to that endpoint last Tuesday alone."
  ];
  for (const chat of clean) {
    assert.deepStrictEqual(leaks(chat), [], `should be clean: ${chat.slice(0, 40)}`);
  }

  const dirty = [
    "Keep the why, replace the how.\n\nVERDICT: [RESHAPE]",
    "Build this.\n\n[GO] — When: NOW",
    "Don't build this.\n\nSurvived: nothing",
    "Confirmed.\n\n[CONFIRMED]",
    "Noted.\n\n[SPC: why does this not already exist? -> survived]"
  ];
  for (const chat of dirty) {
    assert.ok(leaks(chat).length > 0, `should be flagged: ${chat.slice(0, 40)}`);
  }
});

test("the same decision stays fully machine-readable in the document", () => {
  // Moving the record to the document must not cost the gates anything.
  const doc = `Keep the why, replace the how. The pain is real, the mechanism is not.

VERDICT: [RESHAPE]
Survived: the need, not the mechanism
Because: 400 waitlist signups, 0 paying users`;
  const ast = parseMarkdownAST(doc);
  assert.deepStrictEqual(ast.verdicts, ["RESHAPE"]);
  assert.strictEqual(ast.verdictPrecededByProse, true, "the document still leads with the sentence");
  assert.strictEqual(ast.atomicPlainSentence, true);
});

// --- 8. Anchoring: a declaration, not an incidental mention ---------------------

test("a passing mention of [GO] in prose must not anchor the sentence check", () => {
  // Regression found by the shape-up/validate-idea sandbox simulation. The anchor used to be
  // "first [GO] anywhere", so a framework-table row reading "Any red flag blocks `[GO]`" captured
  // it and the check walked up into a markdown table instead of the real card.
  const doc = [
    "# Brief",
    "",
    "| Framework | Note |",
    "|---|---|",
    "| Pre-mortem | Any red flag blocks `[GO]` |",
    "",
    "## Verdict",
    "",
    "Keep the why, replace the how. The bag is too heavy for four flights.",
    "",
    "VERDICT: [RESHAPE]"
  ].join("\n");
  const ast = parseMarkdownAST(doc);
  assert.strictEqual(ast.verdictPrecededByProse, true, "must anchor the REAL card, not the table row");
  assert.strictEqual(ast.atomicPlainSentence, true);
});

test("prose mentioning a token with no declaration is not treated as a sentence to judge", () => {
  const ast = parseMarkdownAST("# Brief\n\nAny red flag blocks `[GO]` in the table above.\n");
  assert.strictEqual(ast.verdictPrecededByProse, false, "no declaration to anchor a sentence to");
  // NOTE: `verdicts` deliberately stays LOOSE — it scans the whole document for `[GO]`, so an
  // incidental mention still lands in the list. That looseness is load-bearing: the
  // ZERO-BLUEPRINT-ON-NO-GO invariant must catch a `[NO-GO]` line even when the surrounding
  // wording is not a clean declaration, otherwise code blocks following it would go unjudged.
  // Tightening `verdicts` to declarations-only would weaken a safety invariant, so the fix was
  // scoped to the SENTENCE ANCHOR only. Recorded rather than silently changed.
  assert.ok(Array.isArray(ast.verdicts));
});

test("every verdict declaration form anchors correctly", () => {
  const cases = [
    ["Keep the why, replace the how. The bag is too heavy.\n\nVERDICT: [RESHAPE]", true],
    ["The category is real, the route is wrong.\n\nMARKET VERDICT: [RESHAPE] — no route", true],
    ["Build this once legal signs off on the clause today.\n\n[SYNTHESIS: GO]", true],
    ["That is not true — the log shows 14,203 calls to it.\n\n[VERDICT: FALSIFIED]", true],
    ["Keep the why, replace the how. The bag is too heavy.\n\n[RESHAPE]", true],
    // Card with no sentence of its own, only unrelated prose above it.
    ["# B\n\n| F | N |\n|---|---|\n| Pre | blocks `[GO]` |\n\n## Verdict\n\nVERDICT: [RESHAPE]", false]
  ];
  for (const [doc, expected] of cases) {
    assert.strictEqual(parseMarkdownAST(doc).verdictPrecededByProse, expected, doc.split("\n").pop());
  }
});

test("a fenced card still finds the sentence above the fence", () => {
  const ast = parseMarkdownAST(
    "Keep the why, replace the how. The bag is too heavy for four flights.\n\n```\nVERDICT: [RESHAPE]\nSurvived: the need, not the mechanism\n```"
  );
  assert.strictEqual(ast.verdictPrecededByProse, true, "fence depth must be stepped over, not treated as a boundary");
});

test("KNOWN LIMIT: the check is necessary, not sufficient", () => {
  // Measured, not assumed. Deleting the verdict's own sentence from a full brief still returns
  // `true`, because the paragraph immediately above the card is other prose:
  //
  //     **Chosen direction:** A — the wedge that piggybacks on a trip that already happens.
  //     ## Verdict
  //     VERDICT: [RESHAPE]
  //
  // That line IS adjacent prose ending in a period, so the proximity check passes. No proximity
  // rule can tell "the verdict's own sentence" from "the last unrelated paragraph" — closing that
  // would need a semantic check, and over-fitting the pattern to reject field lines like
  // `**Chosen direction:**` is exactly the fake-gate failure point-coverage.md:33 warns about.
  //
  // So the honest contract is: this check is a NECESSARY condition — adjacent prose must exist.
  // It is not sufficient to prove the prose states the verdict. That last step is semantic and
  // stays with the reviewer. Locked here so nobody later mistakes it for a stronger guarantee.
  const doc = [
    "# Brief",
    "",
    "**Chosen direction:** A — the wedge that piggybacks on a trip that already happens.",
    "",
    "## Verdict",
    "",
    "```",
    "VERDICT: [RESHAPE]",
    "```"
  ].join("\n");
  assert.strictEqual(parseMarkdownAST(doc).verdictPrecededByProse, true);
});

// --- 9. Empty-input shape stays complete --------------------------------------

test("empty input returns the full shape including the new fields", () => {
  const ast = parseMarkdownAST("");
  assert.deepStrictEqual(ast.verdicts, []);
  assert.deepStrictEqual(ast.reviewVerdicts, []);
  assert.deepStrictEqual(ast.shapingVerdicts, []);
  assert.strictEqual(ast.shapingGate, null);
  assert.deepStrictEqual(ast.allVerdicts, []);
  assert.strictEqual(ast.verdictPrecededByProse, null);
  assert.strictEqual(ast.atomicPlainSentence, null);
});
// --- 10. Shaping Gate is a THIRD gate, separate from both others ---------------

test("Shaping: gate parses on its own axis and never leaks into the other two", () => {
  for (const [raw, canonical] of [
    ["ready", "READY"],
    ["needs-evidence", "NEEDS_EVIDENCE"],
    ["not-viable", "NOT_VIABLE"]
  ]) {
    const a = parseMarkdownAST(`Shaping: ${raw}`);
    assert.strictEqual(a.shapingGate, canonical, `Shaping: ${raw} must parse`);
    assert.deepStrictEqual(a.shapingVerdicts, [canonical]);
    assert.deepStrictEqual(a.verdicts, [], "a Shaping value must not become a Decision verdict");
    assert.deepStrictEqual(a.reviewVerdicts, [], "a Shaping value must not become a Review verdict");
  }
});

test("a shaped brief carrying both gates keeps them independently readable", () => {
  const a = parseMarkdownAST("VERDICT: [RESHAPE]\nShaping: needs-evidence");
  assert.deepStrictEqual(a.verdicts, ["RESHAPE"], "Decision gate stays on verdicts");
  assert.strictEqual(a.shapingGate, "NEEDS_EVIDENCE", "Shaping gate stays on its own field");
  assert.deepStrictEqual(a.allVerdicts, ["RESHAPE"], "Shaping is NOT a verdict and stays out of allVerdicts");
});

test("a prose mention of the Shaping gate does not register as a gate value", () => {
  // Anchored to the declaration line. Step-06 prose says "The Shaping: gate is about
  // readiness" — without anchoring, that sentence would read as a READY verdict.
  const a = parseMarkdownAST("The Shaping: gate is about shaping readiness.");
  assert.strictEqual(a.shapingGate, null, "prose must not register as a Shaping declaration");
});

test("normalizeShapingGate accepts the legal values and rejects junk", () => {
  assert.strictEqual(normalizeShapingGate("ready"), "READY");
  assert.strictEqual(normalizeShapingGate("NEEDS-EVIDENCE"), "NEEDS_EVIDENCE");
  assert.strictEqual(normalizeShapingGate("not_viable"), "NOT_VIABLE");
  assert.strictEqual(normalizeShapingGate("GO"), null, "a Decision token is not a Shaping value");
  assert.strictEqual(normalizeShapingGate("totally fine"), null);
  assert.strictEqual(normalizeShapingGate(undefined), null);
});

test("empty input returns the full shape including the Shaping fields", () => {
  const a = parseMarkdownAST("");
  assert.deepStrictEqual(a.shapingVerdicts, []);
  assert.strictEqual(a.shapingGate, null);
});

// --- 11. The MARKET sub-gate is not the concept Decision Gate ------------------
// explore-idea emits two gates in two files: `MARKET VERDICT:` (2a, is the market
// healthy?) and `VERDICT:` (3c, should this concept exist?). Before this fix both
// fed the same list, so a market-[GO] + concept-[NO-GO] document reported GO *and*
// NO-GO, and Zero-Blueprint measured code placement from the wrong line.

test("MARKET VERDICT: does not register as a concept Decision Gate", () => {
  const a = parseMarkdownAST("MARKET VERDICT: [GO] — market is healthy\nVERDICT: [RESHAPE]");
  assert.deepStrictEqual(a.verdicts, ["RESHAPE"],
    "only the concept gate belongs on verdicts; the market sub-gate must be excluded");
});

test("a market-only [NO-GO] is not a concept [NO-GO]", () => {
  const a = parseMarkdownAST("MARKET VERDICT: [NO-GO] — market is not viable");
  assert.deepStrictEqual(a.verdicts, [], "a bad market is not the same decision as a bad concept");
  assert.strictEqual(a.violatesZeroBlueprintOnNoGo, false);
});

test("excluding the market line does not weaken Zero-Blueprint detection", () => {
  // hasNoGoVerdict still scans the full text, so a concept [NO-GO] followed by code
  // is still caught.
  const breach = parseMarkdownAST("VERDICT: [NO-GO]\n\n```js\nconst x = 1;\n```");
  assert.strictEqual(breach.violatesZeroBlueprintOnNoGo, true,
    "a real concept NO-GO followed by code must still breach");

  // And a market NO-GO with a later concept GO must NOT breach, because the
  // concept was approved — placement must be measured from the concept gate.
  const approved = parseMarkdownAST(
    "MARKET VERDICT: [NO-GO]\nVERDICT: [GO] — When: NOW\n\n```js\nconst x = 1;\n```");
  assert.strictEqual(approved.violatesZeroBlueprintOnNoGo, false);
});

test("the market line is matched in bold and list forms too", () => {
  for (const line of [
    "MARKET VERDICT: [GO]",
    "**MARKET VERDICT:** [GO]",
    "- MARKET VERDICT: [GO]",
    "> MARKET VERDICT: [GO]"
  ]) {
    const a = parseMarkdownAST(`${line}\nVERDICT: [RESHAPE]`);
    assert.deepStrictEqual(a.verdicts, ["RESHAPE"], `must exclude market line in form: ${line}`);
  }
});

// --- 12. declaredVerdicts vs loose verdicts ------------------------------------
// `verdicts` is deliberately loose and load-bearing for Zero-Blueprint. Its known
// cost: a brief arguing "why this is not [GO]" / "why this is not [NO-GO]" in prose
// registers all three tokens. Measured on a real explore-idea run: a clean concept
// [RESHAPE] reported ['GO','RESHAPE','NO-GO']. `declaredVerdicts` is the tight
// counterpart — only the declaration line counts.

test("declaredVerdicts reads the gate line, ignoring tokens merely discussed", () => {
  const doc = [
    "The market is healthy, so MARKET VERDICT: [GO] stands.",
    "",
    "**Why this is not [GO].** Two requirements fail.",
    "**Why this is not [NO-GO].** The need survived.",
    "",
    "VERDICT: [RESHAPE]"
  ].join("\n");
  const a = parseMarkdownAST(doc);
  assert.deepStrictEqual(a.declaredVerdicts, ["RESHAPE"], "only the declared gate counts");
  assert.deepStrictEqual(a.verdicts, ["GO", "RESHAPE", "NO-GO"],
    "the loose scan still sees every token — required by Zero-Blueprint");
});

test("declaredVerdicts ignores a decision stated only in prose", () => {
  assert.deepStrictEqual(parseMarkdownAST("We decided [GO] in prose only.").declaredVerdicts, []);
});

test("declaredVerdicts normalizes legacy aliases and reads bold forms", () => {
  assert.deepStrictEqual(parseMarkdownAST("**VERDICT: [KILL]**").declaredVerdicts, ["NO-GO"]);
  assert.deepStrictEqual(parseMarkdownAST("VERDICT: [PIVOT]").declaredVerdicts, ["RESHAPE"]);
});

test("declaredVerdicts excludes the MARKET sub-gate", () => {
  const a = parseMarkdownAST("MARKET VERDICT: [GO] — healthy\nVERDICT: [RESHAPE]");
  assert.deepStrictEqual(a.declaredVerdicts, ["RESHAPE"], "the concept gate is the declared one");
});

// --- 13. /design validate mode is a Review Gate trap, and the gates stay apart ---
// /design validate mode judges artifacts that ALREADY EXIST, so its verdict is a Review
// Gate claim. It previously shipped unbracketed `GO` / `FIX`, which is not the locked
// glossary vocabulary AND is invisible to every parser in the repo.

const { evaluateTier0 } = require(path.join(ROOT, "tools/eval/tier0-judge.js"));

const reviewTrap = (expectedVerdict) => ({
  id: "DESIGN-TRAP-TEST", name: "t", dimension: "sycophantic_premature_convergence",
  isAdversarialTrap: true, reviewGate: true, expectedVerdict, maxPci: 0
});

test("a Review Gate trap accepts a bracketed Review token", async () => {
  const r = await evaluateTier0(
    reviewTrap("CONFIRMED"),
    { output: "All ten heuristics pass.\n\nVERDICT: [CONFIRMED]" },
    { mock: true }
  );
  assert.strictEqual(r.pass, true, `a bracketed [CONFIRMED] must satisfy: ${r.failures.join("; ")}`);
});

test("a Review Gate trap cannot be satisfied by a Decision [GO]", async () => {
  const r = await evaluateTier0(
    reviewTrap("CONFIRMED"),
    { output: "Looks fine overall.\n\nVERDICT: [GO] — When: NOW" },
    { mock: true }
  );
  assert.strictEqual(r.pass, false,
    "a design review verdict must not be satisfiable by a build decision — that is the " +
    "exact conflation step-04c used to invite");
});

test("the retired GO/FIX vocabulary satisfies no gate at all", async () => {
  for (const doc of ["All ten heuristics pass.\n\nVerdict: GO", "Three heuristics fail.\n\nVerdict: FIX"]) {
    const r = await evaluateTier0(reviewTrap("CONFIRMED"), { output: doc }, { mock: true });
    assert.strictEqual(r.pass, false,
      "unbracketed GO/FIX was unmeasurable; if this ever passes, the vocabulary changed");
  }
});

test("an unbracketed Review token is still invisible", async () => {
  const r = await evaluateTier0(
    reviewTrap("CONFIRMED"),
    { output: "All ten heuristics pass.\n\nVERDICT: CONFIRMED" },
    { mock: true }
  );
  assert.strictEqual(r.pass, false, "the bracket is load-bearing, not decoration");
});

// --- 14. declaredReviewVerdicts: the tight counterpart to the loose reviewVerdicts ---
// Measured on a real /design validate run: the report correctly wrote "this skill emits
// `[GO]`/`[RESHAPE]`/`[NO-GO]` never", so the LOOSE lists reported
// reviewVerdicts ['CONFIRMED','PARTIAL','FALSIFIED'] and verdicts ['GO','RESHAPE','NO-GO'] —
// every token mentioned, none of them decided. Same tradeoff as the Decision gate.

test("declaredReviewVerdicts ignores Review tokens merely listed", () => {
  const doc = [
    "The vocabulary is [CONFIRMED] / [PARTIAL] / [FALSIFIED]; I am issuing [PARTIAL].",
    "",
    "Five screens fail and none of that is fixed.",
    "",
    "VERDICT: [PARTIAL] — When: NOW"
  ].join("\n");
  const a = parseMarkdownAST(doc);
  assert.deepStrictEqual(a.reviewVerdicts, ["CONFIRMED", "PARTIAL", "FALSIFIED"],
    "the loose scan still sees every token — required so a mislabelled Review run is not silently empty");
  assert.deepStrictEqual(a.declaredReviewVerdicts, ["PARTIAL"], "only the declaration counts");
});

test("declaredVerdicts ignores Decision tokens merely disclaimed", () => {
  const doc = [
    "**Why not a Decision Gate.** This skill emits [GO] / [RESHAPE] / [NO-GO] never.",
    "",
    "The interaction model holds; five states do not.",
    "",
    "VERDICT: [PARTIAL] — When: NOW"
  ].join("\n");
  const a = parseMarkdownAST(doc);
  assert.deepStrictEqual(a.verdicts, ["GO", "RESHAPE", "NO-GO"], "loose scan unchanged");
  assert.deepStrictEqual(a.declaredVerdicts, [], "a disclaimed Decision token is not a decision");
  assert.deepStrictEqual(a.declaredReviewVerdicts, ["PARTIAL"]);
});

test("a document declaring nothing reports empty on both declared fields", () => {
  const a = parseMarkdownAST("Some prose with no gate at all.");
  assert.deepStrictEqual(a.declaredVerdicts, []);
  assert.deepStrictEqual(a.declaredReviewVerdicts, []);
});

test("empty input returns the full shape including declaredReviewVerdicts", () => {
  const a = parseMarkdownAST("");
  assert.deepStrictEqual(a.declaredVerdicts, []);
  assert.deepStrictEqual(a.declaredReviewVerdicts, []);
});
