const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const BRAINSTORMING = fs.readFileSync(
  path.join(__dirname, "..", ".agents", "skills", "brainstorming", "SKILL.md"),
  "utf8"
);
const ROUNDTABLE = fs.readFileSync(
  path.join(__dirname, "..", ".agents", "skills", "round-table", "SKILL.md"),
  "utf8"
);

// --- RT-P1-7: Step 4b edge (contract pins — prose procedure, presence-gated) ---

test("RT-P1-7: Step 4b routes GO/RESHAPE with threshold default, not a menu", () => {
  assert.match(BRAINSTORMING, /Step 4b/);
  assert.match(BRAINSTORMING, /do not menu/i);
  assert.match(BRAINSTORMING, /2 tensions/);
  assert.match(BRAINSTORMING, /grill-me instead/);
  assert.match(BRAINSTORMING, /roundtable instead/);
});

test("RT-P1-7: NO-GO archives without looping (Zero-Blueprint)", () => {
  assert.match(BRAINSTORMING, /\[NO-GO\][\s\S]{0,200}archive/i);
});

test("RT-P1-7: override is logged with marker format and revisit rule", () => {
  assert.match(BRAINSTORMING, /\[ROUTING-OVERRIDE: default -> chosen -- reason\]/);
  assert.match(BRAINSTORMING, /20% over a rolling 10 sessions/);
  assert.match(BRAINSTORMING, /@tech-lead/);
});

test("RT-P1-7: session file path is passed as the subject", () => {
  assert.match(BRAINSTORMING, /brainstorming-session\.md.*sharpened topic|sharpened topic.*brainstorming-session\.md/s);
});

test("RT-P1-7: handoff and feeds-into list the stress-test loops", () => {
  assert.match(BRAINSTORMING, /\/round-table.*\/grill-me|\/grill-me.*\/round-table/);
});

test("RT-P1-12: SPC marker required with three values before Step-4 write", () => {
  const SKILL = fs.readFileSync(
    path.join(__dirname, "..", ".agents", "skills", "brainstorming", "SKILL.md"),
    "utf8"
  );
  assert.match(SKILL, /\[SPC: inversion-applied\]/);
  assert.match(SKILL, /\[SPC: rosy-absent — \{quoted bullet id \+ rejected option/);
  assert.match(SKILL, /\[SPC: skipped — \{one of: user-explicit-override/);
  assert.match(SKILL, /without the marker fails step completion/i);
  assert.match(SKILL, /20% over a rolling 10 sessions trigger the same revisit/);
});

test("RT-P2-4: specialist co-dispatch on AI/security/perf triggers", () => {
  const SKILL = fs.readFileSync(
    path.join(__dirname, "..", ".agents", "skills", "brainstorming", "SKILL.md"),
    "utf8"
  );
  assert.match(SKILL, /Specialist co-dispatch \(mandatory on trigger\)/);
  assert.match(SKILL, /@ml-ai-engineer.*Kai.*AI\/ML|AI\/ML.*@ml-ai-engineer.*Kai/s);
  assert.match(SKILL, /@security-engineer.*Victor/);
  assert.match(SKILL, /@performance-engineer.*Felix/);
  assert.match(SKILL, /\[CO-DISPATCH: @\{seat\} on \{trigger\}\]/);
  assert.match(SKILL, /Founder remains conductor/);
  assert.match(SKILL, /ML model, LLM prompt, RAG, ML eval/);
  assert.match(SKILL, /Bare words/);
  assert.match(SKILL, /\[CO-DISPATCH-ABSENT: @\{seat\} — \{one of:/);
});

test("RT-P1-7: roundtable has a brainstorm-artifact intake clause", () => {
  const ROUNDTABLE = fs.readFileSync(
    path.join(__dirname, "..", ".agents", "skills", "round-table", "SKILL.md"),
    "utf8"
  );
  assert.match(ROUNDTABLE, /Brainstorm intake/);
  assert.match(ROUNDTABLE, /brainstorming-session\.md/);
  assert.match(ROUNDTABLE, /do not re-sharpen from scratch/i);
});
