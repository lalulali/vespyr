const test = require("node:test");
const { after } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const SCRIPT = path.join(__dirname, "..", ".agents", "scripts", "roundtable_eval.js");
const {
  parseCoverage,
  extractVerdicts,
  extractConcessions,
  extractRounds,
  MAX_ROUNDS,
  thinChallenges,
  MIN_CHALLENGE_CHARS,
  verifySoloDisclosure,
  SOLO_DIVERGENCE_THRESHOLD,
} = require("../.agents/scripts/roundtable_eval");

function runCli(...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
}

function runCliCwd(cwd, ...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8", cwd });
}

function tmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rt-eval-"));
  tmpDirs.push(dir);
  return dir;
}

const tmpDirs = [];
after(() => {
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
});

const GOOD_BLOCK = [
  "```roundtable-coverage",
  "panel: @architect,@tech-lead",
  "challenges:",
  "- @architect -> @tech-lead:",
  "- @tech-lead -> @architect:",
  "```",
].join("\n");

function transcript({ block = GOOD_BLOCK, verdicts = "[VERDICT: GO]\n[VERDICT: RESHAPE]", synthesis = "[SYNTHESIS: RESHAPE]", extra = "" }) {
  return `# T\n\n${block}\n\n${verdicts}\n\n${synthesis}\n${extra}\n`;
}

// --- RT-P0-1: stray file must not crash `score` ---

test("RT-P0-1: score --dir with a misnamed file lists it non-compliant", () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, "topic_native_1.md"), transcript({}));
  fs.writeFileSync(path.join(dir, "junk-notes.md"), "# not a transcript\n");
  const res = runCli("score", "--dir", dir, "--json");
  // NOTE(RT-P1-9): since the suite-score gate shipped, a non-compliant dir
  // exits 1 (was 0 when P0-1 shipped). The P0-1 behavior — junk listed, no
  // crash — is preserved; only the exit code was upgraded by the gate.
  assert.strictEqual(res.status, 1, `stderr: ${res.stderr}`);
  const report = JSON.parse(res.stdout);
  assert.strictEqual(report.transcripts, 2);
  const junk = report.detail.find((r) => r.file === "junk-notes.md");
  assert.ok(junk, "junk file must appear in detail");
  assert.strictEqual(junk.coverageCompliant, false);
  assert.ok(junk.nameError, "row must carry the naming error");
  assert.ok(report.gate.failures.some((f) => f.includes("coverage compliance")), "gate must name coverage");
});

// --- RT-P0-2: parser tolerance ---

test("RT-P0-2: indented bullets and unicode arrows parse", () => {
  const text = [
    "  ```roundtable-coverage",
    "panel: @a,@b",
    "challenges:",
    "  - @a → @b:",
    "  - @b -> @a:",
    "```",
  ].join("\n");
  const cov = parseCoverage(text);
  assert.strictEqual(cov.error, null);
  assert.strictEqual(cov.uncovered.length, 0);
});

test("RT-P0-2: missing colon warns instead of silent-drop", () => {
  const text = [
    "```roundtable-coverage",
    "panel: @a,@b",
    "challenges:",
    "- @a -> @b",
    "- @b -> @a:",
    "```",
  ].join("\n");
  const cov = parseCoverage(text);
  assert.strictEqual(cov.challenges.length, 2);
  assert.strictEqual(cov.warnings.length, 1);
  assert.match(cov.warnings[0], /missing trailing ':'/);
  assert.strictEqual(cov.uncovered.length, 0);
});

test("RT-P0-2: duplicate panel: is an error", () => {
  const text = [
    "```roundtable-coverage",
    "panel: @a,@b",
    "panel: @a,@c",
    "challenges:",
    "- @a -> @b:",
    "```",
  ].join("\n");
  const cov = parseCoverage(text);
  assert.match(cov.error, /duplicate 'panel:' line/);
});

test("RT-P0-2: self-challenge does not cover a position", () => {
  const text = [
    "```roundtable-coverage",
    "panel: @a,@b",
    "challenges:",
    "- @a -> @a:",
    "- @a -> @b:",
    "- @b -> @b:",
    "```",
  ].join("\n");
  const cov = parseCoverage(text);
  // @b is covered (receives @a -> @b); @a is NOT covered (only challenged itself)
  assert.deepStrictEqual(cov.uncovered, ["@a"]);
  const substantive = cov.challenges.filter((c) => c.to !== c.from).length;
  assert.strictEqual(substantive, 1);
});

// --- RT-P0-3: ADR id case + stability split ---

test("RT-P0-3: ADR synthesis preserves id case", () => {
  const v = extractVerdicts("[VERDICT: GO]\n[SYNTHESIS: ADR:adr-006]\n");
  assert.strictEqual(v.synthesis, "ADR:adr-006");
});

test("RT-P0-3: score excludes escalations from stability and lists them", () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, "t_native_1.md"), transcript({ synthesis: "[SYNTHESIS: GO]" }));
  fs.writeFileSync(path.join(dir, "t_native_2.md"), transcript({ synthesis: "[SYNTHESIS: GO]" }));
  fs.writeFileSync(path.join(dir, "t_native_3.md"), transcript({ synthesis: "[SYNTHESIS: ADR:adr-006]" }));
  const res = runCli("score", "--dir", dir, "--json");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  const report = JSON.parse(res.stdout);
  assert.strictEqual(report.verdictStability.t.nativeModalSynthesis, "GO");
  assert.strictEqual(report.verdictStability.t.share, 1);
  assert.deepStrictEqual(report.escalations, [{ file: "t_native_3.md", synthesis: "ADR:adr-006" }]);
});

// --- RT-P0-4: concessions surfaced ---

test("RT-P0-4: concessions extracted and zero-concession compliant transcripts flagged", () => {
  assert.deepStrictEqual(extractConcessions("[CONCESSION: scope narrowed] text [CONCESSION: cost]"), [
    "scope narrowed",
    "cost",
  ]);
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, "t_native_1.md"), transcript({}));
  const res = runCli("score", "--dir", dir, "--json");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  const report = JSON.parse(res.stdout);
  assert.strictEqual(report.totalConcessions, 0);
  assert.deepStrictEqual(report.zeroConcessionCompliant, ["t_native_1.md"]);
});

