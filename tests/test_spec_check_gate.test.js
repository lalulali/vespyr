/**
 * spec_check.js is loaded by CI (`.agents/scripts/spec_check.js` runs on every skill change),
 * but its own self-test was only reachable via a manual `--self-test` flag — so a regression in
 * the checker itself would pass silently. This test runs that self-test and asserts it passes.
 *
 * It also asserts the check the repo needed most: a cited resource path that does not exist is a
 * violation. Template/step contract drift is invisible to every other rule in spec_check, which is
 * how explore-idea ended up demanding a marker its template never emitted.
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const SPEC_CHECK = path.join(ROOT, ".agents", "scripts", "spec_check.js");

test("spec_check self-test passes (the checker checks itself)", () => {
  const r = spawnSync(process.execPath, [SPEC_CHECK, "--self-test"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.strictEqual(
    r.status,
    0,
    `spec_check --self-test failed:\n${r.stdout}\n${r.stderr}`
  );
  assert.match(r.stdout, /Structure self-test passed\./);
  assert.match(r.stdout, /Self-test passed\./);
});

test("every shipped skill passes spec_check with zero violations", () => {
  const r = spawnSync(process.execPath, [SPEC_CHECK], { cwd: ROOT, encoding: "utf8" });
  assert.strictEqual(r.status, 0, `spec_check reported violations:\n${r.stdout}\n${r.stderr}`);
  assert.doesNotMatch(r.stdout, /violation\(s\)/, "spec_check must report 0 violations");
});

test("the real repo templates referenced by explore-idea exist and are wired", () => {
  // The loop that started this: step-02a told the agent to end market-analysis.md with a
  // `MARKET VERDICT:` line, and step-03 re-dispatched step-02a when that line was missing — but
  // the shipped template never emitted it. Guard the two artifacts that fix depended on.
  const tpl = path.join(ROOT, ".agents/templates/research/market-analysis-template.md");
  const tplTxt = require("fs").readFileSync(tpl, "utf8");
  assert.match(tplTxt, /MARKET VERDICT:/, "template must emit the line step-03 parses");
  assert.match(tplTxt, /\[RESHAPE\]/, "template vocabulary must match step-02a");
  assert.doesNotMatch(tplTxt, /GO WITH CAUTION/, "unparseable vocabulary must be gone");

  const step03 = require("fs").readFileSync(
    path.join(ROOT, ".agents/skills/explore-idea/steps/step-03-founder-review.md"),
    "utf8"
  );
  assert.match(step03, /BOUNDED|once, with the template/i, "the re-dispatch must be bounded");
  assert.match(step03, /research-synthesis\.md/, "the gate needs a canonical home");
  // Positive assertion: the prohibition must be present. Asserting the string is ABSENT would
  // also match the rule that forbids it — "Never write the founder's gate into `market-analysis.md`".
  assert.match(
    step03,
    /Never write the founder's gate into `market-analysis\.md`/,
    "step-03 must explicitly forbid writing the gate into the researcher's artifact"
  );
});