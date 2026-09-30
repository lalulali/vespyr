# Evals Schema — the real `vespyr-eval` suite format

Vespyr benchmarks skills and agents through one wired runner. There is **no
per-skill eval file**. If you are reading a doc that says
`.agents/skills/<name>/evals/evals.json`, that doc is wrong — this one replaces it.

---

## Where benchmarks live

```
evals/suites/
├── agents/
│   ├── core-swarm.json          personas: founder, PM, designer, architect, tech-lead,
│   │                            reviewer, QA, developer
│   ├── domain-experts.json      researcher, user-researcher, ux-researcher, data-analyst, shifu
│   ├── engineering-ops.json     devops, ml-ai, ml-ai-ops, perf, security, technical-writer
│   └── memory-controller.json
├── skills/
│   ├── delivery.json            develop, plan, launch, test, review
│   ├── design.json              design, motion, validation-patterns
│   ├── discovery.json           validate-idea, shape-up, root-cause, unpack-problem, brainstorming
│   ├── meta-authoring.json      teach-me, craft-lesson, create-agent, create-skill,
│   │                            customize-agent, customize-skill, kanban, memory, phase,
│   │                            retro, status, round-table, help-me, humanize, elicitation
│   ├── operations.json          analyze-data, incident, iterate, sprint-status, legal-safety-audit
│   └── research.json            explore-idea, discovery-report, research-plan,
│                                empathy-map, journey-map, jtbd
├── invariants/
│   ├── grill-me-spcp.json       15 stratified anti-sycophancy traps
│   ├── shut-up-brevity.json     10 brevity + destructive-safety gates
│   └── intent-routing.json      4 routing probes
└── models/
    └── tier-comparison.json     model-tier behaviour
```

A skill's benchmarks live in the suite that matches its **domain**, not in the
skill folder. Adding a benchmark to a suite is how you cover a new skill.

---

## Why centralized

A per-skill `evals.json` had three failure modes, all observed in this repo:

1. **Nothing read it.** `motion/evals/evals.json` sat in the manifest and was
   never loaded by any runner. It looked like coverage and was not.
2. **Two conventions, no enforcement.** A developer adding tests to a skill
   folder and a developer adding them to a suite produced two incompatible
   shapes, and neither was checked.
3. **The original mis-read cost a full plan.** A folder-level review concluded
   "only 1 of 40 skills has evals" because it looked for per-skill folders.
   The truth was 36 of 41 covered by suites. A false premise that survived
   three review passes is the real cost.

---

## Suite shape

```json
{
  "suite": "skills/meta-authoring",
  "description": "Meta-Authoring, Learning & Governance Skills",
  "benchmarks": [
    {
      "id": "SKILL-HELP-ME-NAVIGATE",
      "skill": "help-me",
      "name": "Next-Step Navigation Names One Command",
      "dimension": "prd_completeness",
      "assertContains": ["/design", "Phase"],
      "assertNotContains": ["I cannot", "As an AI"],
      "prompt": "/help-me — I've got a validated brief and nothing else. What do I do next?"
    }
  ]
}
```

### Required per benchmark

| Field | Rule |
|---|---|
| `id` | Unique across the **whole** `evals/suites/` tree. Convention: `SKILL-<NAME>-<SLUG>` or `AGENT-<NAME>-<NN>`. |
| `skill` or `agent` | The target. Exactly one. This is the field coverage is counted by. |
| `name` | Short human title. |
| `dimension` | One of the 7 foundational dimensions (below). |
| `prompt` | The literal user prompt to send. |

### Optional per benchmark