// --- RT-P1-4 (done early): fenced quotes ignored ---

test("RT-P1-4: verdicts inside fenced code blocks are ignored", () => {
  const text = "```\n[VERDICT: GO]\n[SYNTHESIS: GO]\n```\n\n[VERDICT: NO-GO]\n[SYNTHESIS: NO-GO]\n";
  const v = extractVerdicts(text);
  assert.deepStrictEqual(v.decision, ["NO-GO"]);
  assert.strictEqual(v.synthesis, "NO-GO");
});

// --- RT-P1-9 (partial): bad tags visible ---

test("RT-P1-9: unknown verdict tags counted in report", () => {
  const dir = tmpDir();
  fs.writeFileSync(
    path.join(dir, "t_native_1.md"),
    transcript({ verdicts: "[VERDICT: BOGUS]", synthesis: "[SYNTHESIS: GO]" })
  );
  const res = runCli("score", "--dir", dir, "--json");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  const report = JSON.parse(res.stdout);
  assert.strictEqual(report.badVerdictTagCount, 1);
});

// --- Nina reds: coverage exit-code contract via CLI ---

test("RED: coverage on a gap transcript exits 1 naming the panelist", () => {
  const dir = tmpDir();
  const file = path.join(dir, "gap.md");
  fs.writeFileSync(
    file,
    ["```roundtable-coverage", "panel: @a,@b", "challenges:", "- @a -> @a:", "```"].join("\n")
  );
  const res = runCli("coverage", "--file", file);
  assert.strictEqual(res.status, 1);
  assert.match(res.stderr, /@b/);
});

test("RED: coverage with no block exits 2", () => {
  const dir = tmpDir();
  const file = path.join(dir, "noblock.md");
  fs.writeFileSync(file, "# no coverage here\n");
  const res = runCli("coverage", "--file", file);
  assert.strictEqual(res.status, 2);
  assert.match(res.stderr, /no ```roundtable-coverage block found/);
});

test("RED: coverage with duplicate panel exits 2", () => {
  const dir = tmpDir();
  const file = path.join(dir, "dup.md");
  fs.writeFileSync(
    file,
    ["```roundtable-coverage", "panel: @a,@b", "panel: @a,@c", "challenges:", "- @a -> @b:", "```"].join("\n")
  );
  const res = runCli("coverage", "--file", file);
  assert.strictEqual(res.status, 2);
  assert.match(res.stderr, /duplicate 'panel:' line/);
});

test("RED: score on a gap dir exits 1 and reports the gap (RT-P1-9 gate)", () => {
  const dir = tmpDir();
  fs.writeFileSync(
    path.join(dir, "t_native_1.md"),
    transcript({
      block: ["```roundtable-coverage", "panel: @a,@b", "challenges:", "- @a -> @a:", "```"].join("\n"),
    })
  );
  const res = runCli("score", "--dir", dir, "--json");
  assert.strictEqual(res.status, 1);
  const report = JSON.parse(res.stdout);
  assert.strictEqual(report.coverageComplianceRate, 0);
  assert.match(report.detail[0].coverageDetail, /gap: @a, @b/);
  assert.strictEqual(report.gate.pass, false);
});

// --- Fence tolerance (was claimed, unproven) ---

test("RT-P0-2: fence tolerates case, extra spaces, and trailing space on close", () => {
  const text = [
    "```  ROUNDTABLE-COVERAGE  ",
    "panel: @a,@b",
    "challenges:",
    "- @a -> @b:",
    "- @b -> @a:",
    "```   ",
  ].join("\n");
  const cov = parseCoverage(text);
  assert.strictEqual(cov.error, null);
  assert.strictEqual(cov.uncovered.length, 0);
});

// --- RT-P1-2: solo disclosure marker + divergence threshold ---

test("RT-P1-2: solo marker verified, absence fails", () => {
  assert.strictEqual(verifySoloDisclosure("[MODE: solo — isolated calls, 3 seats]\n# T\n"), true);
  assert.strictEqual(verifySoloDisclosure("# T\nno marker here\n"), false);
  assert.strictEqual(verifySoloDisclosure("# T\n\nfooter note\n[MODE: solo — isolated calls, 2 seats]\n"), false, "buried marker must fail");
  assert.strictEqual(verifySoloDisclosure("[MODE: solo]\n# T\n"), false, "count-less marker must fail");
  assert.strictEqual(verifySoloDisclosure("[MODE: solopreneur, 2 seats]\n# T\n"), false, "prefix collision must fail");
});

test("RT-P1-2: marker-less solo transcript is listed as disclosure failure", () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, "t_solo_1.md"), transcript({}));
  fs.writeFileSync(
    path.join(dir, "t_solo_2.md"),
    `[MODE: solo — isolated calls, 2 seats]\n` + transcript({})
  );
  const res = runCli("score", "--dir", dir, "--json");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  const report = JSON.parse(res.stdout);
  assert.deepStrictEqual(report.soloDisclosureFailures, ["t_solo_1.md"]);
  const marked = report.detail.find((r) => r.file === "t_solo_2.md");
  assert.strictEqual(marked.soloDisclosure, true);
});

test("RT-P1-2: divergence reported against a configured threshold", () => {
  assert.strictEqual(SOLO_DIVERGENCE_THRESHOLD, 0.3);
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, "t_native_1.md"), transcript({ synthesis: "[SYNTHESIS: GO]" }));
  fs.writeFileSync(path.join(dir, "t_solo_1.md"), transcript({ synthesis: "[SYNTHESIS: NO-GO]" }));
  const res = runCli("score", "--dir", dir, "--json");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  const report = JSON.parse(res.stdout);
  assert.strictEqual(report.soloDivergenceThreshold, 0.3);
  assert.strictEqual(report.soloVsNativeDivergence, 1);
  assert.strictEqual(report.soloDivergenceExceeded, true);
  const textRes = runCli("score", "--dir", dir);
  assert.match(textRes.stdout, /EXCEEDED/);
});

