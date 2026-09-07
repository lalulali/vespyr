const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const TIERS = read(".agents/references/degraded-mode-tiers.md");
const STEP0 = read(".agents/references/step-0-sharpening.md");
const ROUNDTABLE = read(".agents/skills/round-table/SKILL.md");
const ELICITATION = read(".agents/skills/elicitation/SKILL.md");
const BRAINSTORMING = read(".agents/skills/brainstorming/SKILL.md");

// --- RT-P1-13: shared degraded-mode tiers ---

test("RT-P1-13: tiers contract covers native/solo/refused + simulated exception + telemetry", () => {
  assert.match(TIERS, /native mode \(default\)/i);
  assert.match(TIERS, /--solo/);
  assert.match(TIERS, /refuse/i);
  assert.match(TIERS, /--simulated/);
  assert.match(TIERS, /perspectives will converge/);
  assert.match(TIERS, /roundtable_eval\.js log/);
});

test("RT-P1-13: round-table and elicitation cite the tiers file without restating it", () => {
  for (const [name, skill] of [["round-table", ROUNDTABLE], ["elicitation", ELICITATION]]) {
    assert.match(skill, /degraded-mode-tiers\.md/, `${name} must cite the shared tiers file`);
  }
  assert.doesNotMatch(ROUNDTABLE, /offer `--solo` only if the user explicitly insists/);
  assert.doesNotMatch(ELICITATION, /unless the user explicitly insists on `--simulated`/);
});

// --- RT-P1-13: shared Step-0 sharpening ---

test("RT-P1-13: step-0 contract covers restate/fuzz/emit/confirm", () => {
  assert.match(STEP0, /Restate the target/);
  assert.match(STEP0, /max 5 concrete bullets/i);
  assert.match(STEP0, /do not manufacture ambiguity/i);
  assert.match(STEP0, /HALT.*Correct, or edit/i);
});

test("RT-P1-13: brainstorming and elicitation cite step-0 with skill-specific use", () => {
  assert.match(BRAINSTORMING, /step-0-sharpening\.md/);
  assert.match(BRAINSTORMING, /--context/);
  assert.match(ELICITATION, /step-0-sharpening\.md/);
  assert.match(ELICITATION, /telemetry `--topic`/);
  assert.doesNotMatch(BRAINSTORMING, /what are we brainstorming, and what kind of output/);
  assert.doesNotMatch(ELICITATION, /A critique of a vague target produces vague critique/);
});

test("RT-P2-5: elicitation marker parity with brainstorming SPC bar", () => {
  const SKILL = fs.readFileSync(
    path.join(__dirname, "..", ".agents", "skills", "elicitation", "SKILL.md"),
    "utf8"
  );
  assert.match(SKILL, /\[ELICITATION: <method-name> -> discarded — \{user-rejected \| superseded-by-\{other-method\}/);
  assert.match(SKILL, /out-of-scope — "\{quoted Step-0 boundary\}"/);
  assert.match(SKILL, /\[ELICITATION-SKIPPED: <method-name> — \{one of:/);
  assert.match(SKILL, /owner `@tech-lead` counts skip markers per rolling 10 sessions/);
});

test("RT-P2-3 follow-up: orphaned coverage fixtures are pinned, not dead", () => {
  const pass = fs.readFileSync(
    path.join(__dirname, "..", "evals", "roundtable", "fixtures", "coverage-pass.md"),
    "utf8"
  );
  const fail = fs.readFileSync(
    path.join(__dirname, "..", "evals", "roundtable", "fixtures", "coverage-fail.md"),
    "utf8"
  );
  const { parseCoverage } = require("../.agents/scripts/roundtable_eval");
  const ok = parseCoverage(pass);
  assert.strictEqual(ok.error, null);
  assert.strictEqual(ok.uncovered.length, 0);
  const bad = parseCoverage(fail);
  assert.ok(bad.uncovered.length > 0 || bad.malformed, "fail fixture must not pass clean");
});
