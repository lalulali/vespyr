#!/usr/bin/env node
/**
 * research_plan_check.js — mechanical gate for /research-plan.
 *
 * WHY THIS EXISTS. /research-plan ships a SKILL.md and nothing else: no step files, no gate, no
 * tests. Three of its own stated rules were pure self-certification.
 *
 *   1. "Each goal must be falsifiable — you should be able to [disprove it]", recorded in the output
 *      as `{goal} — falsifiable? Yes/No`. The agent grading its own homework, in a field it fills in.
 *   2. A "Mom Test Validation" checkbox block. Four boxes the plan's own author ticks. Ticking them
 *      is the entire verification step. The rules being ticked — no future hypotheticals, no
 *      solution pitching, probe past behaviour — are all mechanically detectable, so the boxes cost
 *      nothing and prove nothing.
 *   3. "Minimum 5 for qualitative, 30+ for quantitative". A plan stating a sample size of 3
 *      satisfied every written rule.
 *
 * And one gap: the skill exists to "validate product hypotheses" but never references an upstream
 * hypothesis. /validate-idea produces `validation-brief.md`; nothing here links to it, so a research
 * plan can be written validating nothing at all. That is research without a claim.
 *
 * What is checked:
 *
 *   - no unfilled template placeholders, and a Date
 *   - the plan states WHAT IT VALIDATES (a hypothesis, a named upstream artifact, or an explicit
 *     "no prior hypothesis — this is exploratory" admission)
 *   - 1-3 goals, each carrying an OBSERVABLE rather than the word "falsifiable"
 *   - cohort segment, sample size (the skill's own floor, by method), and recruitment method
 *   - both halves of the interview guide present and non-empty
 *   - the Mom Test enforced on the QUESTIONS, not on a checkbox: no future hypotheticals, no
 *     solution pitching, and past-behaviour probes actually present in Part 2
 *   - a sampling-bias declaration: who is deliberately NOT being asked
 *
 * What is NOT checked: whether the questions are any good, whether the cohort is reachable, or whether
 * the study would actually settle the question. Those need a researcher.
 *
 * Exit 0 = conformant · 1 = failures · 2 = usage/IO error (fail-closed).
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Future-intent phrasings. The Mom Test's central rule: a prediction about the future is worthless,
 * because people predict confidently and wrongly about a hypothetical they have never lived.
 */
const FUTURE_INTENT_RE = /\b(?:would you|do you think you would|will you use|are you likely to|how much would you (?:pay|charge)|if we (?:built|made|added)|do you prefer)\b/i;

/** Solution pitching — asking about OUR artefact rather than their past behaviour. */
const PITCH_RE = /\b(?:our (?:solution|product|app|platform|tool|feature)|would you use our|do you like our)\b/i;

/** Past-behaviour probes that make an answer evidential. */
const PAST_BEHAVIOUR_RE = /\b(?:last time|most recent|walk me through|tell me about|how have you|what did you do|show me how|walk through)\b/i;

/** A goal with no observable in it is a topic, not a claim. */
const OBSERVABLE_RE = /\b\d+\s*%|\bat least\b|\bmore than\b|\bfewer than\b|\bunder\b|\bover\b|\bthan\b|\bper (?:day|week|month)\b|\bwill (?:increase|decrease|drop|rise)\b/i;

/** Words that mark a goal as pure exploration. */
const EXPLORATORY_RE = /^\s*(?:to\s+)?(?:understand|learn|explore|investigate|discover)\b/i;

function failClosed(msg, jsonMode) {
  if (jsonMode) {
    process.stdout.write(JSON.stringify({ exit: 2, fault: msg, failures: [] }, null, 2) + '\n');
  } else {
    console.error(`✗ research_plan_check: ${msg}`);
  }
  process.exit(2);
}

function placeholders(text) {
  const out = [];
  text.split('\n').forEach((line, i) => {
    const m = line.match(/\{\{?[a-z][^}]*\}?\}|\[[a-z][^\]]{2,}\]|<[a-z][a-z _-]{2,}>|\b(?:TBD|TODO|FIXME|XXX|N\/?A)\b/i);
    if (m) out.push({ line: i + 1, token: m[0] });
  });
  return out;
}

