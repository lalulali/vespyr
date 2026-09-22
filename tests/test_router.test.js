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
  assert.ok(
    Number.isInteger(ROUTER.rules.default_seats) && ROUTER.rules.default_seats >= 2,
    "default_seats must be an integer floor >= 2"
  );
  const probes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "evals", "roundtable", "tag-probes.json"), "utf8"));
  assert.deepStrictEqual(
    Object.keys(probes).sort(),
    Object.keys(ROUTER.tags).sort(),
    "tag-probes.json must cover exactly the router tag set (a new tag fails loudly)"
  );
  for (const [tag, topic] of Object.entries(probes)) {
    const res = matchTopicToTags(topic, ROUTER);
    const seats = res.rosterLine.replace("ROSTER: ", "").split(",").filter(Boolean);
    assert.ok(
      seats.length >= ROUTER.rules.default_seats,
      `Probe for tag '${tag}' must produce >= ${ROUTER.rules.default_seats} seats, got ${seats.length}: ${res.rosterLine}`
    );
  }
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

test("RT-P1-1: measurement + precedence policy exists (sunset instrumentation)", () => {
  assert.ok(ROUTER.policy.measurement, "measurement policy must name who counts what");
  assert.match(ROUTER.policy.measurement, /@tech-lead/);
  assert.ok(ROUTER.policy.precedence, "precedence policy must resolve JSON-vs-prose conflicts");
  assert.ok(ROUTER.rules.revisit_sla, "revisit SLA must live in the enforced rules namespace");
  assert.strictEqual(ROUTER.rules.revisit_sla.max_override_rate, 0.20);
  assert.strictEqual(ROUTER.rules.revisit_sla.min_sessions, 10);
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

test("RT-P3-1: untagged query triggers untagged_fallback to produce floor seats", () => {
  const res = matchTopicToTags("completely untagged obscure query xyz", ROUTER);
  assert.strictEqual(res.untaggedFallback, true);
  assert.deepStrictEqual(res.mandatory, ROUTER.rules.untagged_fallback);
  const seats = res.rosterLine.replace("ROSTER: ", "").split(",").filter(Boolean);
  assert.strictEqual(seats.length, 2);
  assert.strictEqual(res.rosterLine, "ROSTER: @tech-lead,@architect");
});

test("RT-P3-1: roster check rejects unallowed seats on untagged topic", () => {
  const res = runCli("roster", "check", "--topic", "completely untagged obscure query xyz", "--seats", "@tech-lead,@architect,@shifu");
  assert.strictEqual(res.status, 2);
  assert.match(res.stderr, /matches no router tag/);
});

test("RT-P3-1: structural guard - every key in router rules has a declared non-test reader", () => {
  const resolveSrc = fs.readFileSync(SCRIPT, "utf8");
  const evalScript = path.join(__dirname, "..", ".agents", "scripts", "roundtable_eval.js");
  const evalSrc = fs.readFileSync(evalScript, "utf8");

  // Explicit reader map (review 09 §3.4): the only escape hatch. Adding a
  // rules.* key without declaring its reader here fails the guard.
  const READERS = {
    default_seats: [resolveSrc, evalSrc],
    hard_cap: [resolveSrc],
    untagged_fallback: [resolveSrc],
    revisit_sla: [evalSrc],
  };

  for (const key of Object.keys(ROUTER.rules)) {
    const readers = READERS[key];
    assert.ok(readers, `rules.${key} is not declared in the reader map — declare its reader or delete the key`);
    const pattern = new RegExp(`rules\\.${key}\\b`);
    assert.ok(readers.some((src) => pattern.test(src)), `rules.${key} has no declared non-test reader`);
  }
});

test("RT-P3-1: rulesOf rejects malformed router tables (type and range validation)", () => {
  const base = { tags: {} };
  assert.throws(
    () => matchTopicToTags("x", { ...base, rules: {} }),
    /missing rules\.default_seats/
  );
  assert.throws(
    () => matchTopicToTags("x", { ...base, rules: { default_seats: "two", hard_cap: 5, untagged_fallback: ["tech-lead"] } }),
    /default_seats must be an integer/
  );
  assert.throws(
    () => matchTopicToTags("x", { ...base, rules: { default_seats: 9, hard_cap: 2, untagged_fallback: ["tech-lead"] } }),
    /default_seats must be <= rules\.hard_cap/
  );
  assert.throws(
    () => matchTopicToTags("x", { ...base, rules: { default_seats: 2, hard_cap: 5, untagged_fallback: "tech-lead" } }),
    /untagged_fallback must be a non-empty array/
  );
});

test("RT-P3-1: bidirectional contract - router roster satisfies parseCoverage across all tag probes", () => {
  const { parseCoverage } = require("../.agents/scripts/roundtable_eval");
  const probes = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "evals", "roundtable", "tag-probes.json"), "utf8"));
  for (const [tag, topic] of Object.entries(probes)) {
    const res = matchTopicToTags(topic, ROUTER);
    const panel = res.rosterLine.replace("ROSTER: ", "").split(",").map((s) => s.trim()).filter(Boolean);
    assert.ok(panel.length >= ROUTER.rules.default_seats, `tag '${tag}' must seat >= ${ROUTER.rules.default_seats}`);

    const challenges = panel.map((p, idx) => {
      const target = panel[(idx + 1) % panel.length];
      return `  - ${p} -> ${target}: challenge point`;
    });

    const block = [
      "```roundtable-coverage",
      `panel: ${panel.join(", ")}`,
      "challenges:",
      ...challenges,
      "```"
    ].join("\n");

    const cov = parseCoverage(block, { minSeats: ROUTER.rules.default_seats });
    assert.strictEqual(cov.error, null, `parseCoverage failed for probe '${tag}': ${cov.error}`);
    assert.strictEqual(cov.malformed, false);
    assert.strictEqual(cov.uncovered.length, 0);
  }
});