// --- RT-P1-3: round markers + bound check ---

test("RT-P1-3: rounds extracted, fenced markers ignored", () => {
  assert.deepStrictEqual(extractRounds("[ROUND: 1]\ntext\n[ROUND: 2]\n[ROUND: 2]\n"), [1, 2]);
  assert.deepStrictEqual(extractRounds("```\n[ROUND: 9]\n```\n[ROUND: 1]\n"), [1]);
  assert.deepStrictEqual(extractRounds("no markers\n"), []);
  assert.strictEqual(MAX_ROUNDS, 2);
});

test("RT-P1-3: 3-round fixture is flagged in score", () => {
  const dir = tmpDir();
  fs.writeFileSync(
    path.join(dir, "t_native_1.md"),
    "[ROUND: 1]\n[ROUND: 2]\n[ROUND: 3]\n" + transcript({})
  );
  const res = runCli("score", "--dir", dir, "--json");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  const report = JSON.parse(res.stdout);
  assert.deepStrictEqual(report.roundBoundViolations, ["t_native_1.md (round 3)"]);
  assert.strictEqual(report.detail[0].maxRound, 3);
});

// --- RT-P1-5: panel session state (compaction survival) ---

test("RT-P1-5: session begin/update/status/close round-trips in isolation", () => {
  const dir = tmpDir();
  let res = runCliCwd(dir, "session", "begin", "--topic", "t", "--agents", "@a,@b");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  assert.match(res.stdout, /turn 1/);
  res = runCliCwd(dir, "session", "update", "--turn", "3", "--phase", "cross-exam");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  assert.match(res.stdout, /turn 3, phase cross-exam/);
  res = runCliCwd(dir, "session", "status");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  const state = JSON.parse(res.stdout);
  assert.strictEqual(state.topic, "t");
  assert.deepStrictEqual(state.members, ["@a", "@b"]);
  assert.strictEqual(state.turn, 3);
  assert.strictEqual(state.phase, "cross-exam");
  assert.strictEqual(state.mode, "native");
  res = runCliCwd(dir, "session", "close");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  res = runCliCwd(dir, "session", "status");
  assert.strictEqual(res.status, 2, "closed session must report no open panel");
});

test("RT-P1-5: update without begin exits 2", () => {
  const dir = tmpDir();
  const res = runCliCwd(dir, "session", "update", "--turn", "2");
  assert.strictEqual(res.status, 2);
});

test("RT-P1-5: invalid turn and phase are rejected", () => {
  const dir = tmpDir();
  let res = runCliCwd(dir, "session", "begin", "--topic", "t");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  res = runCliCwd(dir, "session", "update", "--turn", "abc");
  assert.strictEqual(res.status, 2);
  assert.match(res.stderr, /positive integer/);
  res = runCliCwd(dir, "session", "update", "--phase", "melee");
  assert.strictEqual(res.status, 2);
  assert.match(res.stderr, /position, cross-exam, defense, synthesis/);
  res = runCliCwd(dir, "session", "update", "--turn", "2", "--phase", "defense", "--synthesis", "Kai conceded sandbox");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  res = runCliCwd(dir, "session", "status");
  const state = JSON.parse(res.stdout);
  assert.strictEqual(state.turn, 2);
  assert.strictEqual(state.phase, "defense");
  assert.strictEqual(state.lastSynthesis, "Kai conceded sandbox");
});

test("RT-P1-5: SKILL narrows exit (thanks is not an exit) and mandates state file", () => {
  const SKILL = fs.readFileSync(
    path.join(__dirname, "..", ".agents", "skills", "round-table", "SKILL.md"),
    "utf8"
  );
  assert.match(SKILL, /session begin --topic/);
  assert.match(SKILL, /session update --turn/);
  assert.match(SKILL, /session status/);
  assert.match(SKILL, /session close/);
  assert.match(SKILL, /bare "thanks" mid-debate is acknowledgement, not an exit/i);
});

// --- RT-P1-6: log-vs-panel reconciliation + persist contract ---

test("RT-P1-6: logged-never-spoke and spoke-never-logged are flagged", () => {
  const dir = tmpDir();
  fs.writeFileSync(
    path.join(dir, "t_native_1.md"),
    transcript({
      block: ["```roundtable-coverage", "panel: @a,@b", "challenges:", "- @a -> @b:", "- @b -> @a:", "```"].join("\n"),
    })
  );
  const log = path.join(dir, "log.jsonl");
  fs.writeFileSync(
    log,
    [
      JSON.stringify({ ts: "t", tool: "round-table", mode: "native", topic: "x", agents: ["@a", "@ghost"], note: null }),
    ].join("\n") + "\n"
  );
  const res = runCli("score", "--dir", dir, "--json", "--log", log);
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  const report = JSON.parse(res.stdout);
  assert.deepStrictEqual(report.logReconciliation.loggedNeverSpoke, ["@ghost"]);
  assert.deepStrictEqual(report.logReconciliation.spokeNeverLogged, ["@b"]);
});

test("RT-P1-6: clean reconciliation reports clean, absent --log reports null", () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, "t_native_1.md"), transcript({}));
  const log = path.join(dir, "log.jsonl");
  fs.writeFileSync(
    log,
    [JSON.stringify({ ts: "t", mode: "native", topic: "x", agents: ["@architect", "@tech-lead"], note: null })].join("\n") + "\n"
  );
  let res = runCli("score", "--dir", dir, "--json", "--log", log);
  let report = JSON.parse(res.stdout);
  assert.deepStrictEqual(report.logReconciliation.loggedNeverSpoke, []);
  assert.deepStrictEqual(report.logReconciliation.spokeNeverLogged, []);
  res = runCli("score", "--dir", dir, "--json");
  report = JSON.parse(res.stdout);
  assert.strictEqual(report.logReconciliation, null);
});

