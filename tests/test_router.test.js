const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const SCRIPT = path.join(__dirname, "..", ".agents", "scripts", "resolve_agents.js");

function runCli(...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
}

const {
  parseFrontmatter,
  parseTemperature,
  getAgentsDir,
  buildRoster,
  loadRouter,
  matchTopicToTags,
} = require("../.agents/scripts/resolve_agents");
const ROUTER = loadRouter();

const AGENTS_DIR = path.join(__dirname, "..", ".agents", "agents");
const agentFiles = () =>
  fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith(".md")).map((f) => path.basename(f, ".md"));

// --- Router table integrity ---

test("RT-P1-1: router JSON is versioned with rules and a closed tag set", () => {
  assert.match(ROUTER.version, /^\d+\.\d+\.\d+$/);
  assert.strictEqual(ROUTER.owner, "@tech-lead");
  assert.strictEqual(ROUTER.tiebreak, "@founder");
  assert.ok(ROUTER.rules.default_seats === 2, "2-seat default");
  assert.ok(Object.keys(ROUTER.tags).length >= 10, "closed tag vocabulary present");
  for (const [tag, def] of Object.entries(ROUTER.tags)) {
    assert.ok(Array.isArray(def.mandatory) && def.mandatory.length > 0, `${tag} needs mandatory seats`);
    assert.ok(Array.isArray(def.consulted), `${tag} needs consulted list`);
  }
});

test("RT-P1-1: every router seat resolves to a real agent file (drift-proof)", () => {
  const files = new Set(agentFiles());
  for (const [tag, def] of Object.entries(ROUTER.tags)) {
    for (const seat of [...def.mandatory, ...def.consulted]) {
      assert.ok(files.has(seat), `tag '${tag}' seats missing agent file: ${seat}`);
    }
  }
});

test("RT-P1-1: every reasoning participant is seated by at least one tag (no invisible agents)", () => {
  const roster = buildRoster(AGENTS_DIR);
  const seated = new Set();
  for (const def of Object.values(ROUTER.tags)) {
    for (const seat of [...def.mandatory, ...def.consulted]) seated.add(seat);
  }
  for (const [code, agent] of Object.entries(roster)) {
    if (agent.reasoningParticipant === false) continue;
    assert.ok(seated.has(code), `reasoning agent @${code} appears in no router tag`);
  }
});

test("RT-P1-1: eval/prompt tags auto-seat Kai (P1-15 starvation fix)", () => {
  assert.ok(ROUTER.tags.eval.mandatory.includes("ml-ai-engineer"));
  assert.ok(ROUTER.tags.prompt.mandatory.includes("ml-ai-engineer"));
});

test("RT-P1-1: memory-controller is excluded from reasoning participation", () => {
  const roster = buildRoster(AGENTS_DIR);
  assert.strictEqual(roster["memory-controller"].reasoningParticipant, false);
});

test("RT-P1-1: Kai summon_when covers framework self-work (P1-15a)", () => {
  const roster = buildRoster(AGENTS_DIR);
  assert.strictEqual(roster["ml-ai-engineer"].optional, true);
  assert.match(roster["ml-ai-engineer"].summonWhen, /vespyr self-work/);
  assert.doesNotMatch(roster["ml-ai-engineer"].summonWhen, /, tier,/);
});

// --- Resolver fixes ---

test("RT-P1-1: temperature 0 is preserved (falsy-bug fix)", () => {
  assert.strictEqual(parseTemperature("0"), 0);
  assert.strictEqual(parseTemperature(undefined), 0.1);
  assert.strictEqual(parseTemperature("bogus"), 0.1);
  assert.strictEqual(parseTemperature("0.3"), 0.3);
});

test("RT-P1-1: BOM and leading blank lines do not break frontmatter", () => {
  const bom = String.fromCharCode(0xfeff);
  const { data } = parseFrontmatter(`${bom}\n\n---\nname: x\n---\nbody`);
  assert.strictEqual(data.name, "x");
});

test("RT-P1-1: matched quotes stripped, mismatched preserved", () => {
  const { data: a } = parseFrontmatter('---\ntitle: "hello"\n---\n');
  assert.strictEqual(a.title, "hello");
  const { data: b } = parseFrontmatter('---\ntitle: "mismatched\'\n---\n');
  assert.strictEqual(b.title, `"mismatched'`);
});

test("RT-P1-1: agent-dir candidates contain no duplicates", () => {
  assert.ok(getAgentsDir(), "agents dir must resolve");
  const roster = buildRoster(getAgentsDir());
  assert.strictEqual(Object.keys(roster).length, agentFiles().length);
});

test("RT-P1-1: topic overflow errors instead of silently dropping seats", () => {
  const res = runCli(
    "--topic",
    "eval harness benchmark rubric judging agent prompts with security audit PII threat model plus latency p99 profiling and ADR topology decision and launch deploy rollback smoke test"
  );
  assert.strictEqual(res.status, 2);
  assert.match(res.stderr, /roster overflow/);
  const match = JSON.parse(res.stdout);
  assert.ok(match.overflow.length > 0, "dropped seats must be named");
  assert.ok(match.mandatory.length > match.cap);
});