// --- QA Enrichment Scenario Tests ---

test("QA-ENRICH-1: roster check normalizes dirty whitespace, casing, and trailing commas", () => {
  const res = runCli("roster", "check", "--topic", "eval harness benchmark", "--seats", "  @ml-ai-engineer ,  @qa-engineer, ");
  assert.strictEqual(res.status, 0, `stderr: ${res.stderr}`);
  assert.strictEqual(JSON.parse(res.stdout).pass, true);
});

test("QA-ENRICH-2: tier 2 auto-seating fallback kicks in if tag consulted is empty", () => {
  const fakeRouter = {
    rules: { default_seats: 2, hard_cap: 5, untagged_fallback: ["tech-lead", "architect"] },
    tags: { lone: { mandatory: ["security-engineer"], consulted: [], keywords: ["lonekeyword"] } }
  };
  const res = matchTopicToTags("lonekeyword topic", fakeRouter);
  assert.strictEqual(res.rosterLine, "ROSTER: @security-engineer,@tech-lead");
  assert.deepStrictEqual(res.autoSeated, [{ tag: "fallback", agent: "tech-lead" }]);
});

test("QA-ENRICH-3: topic query with regex metacharacters evaluates safely without syntax crash", () => {
  const res = matchTopicToTags("[auth] (v2.0) + tokens? *deploy* $100", ROUTER);
  assert.ok(res.tags.some((t) => t.tag === "security"));
  assert.ok(res.tags.some((t) => t.tag === "launch"));
  const seats = res.rosterLine.replace("ROSTER: ", "").split(",").filter(Boolean);
  assert.ok(seats.length >= 2);
});

test("QA-ENRICH-4: cmdOverrides handles empty directory without NaN or divide-by-zero", () => {
  const os = require("os");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rt-empty-"));
  const evalScript = path.join(__dirname, "..", ".agents", "scripts", "roundtable_eval.js");
  const res = spawnSync(process.execPath, [evalScript, "overrides", "--dir", tmp, "--json"], { encoding: "utf8" });
  fs.rmdirSync(tmp);
  assert.strictEqual(res.status, 0);
  const data = JSON.parse(res.stdout);
  assert.strictEqual(data.sessions_scanned, 0);
  assert.strictEqual(data.override_rate, 0);
  assert.strictEqual(data.revisit, false);
});

test("QA-ENRICH-5: cmdOverrides partitions autoseat telemetry from override counts on co-occurrence", () => {
  const os = require("os");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rt-override-"));
  fs.writeFileSync(path.join(tmp, "session_1.md"), "[ROUTER-AUTOSEAT: security -> @architect]\n[ROUTING-OVERRIDE: default -> @developer]");
  const evalScript = path.join(__dirname, "..", ".agents", "scripts", "roundtable_eval.js");
  const res = spawnSync(process.execPath, [evalScript, "overrides", "--dir", tmp, "--json"], { encoding: "utf8" });
  fs.rmSync(tmp, { recursive: true, force: true });
  assert.strictEqual(res.status, 0);
  const data = JSON.parse(res.stdout);
  assert.strictEqual(data.sessions_scanned, 1);
  assert.strictEqual(data.sessions_with_overrides, 1);
  assert.strictEqual(data.autoseat_markers_detected, 1);
  assert.deepStrictEqual(data.hits[0].markers, ["routing_override"]);
});