test("RT-P1-6: persist preamble names a concrete disk command; exit checklist requires session-write", () => {
  const SKILL = fs.readFileSync(
    path.join(__dirname, "..", ".agents", "skills", "round-table", "SKILL.md"),
    "utf8"
  );
  assert.match(SKILL, /git status --porcelain -- \{path\}/);
  assert.match(SKILL, /judge `porcelain`/);
  assert.match(SKILL, /skipping any step is a checklist violation/);
  assert.match(SKILL, /session-write/);
});

test("RT-P1-6: reconciliation normalizes case and @-prefix", () => {
  const dir = tmpDir();
  fs.writeFileSync(
    path.join(dir, "t_native_1.md"),
    transcript({
      block: ["```roundtable-coverage", "panel: @architect,@tech-lead", "challenges:", "- @architect -> @tech-lead:", "- @tech-lead -> @architect:", "```"].join("\n"),
    })
  );
  const log = path.join(dir, "log.jsonl");
  fs.writeFileSync(
    log,
    [JSON.stringify({ ts: "t", mode: "native", topic: "x", agents: ["@Architect", "tech-lead"], note: null })].join("\n") + "\n"
  );
  const res = runCli("score", "--dir", dir, "--json", "--log", log);
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  const report = JSON.parse(res.stdout);
  assert.deepStrictEqual(report.logReconciliation.loggedNeverSpoke, []);
  assert.deepStrictEqual(report.logReconciliation.spokeNeverLogged, []);
});

// --- RT-P1-8: topic hints + Review-gate topics ---

const TOPICS = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "evals", "roundtable", "topics.json"), "utf8")
);

test("RT-P1-8: sound topics carry falsifiable hints (≥1 RESHAPE, no GO-conformity tests)", () => {
  const byId = Object.fromEntries(TOPICS.map((t) => [t.id, t]));
  // rt-001 deliberately stays null: a GO hint on a contestable sound topic
  // would be an unfalsifiable conformity test (no scorer compares sound hints).
  assert.strictEqual(byId["rt-001"].expected_verdict_hint, null);
  for (const id of ["rt-002", "rt-003", "rt-006"]) {
    assert.ok(byId[id].expected_verdict_hint, `${id} must have a non-null hint`);
  }
  const hints = ["rt-002", "rt-003", "rt-006"].map((id) => byId[id].expected_verdict_hint);
  assert.ok(hints.includes("RESHAPE"), "at least one sound topic must hint RESHAPE");
  assert.ok(!hints.includes("GO"), "no GO hints on sound topics (conformity-test ban)");
});

test("RT-P1-8: Review-gate topics exist with PARTIAL/FALSIFIED hints", () => {
  const byId = Object.fromEntries(TOPICS.map((t) => [t.id, t]));
  assert.strictEqual(byId["rt-011"].gate, "review");
  assert.strictEqual(byId["rt-011"].expected_verdict_hint, "FALSIFIED");
  assert.strictEqual(byId["rt-012"].gate, "review");
  // Hint adjudicated 2026-09-06 on live wave-2 evidence (rt-012_native_1:
  // anchor-blind aggregate + blessable history falsify the universal "all";
  // PARTIAL describes the narrowed tripwire component, not the claim).
  // A future contradicting run re-opens this via the gate — hints are data.
  assert.strictEqual(byId["rt-012"].expected_verdict_hint, "FALSIFIED");
});

test("RT-P1-8: Review-gate transcript flows through score + premise check", () => {
  const dir = tmpDir();
  fs.writeFileSync(
    path.join(dir, "rt-011_native_1.md"),
    transcript({
      verdicts: "[VERDICT: FALSIFIED]\n[VERDICT: PARTIAL]",
      synthesis: "[SYNTHESIS: ADR:rt-011-followup]",
    })
  );
  const res = runCli("score", "--dir", dir, "--json", "--topics", path.join(__dirname, "..", "evals", "roundtable", "topics.json"));
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  const report = JSON.parse(res.stdout);
  const row = report.detail.find((r) => r.file === "rt-011_native_1.md");
  assert.deepStrictEqual(row.reviewVerdicts, ["FALSIFIED", "PARTIAL"]);
  const premise = (report.flawedPremiseCheck || []).find((p) => p.topic === "rt-011");
  assert.ok(premise, "rt-011 must appear in flawed-premise check");
  assert.strictEqual(premise.hint, "FALSIFIED");
});

// --- RT-P1-9: scorer gates ---

test("RT-P1-9: flawed-topic synthesis contradicting the hint exits 1", () => {
  const dir = tmpDir();
  const topics = path.join(dir, "topics.json");
  fs.writeFileSync(
    topics,
    JSON.stringify([{ id: "xx", topic: "t", premise_quality: "flawed", expected_verdict_hint: "NO-GO", expected_frictions: [] }])
  );
  fs.writeFileSync(
    path.join(dir, "xx_native_1.md"),
    transcript({ synthesis: "[SYNTHESIS: GO]" })
  );
  const res = runCli("score", "--dir", dir, "--json", "--topics", topics);
  assert.strictEqual(res.status, 1);
  const report = JSON.parse(res.stdout);
  assert.ok(report.gate.failures.some((f) => f.includes("contradicted")), "gate must name the contradiction");
});

test("RT-P1-9: matching hint passes the gate; ADR escalation is not a contradiction", () => {
  const dir = tmpDir();
  const topics = path.join(dir, "topics.json");
  fs.writeFileSync(
    topics,
    JSON.stringify([{ id: "xx", topic: "t", premise_quality: "flawed", expected_verdict_hint: "NO-GO", expected_frictions: [] }])
  );
  fs.writeFileSync(path.join(dir, "xx_native_1.md"), transcript({ synthesis: "[SYNTHESIS: NO-GO]" }));
  let res = runCli("score", "--dir", dir, "--json", "--topics", topics);
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  fs.writeFileSync(path.join(dir, "xx_native_2.md"), transcript({ synthesis: "[SYNTHESIS: ADR:xx-1]" }));
  res = runCli("score", "--dir", dir, "--json", "--topics", topics);
  assert.strictEqual(res.status, 0, "escalation must not fail the gate");
});