test("RT-P1-1: solo caps at 5 like native (owner decision 2026-09-06)", () => {
  const res = runCli("--topic", "architecture ADR topology with tech debt planning", "--mode", "solo");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  const match = JSON.parse(res.stdout);
  assert.strictEqual(match.cap, 5);
});

test("RT-P1-1: empty --topic is a usage error, trailing flags are not swallowed", () => {
  let res = runCli("--topic");
  assert.strictEqual(res.status, 2);
  assert.match(res.stderr, /requires a value/);
  res = runCli("--topic", "eval harness", "--mode", "solo");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  const match = JSON.parse(res.stdout);
  assert.strictEqual(match.cap, 5, "trailing --mode flag must be parsed, not swallowed into the topic");
});

test("RT-P1-1: cost-accounting thread does not auto-seat specialists (exclusion guard)", () => {
  const res = runCli("--topic", "how much did the 36-run baseline cost");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  const match = JSON.parse(res.stdout);
  assert.ok(!match.tags.some((t) => t.tag === "eval"), "cost phrasing must veto the eval tag");
  assert.ok(!match.mandatory.includes("ml-ai-engineer"), "Kai must not be mandatory here");
});

// --- Executable routing (answers the test-theater charge) ---

test("RT-P1-1: eval topic routes to Kai mandatory", () => {
  const r = matchTopicToTags("design an eval harness with a golden set and judge prompts", ROUTER);
  assert.ok(r.tags.some((t) => t.tag === "eval"), "eval tag must match");
  assert.ok(r.mandatory.includes("ml-ai-engineer"), "Kai must be mandatory");
  assert.match(r.rosterLine, /@ml-ai-engineer/);
});

test("RT-P1-1: model promotion routes to serving (Kai+Atlas), not launch-only", () => {
  const r = matchTopicToTags("model promotion with shadow deploy and rollback policy", ROUTER);
  assert.ok(r.tags.some((t) => t.tag === "serving"), "serving tag must match");
  assert.ok(r.mandatory.includes("ml-ai-ops"), "Atlas must be mandatory");
  assert.ok(r.mandatory.includes("ml-ai-engineer"), "Kai must be mandatory");
});

test("RT-P1-1: copy/pedagogy topic seats zero stochastic agents (Kai absence rule)", () => {
  const r = matchTopicToTags("rewrite the onboarding lesson and handbook chapter", ROUTER);
  const stochastic = ["ml-ai-engineer", "ml-ai-ops", "data-analyst", "performance-engineer"];
  assert.ok(
    r.mandatory.every((s) => !stochastic.includes(s)),
    `mandatory seats must be stochastic-free, got: ${r.mandatory.join(",")}`
  );
});

test("RT-P1-1: ROSTER line format is machine-checkable", () => {
  const r = matchTopicToTags("threat model for secrets in CI", ROUTER);
  assert.match(r.rosterLine, /^ROSTER: (@[\w-]+,?)+$/);
  assert.ok(r.mandatory.includes("security-engineer"));
});

test("RT-P1-1: measurement + precedence rules exist (sunset instrumentation)", () => {
  assert.ok(ROUTER.rules.measurement, "measurement rule must name who counts what");
  assert.match(ROUTER.rules.measurement, /@tech-lead/);
  assert.ok(ROUTER.rules.precedence, "precedence rule must resolve JSON-vs-prose conflicts");
});

test("RT-P2-6: roster check passes a valid tagged roster", () => {
  const res = runCli("roster", "check", "--topic", "eval harness benchmark", "--seats", "@ml-ai-engineer,@qa-engineer");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  assert.strictEqual(JSON.parse(res.stdout).pass, true);
});

test("RT-P2-6: untagged 3rd seat is rejected", () => {
  const res = runCli("roster", "check", "--topic", "eval harness benchmark", "--seats", "@ml-ai-engineer,@qa-engineer,@shifu");
  assert.strictEqual(res.status, 2);
  assert.match(res.stderr, /matches no router tag/);
});

test("RT-P2-6: missing mandatory seat fails", () => {
  const res = runCli("roster", "check", "--topic", "eval harness benchmark", "--seats", "@qa-engineer,@data-analyst");
  assert.strictEqual(res.status, 2);
  assert.match(res.stderr, /missing mandatory seat @ml-ai-engineer/);
});

test("RT-P2-6: over-cap roster fails in both modes (shared cap 5)", () => {
  const seats = "@a,@b,@c,@d,@e,@f";
  for (const mode of ["native", "solo"]) {
    const res = runCli("roster", "check", "--topic", "x", "--seats", seats, "--mode", mode);
    assert.strictEqual(res.status, 2);
    assert.match(res.stderr, /exceeds cap 5/);
  }
});

test("RT-P2-6 follow-up: seat cap is read from router JSON, never hardcoded", () => {
  const { execSync } = require("child_process");
  const src = require("fs").readFileSync(
    require("path").join(__dirname, "..", ".agents", "scripts", "resolve_agents.js"), "utf8"
  );
  const hardcodes = (src.match(/const cap = \d+;/g) || []).length;
  assert.strictEqual(hardcodes, 0, "cap must come from roster-router.json rules.hard_cap");
  const ROUTER = require("../.agents/references/roster-router.json");
  assert.strictEqual(ROUTER.rules.hard_cap, 5);
});
