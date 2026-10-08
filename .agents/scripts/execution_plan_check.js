#!/usr/bin/env node
/**
 * execution_plan_check.js — validator for execution-plan.md.
 *
 * WHY THIS EXISTS
 * `/design` ships `template_conformance.js` and `anti_generic_check.js`; `/motion` ships
 * `motion_spec_check.js` and `motion_assets_check.js`. `/plan` shipped **nothing** — its entire
 * Done-when was prose, so every rule in the skill ("1-4h per task", "spikes capped at 2h",
 * "mark parallelizable tasks", "every task is independently runnable") was enforced by an agent
 * choosing to read it carefully. A checklist is not a gate.
 *
 * It also mirrors the traceability defect this session found in /motion. There, a prompt could
 * be complete while the user story it claimed to serve did not exist — the "silent drop": work
 * designed, never built. The same failure exists here and is worse, because it is silent in both
 * directions: a spec with uncovered acceptance criteria, and a task that serves nothing.
 *
 * WHAT IT CHECKS
 *   - required sections present (task list, dependency graph, risk register)
 *   - every task has a numeric estimate inside 1-4h; spikes are capped at 2h
 *   - `Depends On` and `Parallel With` reference task IDs that actually exist
 *   - the dependency graph agrees with the table (an arrow whose endpoint is missing is a lie)
 *   - no unresolved `{placeholder}` anywhere in a field that claims to be filled
 *   - COVERAGE: every `US-###` in user-stories.md is served by ≥1 task, and every task traces to
 *     ≥1 story. This is the /plan analogue of /motion's bidirectional traceability.
 *   - a dependency cycle, which would make the plan unexecutable while looking complete
 *
 * ABSENCE IS CONTEXT-DEPENDENT, same rule as the motion gates. By default a missing plan is a
 * skip (exit 0) — correct for callers where planning is optional. Under `--require-plan` — which
 * `/plan` Phase 5 must pass — absence is a FAILURE, because that phase is only reachable once a
 * plan is in scope.
 *
 * Usage:
 *   node .agents/scripts/execution_plan_check.js check \
 *     [--plan <path>] [--spec <path>] [--user-stories <path>] [--root <dir>] [--require-plan] [--json]
 *
 * Exit 0 = conformant or skipped. Exit 1 = failure (listed). Exit 2 = usage/IO error.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  plan: 'artifacts/output/05-planning/execution-plan.md',
  spec: 'artifacts/output/03-strategy/product-spec.md',
  userStories: 'artifacts/output/03-strategy/user-stories.md',
};

const MIN_TASK_HOURS = 1;
const MAX_TASK_HOURS = 4;
const MAX_SPIKE_HOURS = 2;

const REQUIRED_SECTIONS = [
  { re: /^##\s+Task list/im, name: 'Task list' },
  { re: /^##\s+Dependency graph/im, name: 'Dependency graph' },
  { re: /^##\s+Risk register/im, name: 'Risk register' },
];

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--require-plan') args.requirePlan = true;
    else if (a === '--plan') args.plan = argv[++i];
    else if (a === '--spec') args.spec = argv[++i];
    else if (a === '--user-stories') args.userStories = argv[++i];
    else if (a === '--root') args.root = argv[++i];
    else args._.push(a);
  }
  return args;
}

const readIf = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);

/** Split a markdown table's body rows into cell arrays. */
function tableRows(section) {
  const lines = section.split('\n');
  const rows = [];
  let header = null;
  for (const line of lines) {
    const t = line.trim();
    if (!t.startsWith('|')) continue;
    const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (/^[-: ]+$/.test(t.replace(/\|/g, '').trim())) continue;
    if (!header) { header = cells; continue; }
    rows.push(cells);
  }
  return { header: header || [], rows };
}