/** Body of the heading matching `headingRe`, up to the next same-or-higher heading. */
function section(text, headingRe) {
  const lines = String(text).split('\n');
  const re = new RegExp(`^(\\s*)(#{1,6})\\s*${headingRe}`, 'i');
  let hit = -1;
  let best = 99;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (!m) continue;
    const level = m[2].length;
    if (level >= 2 && level < best) { hit = i; best = level; }
  }
  if (hit === -1) return null;
  const level = lines[hit].match(re)[2].length;
  const body = [];
  for (let j = hit + 1; j < lines.length; j++) {
    const h = lines[j].match(/^(\s*)(#{1,6})\s/);
    if (h && h[2].length <= level) break;
    body.push(lines[j]);
  }
  return body.join('\n');
}

/** Numbered or bulleted items in a block, excluding headers, separators and the checkbox list. */
function items(text) {
  return String(text || '')
    .split('\n')
    .map((l) => l.replace(/^\s*(?:\d+[.)]|[-*+])\s*/, '').trim())
    .filter(Boolean)
    .filter((l) => !/^#{1,6}\s/.test(l))
    .filter((l) => !/^\|[\s:|-]+\|?$/.test(l))
    .filter((l) => !/^\[[ xX]\]\s/.test(l));
}

function words(s) {
  return String(s || '')
    .replace(/[`*_>#|[\]()]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

const QUANTITATIVE = /\b(?:survey|a\/b|experiment|quantitative|statistical|n\s*=\s*\d+)\b/i;

function check(text) {
  const failures = [];

  // ---- template + date ----
  const ph = placeholders(text);
  if (ph.length) {
    failures.push(
      `${ph.length} unfilled template placeholder(s) remain (${ph.slice(0, 4).map((p) => `line ${p.line} ${p.token}`).join('; ')}` +
      `${ph.length > 4 ? '; …' : ''}). This document still contains the template — replace each with real ` +
      'content, or delete the field.'
    );
  }
  if (!/^\s*\*\*Date:?\*\*/im.test(text)) {
    failures.push('No `**Date:**`. A plan with no date cannot be aged or superseded.');
  }

  // ---- what is this validating? ----
  const declaresHypothesis =
    /^\s*\*\*(?:Hypothesis|Validates|Claim|Question)\b/im.test(text) ||
    /validation-brief\.md|problem-space-brief|shaped-brief/i.test(text);
  const admitsExploratory = /\bno prior hypothesis\b|\bexploratory\b|\bnot validating a\b/i.test(text);
  if (!declaresHypothesis && !admitsExploratory) {
    failures.push(
      'The plan never states WHAT IT VALIDATES. The skill exists to validate hypotheses, and ' +
      '`/validate-idea` produces `validation-brief.md` — but nothing here links to it, so a plan can ' +
      'be written validating nothing. Add a `**Hypothesis:**` field naming the claim, or state ' +
      'explicitly that this is exploratory and no prior hypothesis exists.'
    );
  }

  // ---- goals: falsifiable in substance, not by declaration ----
  const goalsSec = section(text, 'Research Goals') || '';
  const goalLines = items(goalsSec).filter((l) => !/^[-*]\s*\*\*(?:Segment|Sample size|Recruitment|Method)/i.test(l));
  if (!goalsSec) {
    failures.push('No `## Research Goals` section.');
  } else if (!goalLines.length) {
    failures.push('The Research Goals section contains no goals. The skill sets a range of 1-3.');
  } else {
    if (goalLines.length > 3) {
      failures.push(
        `${goalLines.length} research goals; the skill says 1-3. A plan with four goals has no ` +
        'priority order, so every goal gets shallowly researched.'
      );
    }
    // Only a goal that is SELF-CERTIFIED AND carries no observable is the defect. An earlier
    // version fired on any goal containing the Yes/No field, which rejected plans whose goals did
    // state an observable — the message said "and nothing else" while never checking it.
    const selfCertified = goalLines.filter(
      (l) => /falsifiable\?\s*(yes|no)/i.test(l) && !OBSERVABLE_RE.test(l)
    );
    if (selfCertified.length && selfCertified.length === goalLines.length) {
      failures.push(
        `${selfCertified.length} goal(s) carry a self-declared \`falsifiable? Yes\` field and no ` +
        'observable. That is the plan grading itself — the same shape as the Mom Test boxes. State ' +
        'the quantity, direction, or threshold that would prove each goal wrong.'
      );
    }
    const declaredNo = goalLines.filter((l) => /falsifiable\?\s*no\b/i.test(l));
    if (declaredNo.length) {
      failures.push(
        `${declaredNo.length} goal(s) are declared NOT falsifiable. A research goal you cannot ` +
        'disprove cannot be settled by research — reframe it around something observable.'
      );
    }
    const nonObservable = goalLines.filter(
      (l) => !OBSERVABLE_RE.test(l) && !/falsifiable\?/i.test(l)
    );
    if (nonObservable.length === goalLines.length && goalLines.length) {
      failures.push(
        'No goal contains an observable. "Understand whether users need X" cannot be disproved; ' +
        '"at least 40% of admins export weekly" can. Every goal needs a quantity, a direction, or ' +
        'a threshold.'
      );
    }
    const pureExploration = goalLines.filter((l) => EXPLORATORY_RE.test(l) && !OBSERVABLE_RE.test(l));
    if (pureExploration.length) {
      failures.push(
        `${pureExploration.length} goal(s) are phrased as exploration ("understand / learn / explore") ` +
        'with no observable attached. Exploration is what a plan does before it has a claim.'
      );
    }
  }

  // ---- cohort ----
  const cohort = section(text, 'Cohort') || '';
  if (!cohort) {
    failures.push('No `## Cohort` section. A plan with no cohort has no one to talk to.');
  } else {
    if (!/\bsegment\b/i.test(cohort) || words(cohort.replace(/.*segment.*/i, '')).length < 3) {
      failures.push('The cohort has no substantive **segment** description.');
    }
    const nMatch = cohort.match(/sample size:?\s*\**\s*(\d+)/i);
    if (!nMatch) {
      failures.push('The cohort states no numeric **sample size**.');
    } else {
      const n = parseInt(nMatch[1], 10);
      const floor = QUANTITATIVE.test(text) ? 30 : 5;
      const why = QUANTITATIVE.test(text)
        ? 'the skill sets 30+ for a quantitative signal'
        : 'the skill sets 5 as the qualitative minimum';
      if (n < floor) {
        failures.push(
          `Sample size is ${n}; ${why}. A plan below the floor cannot produce the signal it ` +
          'promises, and nothing downstream would notice.'
        );
      }
    }
    if (!/\brecruit/i.test(cohort) || words(cohort.replace(/.*recruit.*/i, '')).length < 2) {
      failures.push('The cohort states no **recruitment** method. Recruitment is where cohorts go to die.');
    }
  }

  // ---- methodology ----
  const method = section(text, '(?:Method|Methodology)') || '';
  if (!words(method).length) {
    failures.push('No `## Method` section explaining the chosen methodology.');
  }

  // ---- interview guide: both halves ----
  const guide = section(text, 'Interview Guide') || '';
  if (!guide) {
    failures.push('No `## Interview Guide` section.');
  } else {
    const part1 = section(guide, 'Part 1|Profile') || '';
    const part2 = section(guide, 'Part 2|Behavioral') || '';
    if (items(part1).length < 2) {
      failures.push('Part 1 (profile questions) has fewer than 2 questions. Without background you cannot interpret an answer.');
    }
    if (items(part2).length < 2) {
      failures.push('Part 2 (behavioural questions) has fewer than 2 questions. This is the half that carries evidence.');
    }

    // ---- THE MOM TEST, enforced on the questions rather than on a checkbox ----
    const questions = `${part1}\n${part2}`;
    const future = questions.split('\n').filter((l) => FUTURE_INTENT_RE.test(l));
    if (future.length) {
      failures.push(
        `${future.length} question(s) ask about future intent rather than past behaviour ` +
        `(${future.slice(0, 2).map((l) => l.trim().slice(0, 46)).join(' | ')}). People predict ` +
        'confidently and wrongly about a hypothetical they have never lived — "would you" answers ' +
        'are opinions wearing a transcript costume. Ask about the last time it happened.'
      );
    }
    const pitching = questions.split('\n').filter((l) => PITCH_RE.test(l));
    if (pitching.length) {
      failures.push(
        `${pitching.length} question(s) pitch the solution instead of asking about their behaviour ` +
        `(${pitching.slice(0, 2).map((l) => l.trim().slice(0, 46)).join(' | ')}). A participant who ` +
        'says yes to a hypothetical has told you nothing about whether they would switch.'
      );
    }
    if (items(part2).length && !PAST_BEHAVIOUR_RE.test(part2)) {
      failures.push(
        'Part 2 contains no past-behaviour probe — no "the last time", "walk me through", or "tell ' +
        'me about". Without a concrete past instance, every answer is a reconstruction from memory ' +
        'or a guess.'
      );
    }

    // If the author kept the checkbox block, unticked boxes are a failure — and the ticks are
    // verified against the questions above, so ticking them buys nothing.
    const boxes = (section(text, 'Mom Test') || '').split('\n').filter((l) => /^\s*[-*]\s*\[[ xX]\]/m.test(l));
    if (boxes.length) {
      const unticked = boxes.filter((l) => /\[ \]/.test(l));
      if (unticked.length) {
        failures.push(
          `${unticked.length} Mom Test box(es) are unticked: ${unticked.map((l) => l.replace(/^\s*[-*]\s*/, '').slice(0, 40)).join(' | ')}`
        );
      }
    }
  }

  // ---- sampling bias: the failure mode the Mom Test exists to prevent ----
  const bias = section(text, '(Sampling Bias|Not Asked|Exclusions|Who we will not ask)') || '';
  if (!bias.trim() && !/\bnot asking\b|\bexcluding\b|\bwill not (?:ask|recruit)\b|\bwho we will not\b/i.test(text)) {
    failures.push(
      'The plan does not say WHO IS DELIBERATELY NOT BEING ASKED. A cohort of people who already ' +
      'like the idea produces findings that confirm it, and nothing in the document distinguishes ' +
      'that from a real result. Add a `## Sampling Bias` section naming the segments you are ' +
      'excluding and why.'
    );
  }

  return {
    kind: 'research-plan',
    ok: failures.length === 0,
    exit: failures.length ? 1 : 0,
    failures,
    note:
      'Structure and the Mom Test, enforced on the questions rather than on a checkbox. This does ' +
      'not judge whether the questions are any good, whether the cohort is reachable, or whether ' +
      'the study would settle the question — those need a researcher.',
  };
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file') args.file = argv[++i];
    else if (a === '--json') args.json = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else args._.push(a);
  }
  return args;
}

const USAGE = `Usage: node .agents/scripts/research_plan_check.js check --file artifacts/output/02-research/research-plan.md [--json]

Checks: no unfilled placeholders; a Date; WHAT the plan validates (or an explicit exploratory
admission); 1-3 goals each carrying an observable rather than a self-declared "falsifiable? Yes";
a cohort with segment, sample size at the skill's own floor for the method, and recruitment; both
halves of the interview guide; THE MOM TEST enforced on the questions (no future intent, no solution
pitching, past-behaviour probes present); and a sampling-bias declaration naming who is not being asked.

Exit 0 = conformant · 1 = failures · 2 = usage/IO error (fail-closed).`;

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.file) {
    console.log(USAGE);
    process.exit(args.help ? 0 : 2);
  }
  const cmd = args._[0] || 'check';
  if (cmd !== 'check') failClosed(`unknown command "${cmd}" (expected "check")`, args.json);

  const file = path.resolve(process.cwd(), args.file);
  if (!fs.existsSync(file)) {
    failClosed(`cannot read ${args.file} — a missing research plan is a missing deliverable, never a pass`, args.json);
  }
  const text = fs.readFileSync(file, 'utf8');
  if (!text.trim()) failClosed(`${args.file} is empty — an empty plan is a failure, not a pass`, args.json);

  const result = check(text);
  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else if (result.ok) {
    console.log(`✓ research-plan: conformant — ${args.file}`);
    console.log('  ' + result.note);
  } else {
    const plural = result.failures.length === 1 ? '' : 's';
    console.error(`✗ research-plan: ${result.failures.length} issue${plural} — ${args.file}`);
    for (const f of result.failures) console.error(`  - ${f}`);
  }
  process.exit(result.exit);
}

main();