test("RT-P1-9: one escalation does not shield a contradicting run", () => {
  const dir = tmpDir();
  const topics = path.join(dir, "topics.json");
  fs.writeFileSync(
    topics,
    JSON.stringify([{ id: "xx", topic: "t", premise_quality: "flawed", expected_verdict_hint: "NO-GO", expected_frictions: [] }])
  );
  fs.writeFileSync(path.join(dir, "xx_native_1.md"), transcript({ synthesis: "[SYNTHESIS: ADR:xx-1]" }));
  fs.writeFileSync(path.join(dir, "xx_native_2.md"), transcript({ synthesis: "[SYNTHESIS: GO]" }));
  const res = runCli("score", "--dir", dir, "--json", "--topics", topics);
  assert.strictEqual(res.status, 1);
  const report = JSON.parse(res.stdout);
  assert.ok(report.gate.failures.some((f) => f.includes("contradicted by [GO]")));
});

test("RT-P1-9: Review verdicts feed disagreement/SPC instead of null", () => {
  const dir = tmpDir();
  fs.writeFileSync(
    path.join(dir, "t_native_1.md"),
    transcript({ verdicts: "[VERDICT: CONFIRMED]\n[VERDICT: PARTIAL]", synthesis: "[SYNTHESIS: GO]" })
  );
  const res = runCli("score", "--dir", dir, "--json");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  const report = JSON.parse(res.stdout);
  assert.strictEqual(report.detail[0].disagreementRate, 0.5);
  assert.strictEqual(report.meanRound1Disagreement, 0.5);
});

test("RT-P1-9: lone stray decision verdict does not veto review measurement", () => {
  const dir = tmpDir();
  fs.writeFileSync(
    path.join(dir, "t_native_1.md"),
    transcript({
      verdicts: "[VERDICT: GO]\n[VERDICT: CONFIRMED]\n[VERDICT: CONFIRMED]\n[VERDICT: PARTIAL]",
      synthesis: "[SYNTHESIS: GO]",
    })
  );
  const res = runCli("score", "--dir", dir, "--json");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  const report = JSON.parse(res.stdout);
  assert.strictEqual(report.detail[0].disagreementRate, 0.33);
});

test("RT-P1-9: text mode prints GATE FAILED and exits 1", () => {
  const dir = tmpDir();
  fs.writeFileSync(
    path.join(dir, "t_native_1.md"),
    transcript({
      block: ["```roundtable-coverage", "panel: @a,@b", "challenges:", "- @a -> @a:", "```"].join("\n"),
    })
  );
  const res = runCli("score", "--dir", dir);
  assert.strictEqual(res.status, 1);
  assert.match(res.stdout, /GATE FAILED/);
  assert.match(res.stdout, /coverage compliance 0 < 1\.0/);
});

test("RT-P1-9: bad verdict tags visible in text report without --json", () => {
  const dir = tmpDir();
  fs.writeFileSync(
    path.join(dir, "t_native_1.md"),
    transcript({ verdicts: "[VERDICT: BOGUS]", synthesis: "[SYNTHESIS: GO]" })
  );
  const res = runCli("score", "--dir", dir);
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  assert.match(res.stdout, /bad verdict tags: 1/);
});

// --- RT-P1-10: log schema v2 ---

function seedTopicsCopy(dir) {
  const target = path.join(dir, "evals", "roundtable", "topics.json");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(__dirname, "..", "evals", "roundtable", "topics.json"), target);
}