function checkExecutionPlan(planText, storiesText, specText) {
  const failures = [];

  for (const { re, name } of REQUIRED_SECTIONS) {
    if (!re.test(planText)) {
      failures.push(`execution-plan.md: missing the "## ${name}" section.`);
    }
  }

  const taskSection = (planText.match(/^##\s+Task list[\s\S]*?(?=^##\s|(?![\s\S]))/im) || [''])[0];
  const { header, rows } = tableRows(taskSection);

  if (rows.length === 0) {
    failures.push('execution-plan.md: the Task list table has no task rows.');
    return failures;
  }

  const col = {};
  header.forEach((h, i) => { col[h.toLowerCase().replace(/[^a-z]/g, '')] = i; });
  const IDX = {
    id: col.id,
    task: col.task,
    est: col.esth !== undefined ? col.esth : col.est,
    depends: col.dependson,
    parallel: col.parallelwith,
    story: col.story,
  };
  for (const [k, v] of Object.entries(IDX)) {
    if (v === undefined) {
      failures.push(
        `execution-plan.md: the Task list table has no "${k}" column — found ` +
          `${JSON.stringify(header)}. Without it the plan cannot be verified.`
      );
    }
  }

  if (IDX.story === undefined) {
    failures.push(
      `execution-plan.md: the Task list table has no "Story" column — found ${JSON.stringify(header)}. ` +
        `Every task must cite the US-### it serves. The skill's own template shipped without this ` +
        `column for a while, which made traceability impossible to express.`
    );
  }

  const ids = new Set();
  const isSpike = [];
  for (const r of rows) {
    const id = (r[IDX.id] || '').trim();
    if (!/^T\d{2,}$/i.test(id)) {
      failures.push(`Task row has an unusable ID "${id}" — expected T001-style.`);
      continue;
    }
    if (ids.has(id)) failures.push(`Duplicate task ID ${id} — two rows claim the same identity.`);
    ids.add(id);
    isSpike.push(/spike/i.test(r[IDX.task] || ''));
  }

  // Estimates: numeric and in band. Spikes are capped tighter.
  rows.forEach((r, i) => {
    const id = (r[IDX.id] || '?').trim();
    const raw = (r[IDX.est] ?? '').trim();
    if (!raw) { failures.push(`${id}: no estimate.`); return; }
    if (/^\{.*\}$|__+/.test(raw)) { failures.push(`${id}: estimate is still a placeholder ("${raw}").`); return; }
    const m = raw.match(/(\d+(?:\.\d+)?)/);
    if (!m) { failures.push(`${id}: estimate "${raw}" is not numeric.`); return; }
    const h = Number(m[1]);
    const cap = isSpike[i] ? MAX_SPIKE_HOURS : MAX_TASK_HOURS;
    const floor = isSpike[i] ? 0 : MIN_TASK_HOURS;
    if (h > cap) {
      failures.push(
        `${id}: estimated ${h}h, above the ${cap}h cap${isSpike[i] ? ' for a spike' : ''} — decompose it, ` +
          `or state the uncertainty explicitly instead of inflating the number.`
      );
    }
    if (h < floor) {
      failures.push(`${id}: estimated ${h}h, below ${floor}h — a sub-hour task is over-specified.`);
    }
  });

  // Cross-references must resolve. An unresolvable ID is a plan that cannot be executed.
  for (const r of rows) {
    const id = (r[IDX.id] || '?').trim();
    for (const [label, idx] of [['Depends On', IDX.depends], ['Parallel With', IDX.parallel]]) {
      const cell = idx !== undefined ? (r[idx] || '').trim() : '';
      if (!cell || /^[—\-–\s]*$/.test(cell)) continue;
      for (const ref of cell.match(/T\d{2,}/g) || []) {
        if (ref === id) failures.push(`${id}: lists itself under "${label}".`);
        else if (!ids.has(ref)) failures.push(`${id}: "${label}" references ${ref}, which is not a task in this plan.`);
      }
    }
  }

  // Dependency graph must agree with the table, and must not contain a cycle.
  const graphSection = (planText.match(/^##\s+Dependency graph[\s\S]*?(?=^##\s|(?![\s\S]))/im) || [''])[0];
  const edges = [];
  // SKILL.md's "Dependency syntax" table documents TWO arrows and both point the same way:
  // left is the prerequisite, right is the dependent. `T001 ← T003` reads "T003 depends on
  // T001"; `T001 → T003` is the data/artifact edge, T001's output feeding T003. So a single
  // direction covers both, plus the mermaid/ASCII forms an agent reaches for unprompted.
  // Parsing only one form produced a false failure on a plan the skill's own template
  // sanctions — the "correct behaviour, wrong output" shape this session kept hitting.
  const EDGE = /(T\d{2,})\s*(?:←|->|-->|<-|<--|—>|→|=>|depends on)\s*(T\d{2,})/i;
  for (const line of graphSection.split('\n')) {
    const m = line.match(EDGE);
    if (!m) continue;
    const [, left, right] = m;
    edges.push({ dependsOn: left, task: right });
    for (const ref of [left, right]) {
      if (!ids.has(ref)) failures.push(`Dependency graph references ${ref}, which is not a task in this plan.`);
    }
  }
  // An empty graph is legitimate when nothing depends on anything. Measured by a blind run:
  // this check fired on a plan with zero declared dependencies, reporting "the table says tasks
  // depend on each other, the graph says nothing" about a table that declared no dependencies
  // at all. Only complain when the table and graph actually disagree.
  const declaredEdges = new Set();
  for (const r of rows) {
    const id = (r[IDX.id] || '').trim();
    for (const dep of (IDX.depends === undefined ? [] : (r[IDX.depends] || '').match(/T\d{2,}/g) || [])) {
      declaredEdges.add(`${dep}->${id}`);
    }
  }
  if (graphSection.trim() && edges.length === 0 && declaredEdges.size > 0) {
    failures.push('Dependency graph section has no parseable edge — the table says tasks depend on each other, the graph says nothing.');
  }

  // Table/graph disagreement: a `Depends On` that the graph denies.
  for (const r of rows) {
    const id = (r[IDX.id] || '').trim();
    if (IDX.depends === undefined) break;
    const cell = (r[IDX.depends] || '').trim();
    const declared = new Set(cell.match(/T\d{2,}/g) || []);
    const graphed = new Set(edges.filter((e) => e.task === id).map((e) => e.dependsOn));
    for (const dep of declared) {
      if (ids.has(dep) && !graphed.has(dep)) {
        failures.push(
          `${id}: the table says it depends on ${dep}, but the Dependency graph omits that edge. ` +
            `One of the two is wrong and an implementer cannot tell which.`
        );
      }
    }
  }

  // Cycle detection over the union of both sources.
  const adj = new Map();
  for (const id of ids) adj.set(id, new Set());
  for (const r of rows) {
    const id = (r[IDX.id] || '').trim();
    if (!adj.has(id) || IDX.depends === undefined) continue;
    for (const dep of (r[IDX.depends] || '').match(/T\d{2,}/g) || []) {
      if (adj.has(id) && adj.has(dep)) adj.get(id).add(dep);
    }
  }
  for (const e of edges) if (adj.has(e.task) && adj.has(e.dependsOn)) adj.get(e.task).add(e.dependsOn);

  const state = new Map();
  const stack = [];
  let cycle = null;
  const visit = (n) => {
    if (cycle) return;
    state.set(n, 1);
    stack.push(n);
    for (const d of adj.get(n) || []) {
      if (state.get(d) === 1) { cycle = [...stack.slice(stack.indexOf(d)), d]; return; }
      if (!state.has(d)) visit(d);
    }
    state.set(n, 2);
    stack.pop();
  };
  for (const id of ids) if (!state.has(id)) visit(id);
  if (cycle) {
    failures.push(`Dependency cycle: ${cycle.join(' → ')}. A plan with a cycle cannot be executed in any order.`);
  }

  // COVERAGE — the /plan analogue of /motion's bidirectional traceability.
  if (storiesText) {
    const storyIds = new Set((storiesText.match(/US-\d{2,}/g) || []));
    const covered = new Set();
    const taskText = rows.map((r) => r.join(' ')).join('\n');
    for (const s of storyIds) if (new RegExp(`\\b${s}\\b`).test(taskText)) covered.add(s);

    const uncovered = [...storyIds].filter((s) => !covered.has(s));
    if (storyIds.size > 0 && uncovered.length > 0) {
      failures.push(
        `Coverage: ${uncovered.length} user stor${uncovered.length === 1 ? 'y is' : 'ies are'} served by no task ` +
          `(${uncovered.slice(0, 8).join(', ')}${uncovered.length > 8 ? ', …' : ''}) — the plan is missing work.`
      );
    }
    for (const r of rows) {
      const id = (r[IDX.id] || '?').trim();
      const refs = (r.join(' ').match(/US-\d{2,}/g) || []);
      const resolved = refs.filter((s) => storyIds.has(s));
      if (refs.length === 0) {
        failures.push(`${id}: traces to no US-### story — a task that serves nothing is speculative scope.`);
      } else if (storyIds.size > 0 && resolved.length === 0) {
        failures.push(`${id}: references ${refs.join(', ')}, which user-stories.md does not define.`);
      }
    }
  } else if (!readIf(DEFAULTS.userStories)) {
    failures.push(
      'user-stories.md was not found, so task→story coverage could not be checked. ' +
        'Pass --user-stories, or accept an unverified plan.'
    );
  }

  // ACCEPTANCE-CRITERION COVERAGE — the halt condition the story-level check could not see.
  //
  // SKILL.md halts when "the spec contains an acceptance criterion no user story covers",
  // reasoning that such a criterion "cannot be traced to a task, so it silently ships unbuilt".
  // The gate traced `US-###` in both directions and never read `AC-###` at all — measured by a
  // blind run: a plan covering all six stories with zero accessibility and zero load work passed
  // `--require-plan`, while AC-05 (WCAG 2.2 AA) and AC-06 (500 concurrent users, no ops-terminal
  // degradation) sat in the spec unserved. The gate could not enforce the halt condition it was
  // written to enforce. `--spec` was accepted, parsed, and never used.
  if (specText) {
    const declaredACs = [...new Set(specText.match(/\bAC-\d{2,}\b/g) || [])];
    const claimedACs = new Set(storiesText.match(/\bAC-\d{2,}\b/g) || []);

    const orphanACs = declaredACs.filter((ac) => !claimedACs.has(ac));
    if (orphanACs.length > 0) {
      const one = orphanACs.length === 1;
      const subject = one ? `Acceptance criterion ${orphanACs[0]} is` : `Acceptance criteria ${orphanACs.join(', ')} are`;
      failures.push(
        `${subject} claimed by no user story, so ${one ? 'it cannot' : 'they cannot'} be traced to any ` +
          `task — the plan is missing work the spec requires. Decompose ${one ? 'it' : 'each'} into a ` +
          `story first (a non-functional criterion gets a constraint story, not a silent deletion), ` +
          `or escalate to the owner. This is the halt condition above, checked mechanically.`
      );
    }
    const danglingACs = [...claimedACs].filter((ac) => !declaredACs.includes(ac));
    if (danglingACs.length > 0) {
      failures.push(
        `user-stories.md claims ${danglingACs.join(', ')}, which product-spec.md never declares — ` +
          `the requirements and the stories have drifted apart.`
      );
    }
  }

  return failures;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0] || 'check';
  if (cmd !== 'check') {
    console.error('Usage: node execution_plan_check.js check [--plan P] [--spec P] [--user-stories P] [--root R] [--require-plan] [--json]');
    process.exit(2);
  }

  const root = args.root ? path.resolve(args.root) : process.cwd();
  const planPath = path.resolve(root, args.plan || DEFAULTS.plan);
  const storiesPath = path.resolve(root, args.userStories || DEFAULTS.userStories);

  const planText = readIf(planPath);
  if (planText === null) {
    if (args.requirePlan) {
      const msg =
        `execution-plan.md is absent at ${planPath}, but this gate was invoked with --require-plan ` +
        `(the /plan Phase 5 gate). Reaching Phase 5 means a plan is in scope, so an absent file is a ` +
        `missing deliverable, not an out-of-scope skip. Write it from the template in SKILL.md and re-run.`;
      if (args.json) {
        console.log(JSON.stringify({ ok: false, skipped: false, required: true, reason: msg, plan: { path: planPath, found: false }, failures: [msg] }, null, 2));
      } else {
        console.error('✗ execution plan check FAILED — required plan absent');
        console.error(`  ${msg}`);
      }
      process.exit(1);
    }
    if (args.json) {
      console.log(JSON.stringify({ ok: true, skipped: true, reason: 'execution-plan.md not present (planning not in scope)', plan: { path: planPath, found: false } }, null, 2));
    } else {
      console.log('✓ execution plan check skipped — execution-plan.md not present (planning not in scope)');
    }
    process.exit(0);
  }

  const storiesText = readIf(storiesPath) || '';
  // `--spec` was previously parsed and never read: the flag existed, the usage line advertised
  // it, and it did nothing. It is now load-bearing — it is what makes acceptance-criterion
  // coverage checkable at all.
  const specText = readIf(path.resolve(root, args.spec || DEFAULTS.spec)) || '';
  const failures = checkExecutionPlan(planText, storiesText, specText);
  const ok = failures.length === 0;

  if (args.json) {
    console.log(JSON.stringify({ ok, plan: { path: planPath, found: true, userStoriesFound: storiesText.length > 0, specFound: specText.length > 0 }, failures }, null, 2));
  } else if (ok) {
    console.log('✓ execution plan: sections present, every task 1-4h (spikes <=2h), dependencies resolve, no cycle, every user story covered and every task traced');
  } else {
    console.error(`✗ execution plan check FAILED (${failures.length} issue${failures.length === 1 ? '' : 's'})`);
    console.error('  A checklist is not a gate: these rules were prose until now.');
    for (const m of failures) console.error(`  - ${m}`);
  }

  process.exit(ok ? 0 : 1);
}

main();