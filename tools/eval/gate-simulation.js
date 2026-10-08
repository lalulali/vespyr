/**
 * Gate simulation — proves what the parser produces per context, and whether the
 * plain-language mandate holds. Deterministic: no model, no network.
 *
 *   node tools/eval/gate-simulation.js
 */
const { parseMarkdownAST } = require("./lib/ast");

/** Minimal harness: applies the two opt-in tier0 gates the way tier0-judge does. */
function simulate(label, context, output) {
  const ast = parseMarkdownAST(output);
  const decision = ast.verdicts.join(", ") || "NONE";
  const review = ast.reviewVerdicts.join(", ") || "NONE";
  const when = /\[GO\]/i.test(output) ? (/\bWhen\s*:/i.test(output) ? "ok" : "MISSING") : "n/a";
  const prose = ast.verdictPrecededByProse;
  const nl = prose === null ? "n/a" : prose ? "plain-first" : "TOKEN-FIRST";
  const zeroBp = ast.violatesZeroBlueprintOnNoGo ? "BREACH" : "clean";
  return { label, context, decision, review, when, nl, zeroBp, _ast: ast };
}

const CASES = [
  // ---------- Decision Gate, three stakes levels ----------
  {
    label: "D1",
    context: "LOW stakes — hobby idea, reversible (Sunday project)",
    output: `Don't build this — nothing here needs building. Your dog is fine. It's a nice afternoon, not a company.

VERDICT: [NO-GO]`
  },
  {
    label: "D2",
    context: "MEDIUM stakes — ships to real users (meal-planning app)",
    output: `Keep the why, replace the how. Busy parents really do lose evenings to meal planning — that part is real. But an app that plans meals doesn't capture it; they'd cancel in a week, and a Saturday grocery-list template already gets them more value than anything you'd build.

VERDICT: [RESHAPE]
Survived: the need, not the mechanism
Next: shadow 5 parents on a Saturday before writing code — @founder, Friday`
  },
  {
    label: "D3",
    context: "HIGH stakes — irreversible + spend (data-model choice)",
    output: `Build this. The queue design clears the throughput bar and the migration is reversible, so this is the one to bet on.

VERDICT: [GO] — When: GATED
Audited: the dispatch-queue data model
Survived: everything — ordering invariant holds; 1.2k req/s measured on the staging replica
Because: 1.2k req/s on staging replica, p99 41ms, 0 duplicate deliveries across 3 runs
Next: shadow dispatch for one shift before cutover — @architect, 2026-10-11`
  },
  // ---------- Review Gate ----------
  {
    label: "R1",
    context: "Review — claim reproduced on disk",
    output: `Confirmed — I reran it and it holds. The suite is green at 783/783 and the manifest verifies 358/358.

[CONFIRMED]`
  },
  {
    label: "R2",
    context: "Review — real work, overstated claim",
    output: `Partly true. The rate limiter is real and the tests exist, but "race-condition safe" is not what the suite proves — it runs the single-threaded path only.

[PARTIAL]`
  },
  {
    label: "R3",
    context: "Review — claim contradicted by evidence",
    output: `That's not true. The report says the endpoint was never called; the access log shows 14,203 calls to it last Tuesday alone.

[FALSIFIED]`
  },
  // ---------- Two anti-patterns the gates must catch ----------
  {
    label: "X1",
    context: "BAD — bare token, no plain sentence (low stakes)",
    output: `VERDICT: [RESHAPE]`
  },
  {
    label: "X2",
    context: "BAD — option menu smuggled after a [NO-GO]",
    output: `Don't build this. Nothing survives the audit.

VERDICT: [NO-GO]

\`\`\`
APPROACH A: Plan B
  Effort: S
\`\`\``
  }
];

const rows = CASES.map((c) => simulate(c.label, c.context, c.output));

// ---------- Report ----------
const w = (s, n) => String(s).padEnd(n);
console.log("\n=== GATE SIMULATION — what the parser produces per context ===\n");
console.log(w("ID", 4) + w("CONTEXT", 56) + w("DECISION", 10) + w("REVIEW", 11) + w("When:", 8) + w("LANGUAGE", 12) + "ZERO-BP");
console.log("-".repeat(119));
for (const r of rows) {
  console.log(
    w(r.label, 4) + w(r.context, 56) + w(r.decision, 10) + w(r.review, 11) + w(r.when, 8) + w(r.nl, 12) + r.zeroBp
  );
}

// ---------- Assertions: the simulation fails loudly if a gate stops working ----------
const problems = [];
const by = Object.fromEntries(rows.map((r) => [r.label, r]));

if (by.D1.decision !== "NO-GO") problems.push("D1: expected [NO-GO] to be detected");
if (by.D2.decision !== "RESHAPE") problems.push("D2: expected [RESHAPE] to be detected");
if (by.D3.decision !== "GO") problems.push("D3: expected [GO] to be detected");
if (by.D3.when !== "ok") problems.push("D3: [GO] must carry When:");

if (by.R1.review !== "CONFIRMED") problems.push("R1: expected [CONFIRMED] on the Review Gate");
if (by.R2.review !== "PARTIAL") problems.push("R2: expected [PARTIAL] on the Review Gate");
if (by.R3.review !== "FALSIFIED") problems.push("R3: expected [FALSIFIED] on the Review Gate");

// Gate separation: a Review token must never appear in the Decision list, or vice versa.
for (const r of rows) {
  if (r.review !== "NONE" && r.decision !== "NONE") problems.push(`${r.label}: gates bled into each other`);
  for (const rv of r._ast.reviewVerdicts) {
    if (r._ast.verdicts.includes(rv)) problems.push(`${r.label}: ${rv} leaked into the Decision gate list`);
  }
}

// Plain-sentence mandate: every legitimate case leads with prose; X1 must fail it.
for (const id of ["D1", "D2", "D3", "R1", "R2", "R3", "X2"]) {
  if (by[id]._ast.verdictPrecededByProse !== true) problems.push(`${id}: should satisfy Plain-Sentence-First`);
}
if (by.X1._ast.verdictPrecededByProse !== false) problems.push("X1: bare token should FAIL Plain-Sentence-First");

// Zero-blueprint: X2 smuggled a fenced menu after [NO-GO]; D3/R3 must stay clean.
if (by.X2.zeroBp !== "BREACH") problems.push("X2: fenced menu after [NO-GO] must breach Zero-Blueprint");
for (const id of ["D1", "D2", "D3", "R1", "R2", "R3"]) {
  if (by[id].zeroBp !== "clean") problems.push(`${id}: false Zero-Blueprint breach`);
}

console.log("");
if (problems.length) {
  console.log("✗ SIMULATION FAILED — a gate stopped working:\n");
  for (const p of problems) console.log("  - " + p);
  process.exit(1);
}
console.log("✓ All 8 simulation cases behaved as specified. Gates detected, kept separate,");
console.log("  plain-language mandate held, Zero-Blueprint caught the smuggled menu.");
console.log("");