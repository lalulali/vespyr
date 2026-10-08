/**
 * Guard against stub-derived skill benchmarks coming back.
 *
 * THE DEFECT: several `skills/*` benchmarks asserted vocabulary copied out of the mock
 * stubs in tools/eval/runner.js rather than out of the skill. Two failure modes, both
 * measured across all 159 assertContains strings:
 *
 *   vacuous  — the assert is only text of a mock stub return, so the benchmark passes
 *              in mock mode while testing nothing a real agent would write
 *   inverted — the assert names a concept the skill expresses differently, so a CORRECT
 *              agent fails (e.g. SKILL-INCIDENT asserted "Post-Mortem"; the skill and
 *              its template both say "Post-Incident Review")
 *
 * WHAT THIS TEST LOCKS, AND WHY ONLY THIS MUCH: the gate fires on asserts that are BOTH
 * mock-derived AND unreachable from the real skill corpus. That is the provable subset.
 *
 * What this test deliberately does NOT do: fail on every mock-derived assert. 101 of
 * 159 are mock-derived AND reachable — the word happens to exist in the skill for
 * reasons unrelated to whoever wrote the benchmark. Flagging those would be 101 false
 * alarms, and a gate nobody can pass is a gate nobody reads. Reachability is weak
 * evidence; provably-wrong is strong.
 *
 * The "known-benign" list below is an explicit allowlist, not a silent pass. Each entry
 * states WHY it is correct. An unexplained allowlist entry is worse than a failure.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SUITE_DIR = path.join(ROOT, 'evals/suites/skills');
const SKILLS_ROOT = path.join(ROOT, '.agents/skills');
const RUNNER = path.join(ROOT, 'tools/eval/runner.js');

// --- Locate the mock-stub block. If this fails, the gate would pass vacuously. ----

function mockStubText() {
  const lines = fs.readFileSync(RUNNER, 'utf8').split('\n');
  const start = lines.findIndex((l) => l.includes('if (benchmark.skill)'));
  assert.ok(start !== -1,
    'runner.js no longer contains `if (benchmark.skill)`. This guard would now pass ' +
    'vacuously — update mockStubText() to match the new structure before trusting it.');
  let end = -1, depth = 0;
  for (let i = start; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0 && i > start) { end = i; break; } }
    }
    if (end !== -1) break;
  }
  assert.ok(end !== -1, 'could not bound the mock-stub block in runner.js — guard is void.');
  assert.ok(end > start + 5,
    'mock-stub block collapsed to a few lines; the guard is probably matching the wrong thing.');
  return lines.slice(start, end + 1).join('\n').toLowerCase();
}

// --- Corpus: the skill, the templates it pulls in, and the DNA card contract. ----

function resolveSkillDir(id) {
  const slug = id.replace(/^SKILL-/, '').toLowerCase();
  const direct = path.join(SKILLS_ROOT, slug);
  if (fs.existsSync(direct)) return direct;
  let best = null;
  for (const e of fs.readdirSync(SKILLS_ROOT, { withFileTypes: true })) {
    if (e.isDirectory() && (slug === e.name || slug.startsWith(e.name + '-'))) {
      if (!best || e.name.length > best.name.length) best = e;
    }
  }
  return best ? path.join(SKILLS_ROOT, best.name) : null;
}

function walkMd(dir, out, seen, depth = 0) {
  if (depth > 8) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walkMd(f, out, seen, depth + 1);
    else if (e.name.endsWith('.md')) add(f, out, seen, true);
  }
}

// ONE HOP, not transitive. Both extremes were measured and both are wrong:
//
//   skill-dir only  -> 8 false positives. "Executive Summary" lives only in
//     .agents/templates/discovery/discovery-report.md, which SKILL.md names; "Survived:"
//     only in the DNA card contract. Flagging them would train people to ignore the gate.
//
//   fully transitive -> the whole repo. AGENTS.md cites .agents/workflow.md, .agents/skills.md
//     and the memory files, which cite the strategy docs, which cite … The corpus reached
//     322K chars / 57 files from a 1-file skill.
//
// One hop from the skill's own files is the boundary that holds: it reaches what the skill
// explicitly delegates to, and nothing else.
function add(file, out, seen, followRefs) {
  if (seen.has(file)) return;
  seen.add(file);
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return; }
  out.push(text);
  if (!followRefs) return;
  for (const ref of referencesIn(text, file)) add(ref, out, seen, false);
}

const REF_RE = /\[[^\]]*\]\(([^)]+)\)|`([\w./@-]+\.(?:md|json|yaml|yml))`/g;

function referencesIn(text, fromFile) {
  const refs = [];
  const dir = path.dirname(fromFile);
  REF_RE.lastIndex = 0;
  let m;
  while ((m = REF_RE.exec(text)) !== null) {
    const raw = (m[1] || m[2] || '').split('#')[0];
    if (!raw || raw.startsWith('http') || raw.startsWith('mailto')) continue;
    for (const c of [
      path.resolve(dir, raw),
      path.resolve(ROOT, raw),
      path.resolve(ROOT, '.agents', raw),
      path.resolve(ROOT, 'artifacts', raw),
    ]) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) { refs.push(c); break; }
    }
  }
  return refs;
}

// The DNA is the card contract every gate-emitting skill cites (vespyr-dna.md
// §Decision Gate), so "Survived:" is legitimately reachable for any of them. It is added
// as a SEED with refs off — following the DNA's own citations is what explodes.
//
// It is NOT the same for .agents/workflow.md or .agents/skills.md, which are prose
// CATALOGUES: they describe all 20 skills in a table, so they contain the word
// "post-mortem" for /incident even though /incident only ever writes
// "Post-Incident Review". Including a catalogue made this gate pass on a deliberately
// reintroduced defect — verified, not assumed. A corpus that includes a DESCRIPTION of
// the thing under audit will confirm whatever you assert about it.
const DNA = path.join(ROOT, '.agents/references/vespyr-dna.md');

function corpusFor(id) {
  const out = [];
  const seen = new Set();
  const dir = resolveSkillDir(id);
  if (dir) walkMd(dir, out, seen);
  if (fs.existsSync(DNA)) add(DNA, out, seen, false);
  return out.join('\n');
}

// Asserts that are unreachable from the skill yet still correct, each with its reason.
const KNOWN_BENIGN = new Map([
  ['SKILL-DEVELOP-TRACE|US-114',
   'story id under test; supplied by the benchmark prompt and its mockOutput, not by the skill'],
]);

test('no skill benchmark asserts vocabulary that exists only in the eval mock stubs', () => {
  const mock = mockStubText();
  const offenders = [];

  for (const f of fs.readdirSync(SUITE_DIR).filter((x) => x.endsWith('.json')).sort()) {
    const suite = JSON.parse(fs.readFileSync(path.join(SUITE_DIR, f), 'utf8'));
    for (const b of suite.benchmarks || []) {
      const corpus = corpusFor(b.id);
      assert.ok(corpus.length > 0, `${b.id}: empty corpus — resolution is broken, not passing`);
      for (const a of b.assertContains || []) {
        if (typeof a !== 'string' || a.trim().length < 4) continue;
        const key = `${b.id}|${a.trim()}`;
        if (KNOWN_BENIGN.has(key)) continue;
        const lower = a.trim().toLowerCase();
        let reachable;
        try { reachable = new RegExp(a.trim(), 'i').test(corpus); }
        catch { reachable = corpus.toLowerCase().includes(lower); }
        if (!reachable && mock.includes(lower)) {
          offenders.push(`${b.id}  "${a.trim()}"`);
        }
      }
    }
  }

  assert.deepStrictEqual(offenders, [],
    `These asserts are text of a mock stub AND absent from the real skill corpus, so they ` +
    `pass on nothing an agent would write (or punish correct work). Rewrite them against ` +
    `vocabulary the skill actually emits:\n  ${offenders.join('\n  ')}`);
});

test('the known-benign allowlist has not gone stale', () => {
  // If a benign entry becomes genuinely reachable, or a new one is added without a
  // reason, this fails. An unexplained allowlist entry is worse than a failure.
  for (const [key, reason] of KNOWN_BENIGN) {
    assert.ok(reason && reason.length > 20, `${key} must carry a stated reason`);
    const [id, assertStr] = key.split('|');
    const corpus = corpusFor(id);
    let reachable;
    try { reachable = new RegExp(assertStr, 'i').test(corpus); }
    catch { reachable = corpus.toLowerCase().includes(assertStr.toLowerCase()); }
    assert.strictEqual(reachable, false,
      `${key} is now reachable from the skill corpus — remove it from the allowlist, ` +
      `it is no longer an exception.`);
  }
});

test('the corpus walk reaches templates, so template-only vocabulary is not flagged', () => {
  // Regression on the false-positive side. "Executive Summary" lives ONLY in
  // .agents/templates/discovery/discovery-report.md — the SKILL-DISCOVERY-REPORT skill
  // dir does not contain it, but SKILL.md cites that template by name.
  const corpus = corpusFor('SKILL-DISCOVERY-REPORT');
  assert.ok(/Executive Summary/i.test(corpus),
    'template-resident vocabulary must be reachable; omitting it makes the gate noisy');
});

test('the corpus must NOT include prose catalogues of the skills themselves', () => {
  // The failure that made this gate vacuous. .agents/workflow.md describes all 20 skills
  // in a table and writes "post-mortem" for /incident, while /incident and its template
  // only ever write "Post-Incident Review". A corpus containing a description of the
  // thing under audit confirms whatever you assert about it.
  const corpus = corpusFor('SKILL-INCIDENT');
  assert.ok(!/post-mortem/i.test(corpus),
    'SKILL-INCIDENT corpus must not contain "post-mortem" — a catalogue leaked in. ' +
    'This is exactly the shape that let a reintroduced defect pass.');
  assert.ok(/post-incident review/i.test(corpus),
    'sanity: the vocabulary /incident actually emits must still be reachable');
});

test('the gate bites — a reintroduced mock-only assert is caught', () => {
  // A gate that has never failed is not a gate. Verified by construction: "Post-Mortem"
  // is literal text of the incident mock stub (runner.js) and absent from /incident.
  assert.ok(mockStubText().includes('post-mortem'),
    'fixture assumption: the incident mock stub really does contain "Post-Mortem"');
  assert.ok(!/post-mortem/i.test(corpusFor('SKILL-INCIDENT')),
    'and the real /incident corpus really does not');
});