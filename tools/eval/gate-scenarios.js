/**
 * Gate scenarios — what verdict INFORMATION each context produces.
 *
 * Two surfaces, per vespyr-dna.md §Two surfaces:
 *   chat      — what the owner reads. Human wording ONLY. No tokens, no card, no markers.
 *   document  — the brief. Plain sentence + full machine record. This is what the gates read.
 *
 * Deterministic: no model, no network. Reads real output shapes through the same
 * parser the eval runner uses, so what you see here is what the gates will read.
 *
 *   node tools/eval/gate-scenarios.js          # full scenario -> verdict mapping
 *   node tools/eval/gate-scenarios.js --brief  # routing table only
 */
"use strict";

const { parseMarkdownAST } = require("./lib/ast");

/** Any machine token or marker that must never appear in a chat reply. */
const MACHINE_IN_CHAT = [
  /\[(?:GO|RESHAPE|NO-GO|PASS|PIVOT|KILL|CONFIRMED|PARTIAL|FALSIFIED)\]/,
  /^\s*(?:VERDICT|Audited|Survived|Because|Next|When)\s*:/im,
  /\[(?:SPC|SCOPE_LOCKED|GATE|HANDOFF|VERDICT|SYNTHESIS|MARKET VERDICT):/
];

/** A chat reply is clean when it carries no token, no card field, no marker. */
function chatLeaksTokens(chat) {
  return MACHINE_IN_CHAT.filter((re) => re.test(chat)).map((re) => re.source);
}

/** Pull the verdict card fields the way a reader (and a gate) would. */
function extract(output) {
  const ast = parseMarkdownAST(output);
  const field = (name) => {
    // `When:` rides inline on the VERDICT line in the canonical card
    // (`VERDICT: [GO] — When: NOW`), so accept both that and a standalone field line.
    const inline = output.match(new RegExp(`\\b${name}\\s*:\\s*([A-Za-z0-9][^\\n]*?)(?=\\s{2,}—|\\s*\\n|$)`, "i"));
    if (inline) return inline[1].trim();
    const own = output.match(new RegExp(`^${name}\\s*:\\s*(.+)$`, "im"));
    return own ? own[1].trim() : null;
  };
  // Survived/Because span the rest of their line (they carry an em-dash clause).
  const lineField = (name) => {
    const m = output.match(new RegExp(`^${name}\\s*:\\s*(.+)$`, "im"));
    return m ? m[1].trim() : null;
  };
  const decision = ast.verdicts[0] || null;
  const review = ast.reviewVerdicts[0] || null;
  // The plain sentence: prose before the first gate token.
  const firstToken = output.split("\n").findIndex((l) => /\[[A-Z][A-Z-]*(?:\s*\|\s*[A-Z-]+)*\]/.test(l));
  let plain = null;
  if (firstToken > 0) {
    plain = output
      .split("\n")
      .slice(0, firstToken)
      .filter((l) => l.trim() && !/^\s*#{1,6}\s/.test(l) && !/^\s*```/.test(l))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return {
    gate: decision ? "Decision" : review ? "Review" : "none",
    verdict: decision || review,
    when: field("When"),
    audited: lineField("Audited"),
    survived: lineField("Survived"),
    because: lineField("Because"),
    next: lineField("Next"),
    plain,
    plainFirst: ast.verdictPrecededByProse,
    atomic: ast.atomicPlainSentence,
    zeroBlueprint: ast.violatesZeroBlueprintOnNoGo ? "BREACH" : "clean",
    goAxisOk: decision !== "GO" || ast.goMissingWhenAxis === false
  };
}

const SCENARIOS = [
  // ---------- Decision Gate: same evidence, three stakes levels ----------
  {
    id: "S1",
    stakes: "HIGH",
    scenario: "Dispatch-queue data model. Irreversible, org-wide, real migration cost. Behavioural demand proven: 14 dispatcher teams already pay for a competing queue; status quo costs them 6 engineer-hours/week. But the gating condition (a week of live shadowing) is NOT yet met.",
    output: `Build this once it has run a week of live shadowing — not before. The ordering invariant holds and the migration is reversible, so this is the one to bet on, but today the condition is unmet.

VERDICT: [GO] — When: GATED
Audited: the dispatch-queue data model
Survived: everything — ordering invariant holds; no duplicate delivery across 3 migration replays
Because: 1.2k req/s on the staging replica, p99 41ms, 0 duplicate deliveries across 3 replays
Next: shadow dispatch for one shift before cutover — @architect, 2026-10-11`
  },
  {
    id: "S2",
    stakes: "HIGH",
    scenario: "Same idea as S1, but the condition to gate on is already met — the staging replica has run 30 days under production load.",
    output: `Build this. Thirty days of production-shaped load cleared the bar, so this is unconditional now.

VERDICT: [GO] — When: NOW
Audited: the dispatch-queue data model
Survived: everything — ordering invariant holds under production load
Because: 30 days live-shaped load, 1.2k req/s sustained, p99 41ms, 0 duplicate deliveries
Next: schedule the cutover — @architect, 2026-10-18`
  },
  {
    id: "S3",
    stakes: "LOW",
    scenario: "Same idea as S1, but it is a weekend spike on a side project with one user and no migration. Nothing is at stake.",
    output: `Build this. It's a weekend, one user, and nothing to undo.

VERDICT: [GO] — When: NOW`
  },
  {
    id: "S4",
    stakes: "MED",
    scenario: "AI meal-planning app for busy parents. The pain is real and observed, but the evidence is a 400-person waitlist and two verbal asks — interest, not behaviour. No measured status-quo cost.",
    output: `Keep the why, replace the how. Busy parents really do lose evenings to meal planning — that part is real and you have watched it happen. But nobody has paid, nobody has churned, and nobody has changed their Sunday routine over it, so the app does not capture the pain. A shared Saturday grocery list gets them more value this week than anything you'd build.

VERDICT: [RESHAPE]
Audited: the AI meal-planning app concept
Survived: the need, not the mechanism
Because: 400 waitlist signups, 0 paying users, 0 observed weekly use — interest is not behaviour
Next: run the zero-cost default with 5 parents for two weekends before writing code — @founder, Friday`
  },
  {
    id: "S5",
    stakes: "MED",
    scenario: "Bulk CSV export on an existing SaaS with 12k users. The feature is real and the users asked for it, but engineering says it is a 5-month platform change, not a 2-week one.",
    output: `Keep the why, replace the how. The request is legitimate — you have 340 support tickets asking for it. But "bulk export" as specified is a 5-month platform change wearing a 2-week label, and the wedge that actually ships in a fortnight is the single-table streaming export.

VERDICT: [RESHAPE]
Audited: the bulk-export feature scope
Survived: the need, not the mechanism
Because: 340 support tickets, but full scope is 5 months against an assumed 2
Next: scope the single-table streaming export and re-run validation on that alone — @founder, Monday`
  },
  {
    id: "S6",
    stakes: "LOW",
    scenario: "An app that helps people cut grocery spend. Nobody does anything about this today, there is no workaround, and people just accept what they spend.",
    output: `Don't build this — nothing here needs building. If nobody spends a minute or a dollar trying to fix their grocery bill, there is no pain to remove, and a cheaper version of this idea still has no customer.

VERDICT: [NO-GO]`
  },
  {
    id: "S7",
    stakes: "HIGH",
    scenario: "AI tool that auto-files HIPAA-compliant insurance claims for US clinics. Attractive market, but the compliance path requires licences nobody in the team holds and a 14-month regulatory runway.",
    output: `Don't build this. The need is real, but the thing that makes it hard — HIPAA compliance — is the whole product, and you cannot buy your way past it in a sprint. Fourteen months of regulatory work with licences nobody on the team holds is not a wedge, it is the entire company.

VERDICT: [NO-GO]
Audited: the HIPAA auto-claims concept
Survived: nothing — the compliance requirement is the product
Because: 14-month regulatory runway, 3 licences none of the team holds, zero shipped comparable
Next: go back to problem discovery on the clinician admin workflow — /unpack-problem, @founder`
  },
  // ---------- Review Gate ----------
  {
    id: "S8",
    stakes: "n/a",
    scenario: "Claim under audit: \"the suite is green and the manifest verifies.\" The reviewer reruns both.",
    output: `Confirmed — I reran it and it holds. 793/793 tests pass and 358/358 files verify against the manifest.

[CONFIRMED]`
  },
  {
    id: "S9",
    stakes: "n/a",
    scenario: "Claim under audit: \"the rate limiter is race-condition safe.\" A limiter and tests exist — but the suite only exercises the single-threaded path.",
    output: `Partly true. The limiter is real and it is tested, but "race-condition safe" is not what the suite proves: every test runs the single-threaded path, so the concurrency claim is untested rather than confirmed.

[PARTIAL]`
  },
  {
    id: "S10",
    stakes: "n/a",
    scenario: "Claim under audit: \"the endpoint was never called in production.\" The access log is checked before answering.",
    output: `That's not true. The access log shows 14,203 calls to that endpoint last Tuesday alone, so the record is contradicted rather than merely unproven.

[FALSIFIED]`
  },
  // ---------- SAME TOKEN, DIFFERENT HUMAN WORDING BY CONTEXT ----------
  // The machine record is identical in C1/C2 and C3/C4. Only the sentence changes,
  // because the practical consequence differs. This is the whole point: the token is a
  // classification for the machine, the sentence is for the person.
  {
    id: "C1",
    stakes: "HIGH",
    context: "ENTERPRISE — gated on legal sign-off",
    scenario: "Same [GO]·GATED record as C2, read by a compliance officer at a company where sign-off is a real step with a real owner.",
    output: `Hold it until legal signs off on the retention clause, then it is a go. The architecture is sound and the migration is reversible — the only thing standing between this and a build is a signature.

VERDICT: [GO] — When: GATED
Audited: the dispatch-queue data model
Survived: everything
Because: 1.2k req/s on the staging replica, p99 41ms, legal review is the sole open item
Next: get the retention clause to legal — @architect, 2026-10-09`
  },
  {
    id: "C2",
    stakes: "HIGH",
    context: "SOLO FOUNDER — the same gate is meaningless",
    scenario: "Identical machine record to C1, read by a solo founder. 'Gated' would be noise — there is no legal department, so the condition is already met.",
    output: `Build this — there is no legal sign-off to wait for, and the architecture holds up. The gate an enterprise would sit behind simply does not exist for you.

VERDICT: [GO] — When: GATED
Audited: the dispatch-queue data model
Survived: everything
Because: 1.2k req/s on the staging replica, p99 41ms, 0 duplicate deliveries
Next: start the migration this weekend — @founder`
  },
  {
    id: "C3",
    stakes: "MED",
    context: "STARTUP PLANNING — next cycle means a specific quarter",
    scenario: "Same [RESHAPE] record as C4, read inside a quarterly planning cycle where 'next cycle' has a concrete name.",
    output: `Park it for Q3 planning. The need is real — nobody else serves dispatch teams — but building it now eats the quarter we need for the churn fix, which is a fire.

VERDICT: [GO] — When: NEXT-CYCLE
Audited: the dispatch-queue product bet
Survived: everything — worth building, wrong quarter
Because: churn fix is a live fire this quarter; queue demand is 14 teams and steady
Next: put it in the Q3 planning doc with the churn fix sequenced first — @founder`
  },
  {
    id: "C4",
    stakes: "MED",
    context: "SAME BET, INCREMENTAL TEAM — 'next cycle' has no meaning here",
    scenario: "Identical machine record to C3, but the team ships continuously, so 'next cycle' would confuse rather than inform.",
    output: `Ship the 10% of this that people ask for every week, and leave the rest. Full scope is six months; the single-queue streaming export is three days and it is what the 14 teams actually mention.

VERDICT: [RESHAPE]
Audited: the dispatch-queue product bet
Survived: the need, not the mechanism
Because: 14 teams ask for streaming export, 0 ask for the full platform
Next: ship the streaming export and re-measure — @developer, Thursday`
  },
  // ---------- Shapes the gates must catch ----------
  {
    id: "X1",
    stakes: "MED",
    context: "ANTI-PATTERN — the agent pastes the machine card into the chat reply.",
    scenario: "Document is correct; the chat reply wrongly repeats the card, so the owner has to decode [RESHAPE].",
    output: `Keep the why, replace the how. The pain is real, the mechanism is not.

VERDICT: [RESHAPE]
Survived: the need, not the mechanism
Because: 400 waitlist signups, 0 paying users`,
    chat: `Keep the why, replace the how. The pain is real, the mechanism is not.

VERDICT: [RESHAPE]
Survived: the need, not the mechanism
Because: 400 waitlist signups, 0 paying users`
  },
  {
    id: "X2",
    stakes: "LOW",
    scenario: "ANTI-PATTERN — the document leads with a bare token instead of plain language.",
    output: `VERDICT: [RESHAPE]`
  },
  {
    id: "X3",
    stakes: "MED",
    scenario: "ANTI-PATTERN — after correctly refusing the idea, the document hands over an option menu anyway.",
    output: `Don't build this. Nothing survives the audit.

VERDICT: [NO-GO]

\`\`\`
APPROACH A: Plan B — smaller marketplace
  Effort: M
  Ships in: 6 weeks
\`\`\``
  }
];

const BRIEF_PATH = "artifacts/output/01-discovery/validation-brief.md";

const rows = SCENARIOS.map((s) => {
  const info = extract(s.output);
  // Default chat = the plain sentence plus a pointer. That IS the prescribed split, so the
  // interesting failure mode is a chat that carries machine content — modelled by X3 below.
  const chat =
    s.chat !== undefined
      ? s.chat
      : `${info.plain || "(no plain sentence)"}\n\nWritten up in ${BRIEF_PATH}.`;
  return { ...s, info, chat, leaks: chatLeaksTokens(chat) };
});

const brief = process.argv.includes("--brief");
const w = (s, n) => String(s === null || s === undefined ? "—" : s).padEnd(n);
const clip = (s, n) => (!s ? "—" : s.length > n ? s.slice(0, n - 1) + "…" : s).padEnd(n);

if (brief) {
  console.log("\n=== VERDICT ROUTING — scenario to verdict ===\n");
  console.log(
    w("ID", 4) + w("STAKES", 7) + w("GATE", 9) + w("VERDICT", 10) +
    w("WHEN", 6) + w("SURVIVED", 30) + w("CARD", 22) + "LANGUAGE"
  );
  console.log("-".repeat(112));
  for (const r of rows) {
    const cardFields = ["audited", "survived", "because", "next"].filter((f) => r.info[f]).length;
    console.log(
      w(r.id, 4) + w(r.stakes, 7) + w(r.info.gate, 9) + w(r.info.verdict, 10) +
      w(r.info.when ? r.info.when.replace("NOW", "NOW") : "—", 6) +
      w(r.info.survived, 30) +
      w(`${cardFields}/4 fields`, 22) +
      (r.info.plainFirst === true ? "plain-first" : r.info.plainFirst === false ? "TOKEN-FIRST" : "n/a")
    );
  }
  console.log("");
} else {
  console.log("\n╔══ VERDICT INFORMATION PER SCENARIO ══════════════════════════════════════════\n");
  for (const r of rows) {
    console.log(`── ${r.id}  [${r.stakes} stakes]  ${r.info.gate} Gate`);
    console.log(`   SCENARIO : ${r.scenario || r.context}`);
    console.log("");
    console.log(`   CHAT — what you read:`);
    for (const line of r.chat.split("\n")) console.log(`     │ ${line}`);
    console.log("");
    console.log(`   DOCUMENT — what the gates read (${BRIEF_PATH}):`);
    if (r.info.verdict) console.log(`     VERDICT : [${r.info.verdict}]${r.info.when ? "  When: " + r.info.when : ""}`);
    console.log(`     CARD    : ${["audited", "survived", "because", "next"].filter((f) => r.info[f]).length}/4 fields at this stakes level`);
    if (r.info.survived) console.log(`     Survived: ${r.info.survived}`);
    if (r.info.because) console.log(`     Because : ${r.info.because}`);
    if (r.info.next) console.log(`     Next    : ${r.info.next}`);
    const flags = [];
    flags.push(r.info.plainFirst === true ? "plain-language ok" : r.info.plainFirst === false ? "PLAIN-LANGUAGE BREACH" : "no verdict");
    flags.push(r.leaks.length ? `CHAT LEAK: ${r.leaks.join(" ")}` : "chat clean");
    flags.push(r.info.zeroBlueprint === "BREACH" ? "ZERO-BLUEPRINT BREACH" : "zero-blueprint clean");
    console.log(`     GATES   : ${flags.join(" | ")}`);
    console.log("");
  }
}

// ---- assertions: this file fails loudly rather than printing a green lie ----
const problems = [];
const by = Object.fromEntries(rows.map((r) => [r.id, r]));

if (by.S1.info.verdict !== "GO") problems.push("S1: expected [GO]");
if (by.S1.info.when !== "GATED") problems.push("S1: gated decision must carry When: GATED");
if (!by.S1.info.because) problems.push("S1: high stakes must carry Because:");
if (by.S2.info.when !== "NOW") problems.push("S2: ungated decision must carry When: NOW");

if (by.S3.info.verdict !== "GO") problems.push("S3: expected [GO]");
const s3Fields = ["audited", "survived", "because", "next"].filter((f) => by.S3.info[f]).length;
if (s3Fields !== 0) problems.push(`S3: LOW stakes must emit no optional card fields, got ${s3Fields}`);
if (by.S3.info.when !== "NOW") problems.push("S3: even a minimal card needs When: on [GO]");

if (by.S4.info.verdict !== "RESHAPE") problems.push("S4: interest-not-behaviour must not reach [GO]");
if (by.S4.info.survived !== "the need, not the mechanism") problems.push("S4: Survived: must be 'the need, not the mechanism'");
if (by.S4.info.when) problems.push("S4: [RESHAPE] must not restate When:");

if (by.S5.info.verdict !== "RESHAPE") problems.push("S5: scope mismatch must not reach [GO]");
if (by.S6.info.verdict !== "NO-GO") problems.push("S6: phantom pain must be [NO-GO]");
if (by.S6.info.survived) problems.push("S6: a minimal low-stakes card carries no Survived: field");

if (by.S7.info.verdict !== "NO-GO") problems.push("S7: dead-end must be [NO-GO]");
if (!by.S7.info.next) problems.push("S7: [NO-GO] must route onward to problem discovery");

for (const [id, expected] of [["S8", "CONFIRMED"], ["S9", "PARTIAL"], ["S10", "FALSIFIED"]]) {
  if (by[id].info.verdict !== expected) problems.push(`${id}: expected [${expected}]`);
  if (by[id].info.gate !== "Review") problems.push(`${id}: must be scored on the Review Gate`);
}
if (by.S9.info.next) problems.push("S9: a Review Gate finding is a verdict, not a next action — no build routing");

if (by.X2.info.plainFirst !== false) problems.push("X2: bare token must fail the plain-language gate");
if (by.X3.info.zeroBlueprint !== "BREACH") problems.push("X3: option menu after [NO-GO] must breach zero-blueprint");

// TWO SURFACES. The chat reply carries human wording only — no token, no card field, no
// marker. X1 is the deliberate counter-example: its document is clean and its chat is not.
// X2 is excluded because a bare-token document has no plain sentence to derive a chat from,
// which is itself the defect being demonstrated.
for (const r of rows) {
  if (r.id === "X1" || r.id === "X2") continue;
  if (r.leaks.length) {
    problems.push(`${r.id}: chat reply leaks machine content ${JSON.stringify(r.leaks)} — chat is human-only, the record lives in the document`);
  }
  if (!r.info.plain) problems.push(`${r.id}: no plain sentence to put in chat`);
}
if (by.X1.leaks.length === 0) {
  problems.push("X1: chat carrying a card must be DETECTED — otherwise the two-surface rule is unenforced");
}

// HUMAN WORDING, NOT TOKEN TRANSLATION. Same token, same machine record, different sentence —
// because the practical consequence differs by context. Also: no scenario may lead with a
// literal label translation.
for (const id of ["C1", "C2", "C3", "C4"]) {
  if (by[id].info.atomic !== true) problems.push(`${id}: human sentence must state a consequence, not a label`);
}
if (by.C1.info.verdict !== by.C2.info.verdict || by.C1.info.when !== by.C2.info.when) {
  problems.push("C1/C2: machine record must be IDENTICAL — only the human sentence may differ");
}
if (by.C1.info.plain === by.C2.info.plain) problems.push("C1/C2: sentences must differ by context");
if (by.C3.info.when !== "NEXT-CYCLE") problems.push("C3: expected NEXT-CYCLE");
if (by.C4.info.verdict !== "RESHAPE") problems.push("C4: expected RESHAPE");

// ATOMIC PLAIN SENTENCE. Use the AST's structural verdict — the earlier keyword-list
// version of this assertion wrongly failed "Park it for Q3 planning", which IS atomic.
for (const r of rows) {
  if (r.info.when && r.info.when !== "NOW" && r.info.atomic === false) {
    problems.push(`${r.id}: When: ${r.info.when} but the plain sentence leads with a bare verdict then hedges — split verdict and timing is the confusion bug`);
  }
  if (r.info.atomic === false) {
    problems.push(`${r.id}: plain sentence decodes a label instead of stating a consequence`);
  }
}

if (problems.length) {
  console.log("✗ SCENARIO CHECK FAILED:\n");
  for (const p of problems) console.log("  - " + p);
  process.exit(1);
}
console.log(`✓ All ${rows.length} scenarios produced the specified verdict information.`);
console.log("  Routing correct, card depth scaled to stakes, gates kept separate, anti-patterns caught.");
console.log("  Machine record in the document, human wording in chat — no token crossed between them.\n");