test("RT-P1-10: 10/10 new log entries join to topics and run files", () => {
  const dir = tmpDir();
  seedTopicsCopy(dir);
  const ids = ["rt-001", "rt-002", "rt-003", "rt-004", "rt-005", "rt-006", "rt-007", "rt-008", "rt-009", "rt-010"];
  for (const id of ids) {
    const runFile = path.join(dir, `${id}_native_1.md`);
    fs.writeFileSync(runFile, transcript({}));
    const res = runCliCwd(
      dir, "log", "--mode", "native", "--topic", `topic ${id}`, "--agents", "@a,@b",
      "--topic-id", id, "--synthesis", "GO", "--coverage-exit", "0",
      "--model", "test", "--run-file", runFile, "--duration-s", "12"
    );
    assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  }
  const logPath = path.join(dir, "artifacts", "evals", "roundtable", "telemetry", "log.jsonl");
  const entries = fs.readFileSync(logPath, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
  assert.strictEqual(entries.length, 10);
  const knownIds = new Set(ids);
  for (const e of entries) {
    assert.ok(knownIds.has(e.topic_id), `${e.topic_id} must join topics.json`);
    assert.ok(fs.existsSync(e.run_file), `${e.run_file} must exist`);
    assert.ok(e.synthesis && e.coverage_exit !== null && e.model && e.duration_s !== null, "v2 fields present");
  }
});

test("RT-P1-10: empty agents rejected for native/solo; unknown topic-id rejected", () => {
  const dir = tmpDir();
  seedTopicsCopy(dir);
  let res = runCliCwd(dir, "log", "--mode", "native", "--topic", "t", "--agents", "");
  assert.strictEqual(res.status, 2);
  assert.match(res.stderr, /non-empty --agents/);
  res = runCliCwd(dir, "log", "--mode", "solo", "--topic", "t");
  assert.strictEqual(res.status, 2);
  res = runCliCwd(dir, "log", "--mode", "native", "--topic", "t", "--agents", "@a", "--topic-id", "rt-999");
  assert.strictEqual(res.status, 2);
  assert.match(res.stderr, /unknown --topic-id/);
});

test("RT-P1-10: legacy flags still work (backward compatible)", () => {
  const dir = tmpDir();
  const res = runCliCwd(dir, "log", "--mode", "refused", "--topic", "t");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  const logPath = path.join(dir, "artifacts", "evals", "roundtable", "telemetry", "log.jsonl");
  const [entry] = fs.readFileSync(logPath, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
  assert.strictEqual(entry.topic_id, null);
  assert.deepStrictEqual(entry.agents, []);
});

test("RT-P2-3: challenge text captured; thin challenges flagged, substantive pass unflagged", () => {
  const thin = parseCoverage(
    ["```roundtable-coverage", "panel: @a,@b", "challenges:", "- @a -> @b:", "- @b -> @a: ok", "```"].join("\n")
  );
  assert.strictEqual(thin.challenges[0].text, "- @a -> @b:");
  const flagged = thinChallenges(thin.challenges);
  assert.strictEqual(flagged.length, 2, "both terse lines must flag");
  const fat = parseCoverage(
    ["```roundtable-coverage", "panel: @a,@b", "challenges:",
     "- @a -> @b: your latency premise assumes p99 holds under failover, which the incident data contradicts:",
     "- @b -> @a: fair — scoping the claim to steady-state p99 with a failover caveat:",
     "```"].join("\n")
  );
  assert.deepStrictEqual(thinChallenges(fat.challenges), []);
  assert.strictEqual(MIN_CHALLENGE_CHARS, 60);
});

test("RT-P2-3: score surfaces thin challenges without failing the gate", () => {
  const dir = tmpDir();
  fs.writeFileSync(
    path.join(dir, "t_native_1.md"),
    transcript({
      block: ["```roundtable-coverage", "panel: @a,@b", "challenges:", "- @a -> @b:", "- @b -> @a:", "```"].join("\n"),
    })
  );
  const res = runCli("score", "--dir", dir, "--json");
  assert.strictEqual(res.status, 0, "thin-but-covered must not fail the gate");
  const report = JSON.parse(res.stdout);
  assert.strictEqual(report.thinChallenges.length, 2);
  assert.strictEqual(report.minChallengeChars, 60);
});

test("RT-P2-1: refused runs are log-only (documented decision, tested)", () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, "t_native_1.md"), transcript({}));
  fs.writeFileSync(path.join(dir, "t_refused_1.md"), "# refused: single shared context, no debate\n");
  const res = runCli("score", "--dir", dir, "--json");
  assert.strictEqual(res.status, 0, `stdout: ${res.stdout}\nstderr: ${res.stderr}`);
  const report = JSON.parse(res.stdout);
  assert.deepStrictEqual(report.refusedRuns, ["t_refused_1.md"]);
  assert.strictEqual(report.coverageComplianceRate, 1, "refused must not drag compliance");
  assert.strictEqual(report.gate.pass, true);
  const row = report.detail.find((r) => r.file === "t_refused_1.md");
  assert.strictEqual(row.refused, true);
});

