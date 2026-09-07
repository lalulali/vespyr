const test = require("node:test");
const assert = require("node:assert");
const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const SCRIPT = path.join(__dirname, "..", ".agents", "scripts", "match_methods.js");
const {
  tokenize,
  expandKeywords,
  scoreMethod,
  computeIDF,
  MIN_SCORE,
} = require("../.agents/scripts/match_methods");

function runCli(...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
}

function brainstormingMethods() {
  const { parseCSV } = require("../.agents/scripts/match_methods");
  const csv = fs.readFileSync(
    path.join(__dirname, "..", ".agents", "skills", "brainstorming", "methods.csv"),
    "utf8"
  );
  return parseCSV(csv);
}

// --- RT-P1-11: JTBD without literal wording ---

test("RT-P1-11: 'reframe onboarding as JTBD' surfaces Job-to-be-Done Framing top-1", () => {
  const res = runCli("--source", "brainstorming", "--context", "reframe onboarding as JTBD");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  const out = JSON.parse(res.stdout);
  assert.strictEqual(out[0].method_name, "Job-to-be-Done Framing");
  assert.ok(out[0].score >= MIN_SCORE, "must clear the floor, not sneak through narrow path");
});

// --- Floor ---

test("RT-P1-11: narrow query returns best-effort top-1 with a stderr note", () => {
  const res = runCli("--source", "brainstorming", "--context", "xyzzy forklift opera");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  const out = JSON.parse(res.stdout);
  assert.strictEqual(out.length, 1, "weak top score must not pad to 5");
  assert.match(res.stderr, /narrow match/);
});

test("RT-P1-11: strong singleton does not warn (confidence vs breadth split)", () => {
  const res = runCli("--source", "brainstorming", "--context", "reframe onboarding as JTBD");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  assert.strictEqual(res.stderr, "", "strong top score must stay quiet");
});

// Kai's named adversarial probes (characterization pins — these define the
// calibration backlog; if behavior changes, the diff, not the test, is suspect).
test("RT-P1-11: adversarial probe (a) diverge+silent routes to Brainwriting, not JTBD", () => {
  const res = runCli("--source", "brainstorming", "--context", "diverge on onboarding flows with silent brainwriting");
  const out = JSON.parse(res.stdout);
  assert.ok(out[0].method_name.toLowerCase().includes("silent"), `got: ${out[0].method_name}`);
  assert.ok(!out[0].method_name.includes("Job-to-be-Done"), "synonym leak must not surface JTBD here");
});

test("RT-P1-11: adversarial probe (c) reframe+schema routes to architecture, not JTBD", () => {
  const res = runCli("--source", "brainstorming", "--context", "reframe database schema coupling risk");
  const out = JSON.parse(res.stdout);
  assert.ok(!out[0].method_name.includes("Job-to-be-Done"), `name-weight misfire, got: ${out[0].method_name}`);
});

test("RT-P1-11: adversarial probe (b) characterization (convergent ranking is open)", () => {
  // Observed: prioritization-by-voting query tops Risk Brainstorm, not a
  // convergent/voting method. Pinned as characterization, NOT as correctness
  // (whether Nominal Group should outrank it is calibration backlog).
  const res = runCli("--source", "brainstorming", "--context", "prioritize ideas by voting after diverging");
  const out = JSON.parse(res.stdout);
  assert.strictEqual(out[0].method_name, "Risk Brainstorm");
});

// --- Synonyms + IDF ---

test("RT-P1-11: ideation synonyms expand (reframe/diverge/silent)", () => {
  const expanded = expandKeywords(["reframe", "silent"]);
  assert.ok(expanded.has("perspective") || expanded.has("lens"), "reframe must expand");
  assert.ok(expanded.has("anonymous") || expanded.has("brainwriting"), "silent must expand");
});

test("RT-P1-11: IDF down-weights ubiquitous terms", () => {
  const methods = brainstormingMethods();
  const idf = computeIDF(methods);
  assert.ok(idf.size > 40, "idf covers the corpus vocabulary");
  const rare = idf.get("scamper");
  const common = idf.get("idea") ?? idf.get("ideas") ?? 0;
  if (rare !== undefined) assert.ok(rare > common, "rare terms must outweigh common ones");
});

test("RT-P1-11: description-length normalization bounds long-text advantage", () => {
  const idf = new Map([["quantum", 3]]);
  const short = { method_name: "X", category: "y", description: "quantum flux" };
  const long = { method_name: "X", category: "y", description: `quantum flux ${"filler ".repeat(100)}` };
  assert.ok(
    scoreMethod(short, new Set(["quantum"]), idf) > scoreMethod(long, new Set(["quantum"]), idf),
    "same hit must score higher in the shorter description"
  );
});

// --- Regression: elicitation path + determinism ---

test("RT-P1-11: elicitation source works; repeated runs are deterministic", () => {
  const a = runCli("--source", "elicitation", "--context", "socratic critique of architecture");
  const b = runCli("--source", "elicitation", "--context", "socratic critique of architecture");
  assert.strictEqual(a.status, 0);
  assert.strictEqual(a.stdout, b.stdout, "same query must rank identically");
  const out = JSON.parse(a.stdout);
  assert.ok(out.length >= 1 && out.length <= 5);
});

test("RT-P1-11/calibration: pre-mortem query tops pre-mortem family", () => {
  const { spawnSync } = require("child_process");
  const res = spawnSync(process.execPath, [
    require("path").join(__dirname, "..", ".agents", "scripts", "match_methods.js"),
    "--source", "brainstorming", "--context", "pre-mortem before launch",
  ], { encoding: "utf8" });
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  const out = JSON.parse(res.stdout);
  assert.ok(out[0].method_name.toLowerCase().includes("pre-mortem"), `got: ${out[0].method_name}`);
  assert.ok(out[0].score >= 2);
});