test("RT-P3-7: behavioral assertions - word boundary isolation (D4) and memory/purge routing", () => {
  // 0. Probe artifact exists at evals/roundtable/tag-probes.json per plan spec
  const probesArtifact = path.join(__dirname, "..", "evals", "roundtable", "tag-probes.json");
  assert.ok(fs.existsSync(probesArtifact), "evals/roundtable/tag-probes.json must exist");

  // 1. "investigate memory leak in Node.js event loop" -> performance tag, @performance-engineer, NO @security-engineer
  const rMem = matchTopicToTags("investigate memory leak in Node.js event loop", ROUTER);
  assert.ok(rMem.tags.some((t) => t.tag === "performance"), "memory leak must match performance");
  assert.ok(!rMem.tags.some((t) => t.tag === "security"), "memory leak must NOT match security");
  assert.ok(rMem.rosterLine.includes("@performance-engineer"), "must seat @performance-engineer");
  assert.ok(!rMem.rosterLine.includes("@security-engineer"), "must NOT seat @security-engineer");

  // 2. "security audit of a memory leak in the cache" -> NO security tag (security.excludes exercised)
  const rEx = matchTopicToTags("security audit of a memory leak in the cache", ROUTER);
  assert.ok(!rEx.tags.some((t) => t.tag === "security"), "compound topic with memory leak must be excluded from security");

  // 3. "author a new agent persona for the team" -> NO security tag (D4 whole-word rule)
  const rAuthor = matchTopicToTags("author a new agent persona for the team", ROUTER);
  assert.ok(!rAuthor.tags.some((t) => t.tag === "security"), "author must not match auth");
  assert.ok(!rAuthor.rosterLine.includes("@security-engineer"), "must not seat @security-engineer on author");

  // 4. "authority model for tool permissions" -> NO security tag (D4 whole-word rule)
  const rAuthModel = matchTopicToTags("authority model for tool permissions", ROUTER);
  assert.ok(!rAuthModel.tags.some((t) => t.tag === "security"), "authority must not match auth");
  assert.ok(!rAuthModel.rosterLine.includes("@security-engineer"), "must not seat @security-engineer on authority");

  // 5. "authentication flow review" -> @security-engineer seated (surface forms preserved)
  const rAuthn = matchTopicToTags("authentication flow review", ROUTER);
  assert.ok(rAuthn.tags.some((t) => t.tag === "security"), "authentication must match security");
  assert.ok(rAuthn.rosterLine.includes("@security-engineer"), "must seat @security-engineer on authentication");

  // 6. "purge the cache after deploy" -> NO security tag (excludes guard for accepted purge false positive)
  const rPurgeCache = matchTopicToTags("purge the cache after deploy", ROUTER);
  assert.ok(!rPurgeCache.tags.some((t) => t.tag === "security"), "purge the cache must be excluded from security");

  // 7. "private folder isolation plan: docs packaging git history purge CI test breakage" -> seats @security-engineer
  const rPurgeGit = matchTopicToTags("private folder isolation plan: docs packaging git history purge CI test breakage", ROUTER);
  assert.ok(rPurgeGit.tags.some((t) => t.tag === "security"), "git history purge must match security");
  assert.ok(rPurgeGit.rosterLine.includes("@security-engineer"), "must seat @security-engineer on git purge");
});

test("RT-P3-7 follow-up: inflected surface forms route to their tags (roundtable regression corpus)", () => {
  const probes = [
    ["launch", "we deployed the service to production"],
    ["launch", "who shipped v2 last week"],
    ["launch", "product launched today"],
    ["launch", "automate daily deploys"],
    ["security", "OAuth token flow review"],
  ];
  for (const [tag, topic] of probes) {
    const res = matchTopicToTags(topic, ROUTER);
    assert.ok(
      res.tags.some((t) => t.tag === tag),
      `'${topic}' must match tag '${tag}', got: ${res.rosterLine}`
    );
  }
});