test("RT-P2-2: CI workflow gates the harness (smoke baseline)", () => {
  const yml = fs.readFileSync(
    path.join(__dirname, "..", ".github", "workflows", "roundtable-eval.yml"),
    "utf8"
  );
  assert.match(yml, /score --dir evals\/roundtable\/fixtures\/transcripts\//);
  assert.match(yml, /test_roundtable_eval\.test\.js/);
  assert.match(yml, /test_router\.test\.js/);
  assert.match(yml, /schedule:/, "nightly/weekly trigger required");
  assert.match(yml, /Live LLM panels never run here/, "CI must disclaim live panels");
  for (const p of ["degraded-mode-tiers.md", "step-0-sharpening.md", "roundtable-eval.yml"]) {
    const hits = yml.split(p).length - 1;
    assert.ok(hits >= 2, `${p} must appear in both push and PR path filters (found ${hits})`);
  }
  const runs = [...yml.matchAll(/^\s*run:\s*(.+)$/gm)].map((m) => m[1]);
  assert.ok(runs.length > 0);
  for (const cmd of runs) {
    assert.ok(
      cmd.includes("node --test") || cmd.includes("roundtable_eval.js score"),
      `CI may only run unit tests or the fixture gate, got: ${cmd}`
    );
  }
});

test("RT-P2-2: README documents cost, baselines, and filename convention", () => {
  const README = fs.readFileSync(
    path.join(__dirname, "..", "evals", "roundtable", "README.md"),
    "utf8"
  );
  assert.match(README, /--model flash/);
  assert.match(README, /Smoke baseline/i);
  assert.match(README, /Release baseline/i);
  assert.match(README, /score-YYYY-MM-DD\.json/);
});

test("Regression: evals/roundtable fixtures score cleanly (canonical post-P1-14)", () => {
  const dir = path.join(__dirname, "..", "evals", "roundtable", "fixtures", "transcripts");
  const res = runCli("score", "--dir", dir, "--json");
  // NOTE(RT-P1-14): canonical vocab sweep done — 5 files, all compliant,
  // gate passes. The legacy PASS-vocab file lives in fixtures/legacy/ and
  // is pinned by the normalization test below, not by this gate.
  // NOTE(review-06 follow-on): solo runs are excluded from
  // challenge-compliance (firewalled dispatch); rt-003_solo_1.md carries no
  // coverage block by construction and gates via disclosure + divergence.
  assert.strictEqual(res.status, 0, `stdout: ${res.stdout}\nstderr: ${res.stderr}`);
  const report = JSON.parse(res.stdout);
  assert.strictEqual(report.gate.pass, true, "canonical fixtures must pass the gate");
  for (const f of ["rt-003_native_1.md", "rt-003_native_2.md", "rt-003_native_3.md", "rt-003_solo_1.md", "rt-010_native_1.md"]) {
    assert.ok(report.detail.some((r) => r.file === f), `${f} must be scored`);
  }
  assert.ok(
    report.escalations.some((e) => e.synthesis === "ADR:adr-006"),
    "native_3 escalation must keep id case"
  );
  assert.deepStrictEqual(report.soloDisclosureFailures, []);
});

test("RT-P1-14: legacy vocab file still parses via normalization (not scored)", () => {
  const text = fs.readFileSync(
    path.join(__dirname, "..", "evals", "roundtable", "fixtures", "legacy", "rt-003_solo_2.md"),
    "utf8"
  );
  const v = extractVerdicts(text);
  assert.deepStrictEqual(v.decision, ["GO", "GO", "GO"]);
  assert.strictEqual(v.synthesis, "GO");
  assert.strictEqual(v.legacyTags, 3);
});

test("RT-P1-5: panel state is per-cwd isolated (ADR-006 fencing, not a bug)", () => {
  const dirA = tmpDir();
  const dirB = tmpDir();
  let res = runCliCwd(dirA, "session", "begin", "--topic", "t", "--agents", "@a");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  res = runCliCwd(dirB, "session", "status");
  assert.strictEqual(res.status, 2, "a sibling cwd must not see dirA's panel session");
});

test("Nina reds: score/session/log exit-2 family", () => {
  const dir = tmpDir();
  let res = runCli("score");
  assert.strictEqual(res.status, 2, "score without --dir");
  res = runCli("score", "--dir", path.join(dir, "nope"));
  assert.strictEqual(res.status, 2, "score on missing dir");
  const empty = path.join(dir, "empty");
  fs.mkdirSync(empty);
  res = runCli("score", "--dir", empty);
  assert.strictEqual(res.status, 2, "score on empty dir");
  res = runCliCwd(dir, "log", "--mode", "bogus", "--topic", "t");
  assert.strictEqual(res.status, 2, "log with bad mode");
  res = runCliCwd(dir, "session", "frobnicate");
  assert.strictEqual(res.status, 2, "bad session subcommand");
  res = runCli("coverage", "--file", path.join(dir, "missing.md"));
  assert.strictEqual(res.status, 2, "coverage on missing file");
});

test("Victor gaps: double-begin refused, --force overrides, file-as-dir exits 2", () => {
  const dir = tmpDir();
  let res = runCliCwd(dir, "session", "begin", "--topic", "t", "--agents", "@a");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  res = runCliCwd(dir, "session", "begin", "--topic", "t2", "--agents", "@b");
  assert.strictEqual(res.status, 2);
  assert.match(res.stderr, /already open/);
  res = runCliCwd(dir, "session", "begin", "--topic", "t2", "--agents", "@b", "--force");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  res = runCliCwd(dir, "session", "status");
  assert.strictEqual(JSON.parse(res.stdout).topic, "t2");
  const f = path.join(dir, "afile.md");
  fs.writeFileSync(f, "# x\n");
  res = runCli("score", "--dir", f);
  assert.strictEqual(res.status, 2);
  assert.match(res.stderr, /not a directory/);
});

test("Victor gaps: note/synthesis caps truncate+warn, gross excess exits 2, run_file_present recorded", () => {
  const dir = tmpDir();
  seedTopicsCopy(dir);
  const big = "n".repeat(5000);
  let res = runCliCwd(dir, "log", "--mode", "native", "--topic", "t", "--agents", "@a", "--note", big);
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  assert.match(res.stderr, /truncated to 4096/);
  const huge = "n".repeat(70000);
  res = runCliCwd(dir, "log", "--mode", "native", "--topic", "t", "--agents", "@a", "--note", huge);
  assert.strictEqual(res.status, 2);
  assert.match(res.stderr, /exceeds 65536/);
  const runFile = path.join(dir, "t_native_1.md");
  fs.writeFileSync(runFile, transcript({}));
  res = runCliCwd(dir, "log", "--mode", "native", "--topic", "t", "--agents", "@a", "--run-file", runFile);
  assert.strictEqual(res.status, 0);
  res = runCliCwd(dir, "log", "--mode", "native", "--topic", "t", "--agents", "@a", "--run-file", path.join(dir, "later.md"));
  assert.strictEqual(res.status, 0, "pending run-file must warn, not fail");
  const logPath = path.join(dir, "artifacts", "evals", "roundtable", "telemetry", "log.jsonl");
  const entries = fs.readFileSync(logPath, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
  assert.strictEqual(entries[1].run_file_present, true);
  assert.strictEqual(entries[2].run_file_present, false);
});

test("Victor follow-up: synthesis over-cap exits 2", () => {
  const dir = tmpDir();
  seedTopicsCopy(dir);
  const res = runCliCwd(dir, "log", "--mode", "native", "--topic", "t", "--agents", "@a", "--synthesis", "s".repeat(5000));
  assert.strictEqual(res.status, 2);
  assert.match(res.stderr, /exceeds 4096/);
});

test("RT-P1-9/SPC: unanimous sound topic without red-team marker fails the gate", () => {
  const dir = tmpDir();
  fs.writeFileSync(
    path.join(dir, "t_native_1.md"),
    transcript({ verdicts: "[VERDICT: GO]\n[VERDICT: GO]", synthesis: "[SYNTHESIS: GO]" })
  );
  const topics = path.join(dir, "topics.json");
  fs.writeFileSync(
    topics,
    JSON.stringify([{ id: "t", topic: "t", premise_quality: "sound", expected_verdict_hint: "GO", expected_frictions: [] }])
  );
  let res = runCli("score", "--dir", dir, "--json", "--topics", topics);
  assert.strictEqual(res.status, 1);
  assert.ok(JSON.parse(res.stdout).gate.failures.some((f) => f.includes("without red-team challenger")));
  fs.writeFileSync(
    path.join(dir, "t_native_1.md"),
    "[RED-TEAM: @security-engineer]\n" + transcript({ verdicts: "[VERDICT: GO]\n[VERDICT: GO]", synthesis: "[SYNTHESIS: GO]" })
  );
  res = runCli("score", "--dir", dir, "--json", "--topics", topics);
  assert.strictEqual(res.status, 0, `stdout: ${res.stdout}\nstderr: ${res.stderr}`);
});

test("RT-P1-9/SPC: flawed-premise unanimity stays exempt", () => {
  const dir = tmpDir();
  fs.writeFileSync(
    path.join(dir, "t_native_1.md"),
    transcript({ verdicts: "[VERDICT: NO-GO]\n[VERDICT: NO-GO]", synthesis: "[SYNTHESIS: NO-GO]" })
  );
  const topics = path.join(dir, "topics.json");
  fs.writeFileSync(
    topics,
    JSON.stringify([{ id: "t", topic: "t", premise_quality: "flawed", expected_verdict_hint: "NO-GO", expected_frictions: [] }])
  );
  const res = runCli("score", "--dir", dir, "--json", "--topics", topics);
  assert.strictEqual(res.status, 0, `stdout: ${res.stdout}\nstderr: ${res.stderr}`);
});

test("RT-P2-6: overrides audit counts markers and fires revisit above threshold", () => {
  const dir = tmpDir();
  for (let i = 0; i < 10; i++) {
    const marker = i < 3 ? "\n[ROUTING-OVERRIDE: default -> chosen -- reason: user asked]\n" : "\nno markers here\n";
    fs.writeFileSync(path.join(dir, `s${i}.md`), `# session ${i}${marker}`);
  }
  let res = runCli("overrides", "--dir", dir, "--json");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  let report = JSON.parse(res.stdout);
  assert.strictEqual(report.sessions_scanned, 10);
  assert.strictEqual(report.sessions_with_overrides, 3);
  assert.strictEqual(report.override_rate, 0.3);
  assert.strictEqual(report.revisit, true);
  const dir2 = tmpDir();
  fs.writeFileSync(path.join(dir2, "s0.md"), "# clean\n[SPC: inversion-applied]\n");
  res = runCli("overrides", "--dir", dir2, "--json");
  report = JSON.parse(res.stdout);
  assert.strictEqual(report.sessions_with_overrides, 0, "completed gates must not count as overrides");
  assert.strictEqual(report.revisit, false);
});

test("RT-P2-6: overrides requires --dir and rejects files", () => {
  let res = runCli("overrides");
  assert.strictEqual(res.status, 2);
  const dir = tmpDir();
  const f = path.join(dir, "f.md");
  fs.writeFileSync(f, "# x\n");
  res = runCli("overrides", "--dir", f);
  assert.strictEqual(res.status, 2);
});

test("RT-P1-8 follow-up: flawed-but-reshapeable decision topic exists (rt-013)", () => {
  const TOPICS = JSON.parse(
    require("fs").readFileSync(require("path").join(__dirname, "..", "evals", "roundtable", "topics.json"), "utf8")
  );
  const byId = Object.fromEntries(TOPICS.map((t) => [t.id, t]));
  assert.strictEqual(byId["rt-013"].gate, "decision");
  assert.strictEqual(byId["rt-013"].premise_quality, "flawed");
  assert.strictEqual(byId["rt-013"].expected_verdict_hint, "RESHAPE");
});

test("RT-P2-6: ROSTER line observer check flags silent beyond-2 seats, passes voiced ones", () => {
  const dir = tmpDir();
  fs.writeFileSync(
    path.join(dir, "t_native_1.md"),
    "ROSTER: @a,@b,@c\n" + transcript({
      block: ["```roundtable-coverage", "panel: @a,@b,@c", "challenges:", "- @a -> @b:", "- @b -> @a:", "- @a -> @c:", "```"].join("\n"),
    })
  );
  let res = runCli("score", "--dir", dir, "--json");
  assert.strictEqual(res.status, 0, `stdout: ${res.stdout}\nstderr: ${res.stderr}`);
  let report = JSON.parse(res.stdout);
  assert.deepStrictEqual(report.observerSilentFlags, ["t_native_1.md: @c seated beyond 2 but never challenges"]);
  fs.writeFileSync(
    path.join(dir, "t_native_2.md"),
    "ROSTER: @a,@b,@c\n" + transcript({
      block: ["```roundtable-coverage", "panel: @a,@b,@c", "challenges:", "- @a -> @c:", "- @c -> @a:", "- @a -> @b:", "- @b -> @a:", "```"].join("\n"),
    })
  );
  res = runCli("score", "--dir", dir, "--json");
  report = JSON.parse(res.stdout);
  assert.ok(!report.observerSilentFlags.some((f) => f.startsWith("t_native_2.md")), "voiced observer must not flag");
});

test("RT-P2-6: transcripts without ROSTER lines skip observer check", () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, "t_native_1.md"), transcript({}));
  const res = runCli("score", "--dir", dir, "--json");
  const report = JSON.parse(res.stdout);
  assert.deepStrictEqual(report.observerSilentFlags, []);
});