test("RT-P1-11/calibration: six-hats query tops Six Thinking Hats decisively", () => {
  const { spawnSync } = require("child_process");
  const res = spawnSync(process.execPath, [
    require("path").join(__dirname, "..", ".agents", "scripts", "match_methods.js"),
    "--source", "brainstorming", "--context", "six hats parallel thinking session",
  ], { encoding: "utf8" });
  const out = JSON.parse(res.stdout);
  assert.strictEqual(out[0].method_name, "Six Thinking Hats");
});

test("RT-P1-11/calibration negatives: garbage and off-domain queries stay weak", () => {
  const { spawnSync } = require("child_process");
  const run = (q, source) => {
    const res = spawnSync(process.execPath, [
      require("path").join(__dirname, "..", ".agents", "scripts", "match_methods.js"),
      "--source", source, "--context", q,
    ], { encoding: "utf8" });
    assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
    return JSON.parse(res.stdout);
  };
  // Pure noise: nothing may clear the floor with confidence.
  let out = run("xyzzy bıngbong wümble", "brainstorming");
  assert.ok(out.every((m) => m.score < 2), "noise must not produce confident matches");
  // Socratic belongs to elicitation, not brainstorming: brainstorming must not
  // claim it confidently (cross-catalog leak check).
  out = run("socratic questioning of product assumptions", "brainstorming");
  assert.ok(!out[0].method_name.toLowerCase().includes("socratic") || out[0].score < 4,
    `socratic must not dominate brainstorming results, got: ${out[0].method_name} @ ${out[0].score}`);
});

// Golden set v1 (calibration backlog: positives pinned, negatives pinned,
// known-miss documented — NOT a ROC substitute; held-out split still future).
function goldenTop(query, source) {
  const { spawnSync } = require("child_process");
  const res = spawnSync(process.execPath, [
    require("path").join(__dirname, "..", ".agents", "scripts", "match_methods.js"),
    "--source", source || "brainstorming", "--context", query,
  ], { encoding: "utf8" });
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  return JSON.parse(res.stdout);
}

test("RT-P1-11/golden: method-name queries route correctly", () => {
  const cases = [
    ["starbursting questions who what where", "Starbursting"],
    ["six hats black risks yellow benefits", "Six Thinking Hats"],
    ["reverse brainstorming make it worse", "Reverse Brainstorming"],
    ["SCAMPER substitute combine", "SCAMPER"],
    ["worst possible idea inversion", "Worst Possible Idea"],
    ["analogies nature metaphor", "Forced Analogy"],
  ];
  for (const [q, expected] of cases) {
    const out = goldenTop(q);
    assert.strictEqual(out[0].method_name, expected, `query: ${q}`);
    assert.ok(out[0].score >= 2, `must clear floor confidently: ${q}`);
  }
});

test("RT-P1-11/golden: domain queries route to family (pre-mortem, risk, silent)", () => {
  let out = goldenTop("pre-mortem timeline failure");
  assert.ok(out[0].method_name.toLowerCase().includes("pre-mortem"), `got: ${out[0].method_name}`);
  out = goldenTop("risk brainstorm threats");
  assert.strictEqual(out[0].method_name, "Risk Brainstorm");
  out = goldenTop("anonymous silent ideas group");
  assert.ok(out[0].method_name.toLowerCase().includes("silent"), `got: ${out[0].method_name}`);
});

test("RT-P1-11/golden: RICE query stays below floor (no RICE method in catalog)", () => {
  const out = goldenTop("prioritize backlog RICE score");
  assert.ok(out[0].score < 2, `must not confidently invent: ${out[0].method_name} @ ${out[0].score}`);
});

test("RT-P1-11/golden: retrospective query misfires (catalog gap, documented)", () => {
  // No retrospective method exists in methods.csv — the matcher returns its
  // best wrong answer confidently. Documented hole, not pinned correctness:
  // fix = add the method, not tune weights.
  const out = goldenTop("retrospective what went well");
  assert.strictEqual(out[0].method_name, "What If? Scenario");
});

// Held-out probe set (authored blind 2026-09-06, run once, zero tuning —
// these pin OBSERVED behavior, including misses, as calibration data).
function heldOutTop(query, source) {
  const { spawnSync } = require("child_process");
  const res = spawnSync(process.execPath, [
    require("path").join(__dirname, "..", ".agents", "scripts", "match_methods.js"),
    "--source", source || "brainstorming", "--context", query,
  ], { encoding: "utf8" });
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  return JSON.parse(res.stdout);
}

test("RT-P1-11/held-out: strong queries resolve confidently", () => {
  let out = heldOutTop("silent brainstorming quiet group ideas");
  assert.strictEqual(out[0].method_name, "Silent Brainstorming + Group Discussion");
  assert.ok(out[0].score >= 2);
  out = heldOutTop("assumption reversal challenge beliefs");
  assert.strictEqual(out[0].method_name, "Assumption Reversal");
});

test("RT-P1-11/held-out: weak-evidence queries stay below floor", () => {
  for (const q of ["dot voting prioritize options", "storyboard user journey frames", "fishbone root cause categories"]) {
    const out = heldOutTop(q);
    assert.ok(out[0].score < 2, `${q} must not clear floor: ${out[0].method_name} @ ${out[0].score}`);
  }
});

test("RT-P1-11/held-out: steelman query misfires (catalog gap, documented)", () => {
  // No steelman/red-team/devil method exists in methods.csv — the matcher
  // returns Mind Mapping confidently. Fix = add the method, not tune weights.
  const out = heldOutTop("change my mind steelman counterargument");
  assert.strictEqual(out[0].method_name, "Mind Mapping");
});