| Field | Use it when |
|---|---|
| `assertContains` | The output must literally contain each string (regex-capable). |
| `assertNotContains` | The output must contain none of these. Put the failure mode here. |
| `maxTokens` | Brevity is part of the contract (`shut-up`). |
| `isAdversarialTrap` | The prompt is a trap; the runner applies trap-specific checks. |
| `expectedVerdict` | With `isAdversarialTrap`: the gate verdict that must appear. |
| `expectedFlawKeywords` | With `isAdversarialTrap`: keywords proving the flaw was named. |
| `requireZeroBlueprintOnNoGo` | With `isAdversarialTrap`: a `[NO-GO]` must not be followed by implementation steps. |
| `maxPci` | With `isAdversarialTrap`: cap on the Premature-Compliance Index. |
| `tier` | Pin the benchmark to tier 0 (deterministic) or tier 1 (semantic). |

### The 7 dimensions

`research_grounding` · `prd_completeness` · `a11y_design` · `code_quality` ·
`req_to_impl` · `sycophantic_premature_convergence` · `memory_adherence` · `brevity`

Pick the dimension the benchmark actually measures. A navigation-report skill
scored on `a11y_design` produces a number nobody can act on.

---

## Invariant suites are skill coverage too

`invariants/grill-me-spcp.json` is how `/grill-me` is covered. It is not a
duplicate of a `/grill-me` benchmark — it is a stronger instrument, because 15
stratified adversarial traps catch more than any single scored prompt would.
`invariants/shut-up-brevity.json` is the same for `/shut-up`: brevity is only
honestly measurable as a token bound.

**Do not add a scored `skills/*` benchmark for a skill that already has an
invariant suite.** If you think the invariant coverage is insufficient, extend
the invariant suite — do not fork it.

---

## Running

```bash
npm run eval              # ALL 13 suites, mock adapter — the load check
npm run eval:skills       # ONLY skills/delivery (1 of 6 skill suites)
npm run eval:invariants   # ONLY invariants/grill-me-spcp
npm run eval:tier0        # deterministic tier only
npm run eval:baseline     # record a new baseline
```

**`npm run eval:skills` is not a load check.** It filters to `skills/delivery`,
so a malformed suite in `research.json` is invisible to it. To confirm every
suite still parses:

```bash
npm run eval 2>&1 | grep -i "malformed suite"    # expect NO output
```

The runner prints `malformed suite: <file> — <error>` for any suite it cannot
parse, and exits 2 when a filter matches zero benchmarks. Treat any such line
as a failure.

### Mock vs. real

`--mock` uses a canned adapter. It verifies that suites **load and route**, not
that a model behaves well — a low mock pass rate is expected and is not a
regression signal on its own. Real scoring needs a live adapter.

---

## Adding a benchmark for a new skill

1. Pick the suite whose domain matches (`delivery`, `design`, `discovery`,
   `meta-authoring`, `operations`, `research`). If an invariant suite already
   covers it, extend that instead.
2. Append to the `benchmarks` array. **Append** — never rewrite the file; other
   work may be uncommitted in it.
3. Give it a globally unique `id`.
4. Assert the **output contract**, not the prose. `assertContains` on a heading
   the skill is contractually required to emit; `assertNotContains` on the
   specific failure mode (`"I cannot"`, `"As an AI"`, a sycophantic opener).
   A benchmark that asserts on writing style is either always-green or arbitrary.
5. Verify:

```bash
npm run eval 2>&1 | grep -i "malformed suite"   # no output
node -e "console.log(require('./evals/suites/skills/<group>.json').benchmarks.length)"
```

---

## What NOT to do

- **Do not create `.agents/skills/<name>/evals/evals.json`.** Nothing reads it.
  It is the exact dead file `motion/evals/evals.json` became.
- **Do not add a `.opencode` mirror.** That tree was removed in 02e;
  `.agents/skills/` is the single source of truth.
- **Do not duplicate invariant coverage in `skills/*`.** Extend the invariant
  suite instead.
- **Do not assert on tone or prose quality.** It is not mechanically decidable,
  so the benchmark is either always-green (useless) or arbitrary (noise).
- **Do not rewrite a whole suite file to add one benchmark.** Append. A
  concurrent uncommitted suite edit is a real failure mode in this repo.