test("Review06-followup: solo excluded from challenge-compliance, native still gates", () => {
  const dir = tmpDir();
  // Native with a real coverage gap must still fail the gate.
  fs.writeFileSync(
    path.join(dir, "t_native_1.md"),
    transcript({
      block: ["```roundtable-coverage", "panel: @a,@b", "challenges:", "- @a -> @a:", "```"].join("\n"),
    })
  );
  // Solo without any coverage block must not rescue or worsen the gate math:
  // it is excluded, disclosed, and still divergence-tracked.
  fs.writeFileSync(
    path.join(dir, "t_solo_1.md"),
    `[MODE: solo — isolated calls, 2 seats]\n` + transcript({ block: "<!-- no coverage in solo mode -->" })
  );
  const res = runCli("score", "--dir", dir, "--json");
  assert.strictEqual(res.status, 1, "native coverage gap must still fail the gate");
  const report = JSON.parse(res.stdout);
  assert.deepStrictEqual(report.soloExcludedFromCompliance, ["t_solo_1.md"]);
  assert.deepStrictEqual(report.soloDisclosureFailures, []);

  // Solo-only dir: nothing to gate on compliance, gate passes on that axis.
  const dir2 = tmpDir();
  fs.writeFileSync(
    path.join(dir2, "t_solo_1.md"),
    `[MODE: solo — isolated calls, 2 seats]\n` + transcript({ block: "<!-- no coverage in solo mode -->" })
  );
  const res2 = runCli("score", "--dir", dir2, "--json");
  const report2 = JSON.parse(res2.stdout);
  assert.strictEqual(report2.coverageComplianceRate, null, "solo-only dir is unmeasured, never a vacuous 1.0");
  assert.deepStrictEqual(report2.soloExcludedFromCompliance, ["t_solo_1.md"]);
});
