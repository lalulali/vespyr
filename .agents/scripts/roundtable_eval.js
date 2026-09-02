#!/usr/bin/env node
/**
 * Round-Table Eval — coverage validation, verdict scoring, mode telemetry
 *
 * Usage:
 *   node roundtable_eval.js coverage --file <transcript.md>   (or pipe the block on stdin)
 *   node roundtable_eval.js score   --dir <transcripts-dir> [--topics <topics.json>] [--json]
 *   node roundtable_eval.js log     --mode <native|solo|refused> [--tool <name>] [--topic "..."] [--agents "@a,@b"] [--note "..."]
 *
 * Transcript contract (full spec: evals/roundtable/README.md):
 *   - fenced block ```roundtable-coverage containing `panel:` and `challenges:` lines
 *   - per-panelist verdict lines [VERDICT: GO|RESHAPE|NO-GO|CONFIRMED|PARTIAL|FALSIFIED]
 *   - final outcome line [SYNTHESIS: GO|RESHAPE|NO-GO|ADR:<id>]
 *   - legacy PASS/PIVOT/KILL (pre 2026-09-02) normalize onto GO/RESHAPE/NO-GO
 *   - filename <topic>_<mode>_<run>.md with mode in {native, solo}
 *
 * Exit codes (coverage): 0 = all panelists challenged, 1 = coverage gap, 2 = missing/malformed block
 * Exit codes (score/log): 0 = ok, 2 = usage/input error
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const RESULTS_DIR = path.join(PROJECT_ROOT, 'artifacts', 'evals', 'roundtable');
const STATE_LOG = path.join(RESULTS_DIR, 'telemetry', 'log.jsonl');
const DEFAULT_TOPICS = path.join(PROJECT_ROOT, 'evals', 'roundtable', 'topics.json');
const DECISION_VERDICTS = ['GO', 'RESHAPE', 'NO-GO'];
const LEGACY_DECISION_VERDICTS = { PASS: 'GO', PIVOT: 'RESHAPE', KILL: 'NO-GO' };
const normalizeVerdict = (v) => LEGACY_DECISION_VERDICTS[v] || v;
const ALL_VERDICTS = [...DECISION_VERDICTS, 'CONFIRMED', 'PARTIAL', 'FALSIFIED'];
const MODES = ['native', 'solo', 'refused'];

function usage() {
  console.error('Usage: node roundtable_eval.js <coverage|score|log> [flags] — see header docblock');
  process.exit(2);
}

function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    if (!rest[i].startsWith('--')) usage();
    const key = rest[i].slice(2);
    if (key === 'json') { flags.json = true; continue; }
    flags[key] = rest[i + 1];
    i++;
  }
  return { cmd, flags };
}

function readCoverageBlock(text) {
  const fence = text.match(/^```(?:\s)?roundtable-coverage[^\n]*\n([\s\S]*?)\n```/m);
  return fence ? fence[1] : null;
}

function parseCoverage(text) {
  const block = readCoverageBlock(text);
  if (!block) return { error: 'no ```roundtable-coverage block found' };
  const panelLine = block.match(/^panel:\s*(.+)$/m);
  if (!panelLine) return { error: '`panel:` line missing from coverage block' };
  const panel = panelLine[1].split(',').map((s) => s.trim()).filter(Boolean);
  if (panel.length < 2) return { error: 'panel needs at least 2 panelists' };
  if (panel.some((p) => !p.startsWith('@'))) return { error: `malformed panel entry in: ${panelLine[1]}` };
  const challenges = [];
  const re = /^[-*]\s*(@[\w.-]+)\s*->\s*(@[\w.-]+)\s*:/gm;
  let m;
  while ((m = re.exec(block))) challenges.push({ from: m[1], to: m[2] });
  if (!challenges.length) return { panel, challenges, unknown: [], uncovered: panel, error: null, malformed: true };
  const known = new Set(panel);
  const unknown = challenges.filter((c) => !known.has(c.from) || !known.has(c.to));
  const covered = new Set(challenges.filter((c) => c.to !== c.from).map((c) => c.to));
  const uncovered = panel.filter((p) => !covered.has(p));
  return { panel, challenges, unknown, uncovered, error: null, malformed: false };
}

function cmdCoverage(flags) {
  let text;
  if (flags.file) {
    text = fs.readFileSync(flags.file, 'utf8');
  } else if (process.stdin.isTTY) {
    console.error('[roundtable-eval] no --file and stdin is a TTY — nothing to validate');
    process.exit(2);
  } else {
    text = fs.readFileSync(0, 'utf8');
  }
  const result = parseCoverage(text);
  if (result.error) {
    console.error(`[roundtable-eval] FAIL: ${result.error}`);
    process.exit(2);
  }
  for (const u of result.unknown) {
    console.warn(`[roundtable-eval] warn: challenge ${u.from} -> ${u.to} references a non-panelist`);
  }
  if (result.uncovered.length) {
    console.error(`[roundtable-eval] COVERAGE GAP — unchallenged position(s): ${result.uncovered.join(', ')}`);
    console.error('[roundtable-eval] Phase 3 is blocked. Assign a cross-examination or adversarial stress prompt to each listed panelist, then re-run.');
    process.exit(1);
  }
  console.log(`[roundtable-eval] coverage OK: ${result.panel.length} panelists, ${result.challenges.length} challenge(s), every position challenged`);
  process.exit(0);
}

function extractVerdicts(text) {
  // Hyphen included: NO-GO is a canonical verdict token.
  const raw = [...text.matchAll(/\[VERDICT:\s*([A-Za-z][A-Za-z-]*)\]/g)].map((m) => m[1].toUpperCase());
  const synthesisMatch = text.match(/\[SYNTHESIS:\s*([A-Za-z][A-Za-z-]*(?::[\w.-]+)?)\]/);
  const verdicts = raw.map((v) => normalizeVerdict(v));
  return {
    decision: verdicts.filter((v) => DECISION_VERDICTS.includes(v)),
    review: verdicts.filter((v) => ALL_VERDICTS.includes(v) && !DECISION_VERDICTS.includes(v)),
    unknownTags: verdicts.filter((v) => !ALL_VERDICTS.includes(v)),
    legacyTags: raw.filter((v) => LEGACY_DECISION_VERDICTS[v]).length,
    synthesis: synthesisMatch ? normalizeVerdict(synthesisMatch[1].toUpperCase()) : null,
  };
}

function modal(arr) {
  const counts = {};
  for (const v of arr) counts[v] = (counts[v] || 0) + 1;
  let best = null;
  for (const [value, count] of Object.entries(counts)) {
    if (!best || count > best.count) best = { value, count };
  }
  return best ? { ...best, share: best.count / arr.length } : null;
}

function loadTranscripts(dir) {
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const m = f.match(/^(.+)_(native|solo)_(\d+)\.md$/);
      if (!m) return { file: f, nameError: 'filename must be <topic>_<mode>_<run>.md with mode native|solo' };
      return { file: f, topic: m[1], mode: m[2], run: Number(m[3]) };
    });
}

function cmdScore(flags) {
  if (!flags.dir || !fs.existsSync(flags.dir)) {
    console.error('[roundtable-eval] --dir is required and must exist');
    process.exit(2);
  }
  const entries = loadTranscripts(flags.dir).map((e) => {
    if (e.nameError) return { ...e, verdicts: null, coverage: { error: e.nameError }, compliant: false };
    const text = fs.readFileSync(path.join(flags.dir, e.file), 'utf8');
    const verdicts = extractVerdicts(text);
    const cov = parseCoverage(text);
    const compliant = !cov.error && !cov.malformed && Array.isArray(cov.uncovered) && cov.uncovered.length === 0;
    const coverageDetail = cov.error
      ? cov.error
      : (cov.uncovered && cov.uncovered.length ? `gap: ${cov.uncovered.join(', ')}` : null);
    return {
      ...e,
      verdicts,
      coverage: cov,
      coverageDetail,
      compliant,
    };
  });
  if (!entries.length) {
    console.error('[roundtable-eval] no .md transcripts found in --dir');
    process.exit(2);
  }

  const rows = entries.map((e) => {
    const d = e.verdicts ? e.verdicts.decision : [];
    const modalV = d.length >= 2 ? modal(d) : null;
    return {
      topic: e.topic,
      mode: e.mode,
      run: e.run,
      file: e.file,
      decisionVerdicts: d,
      reviewVerdicts: e.verdicts ? e.verdicts.review : [],
      synthesis: e.verdicts ? e.verdicts.synthesis : null,
      badVerdictTags: e.verdicts ? e.verdicts.unknownTags : [],
      disagreementRate: modalV ? Number((1 - modalV.share).toFixed(2)) : null,
      spcFlag: modalV ? modalV.share === 1 : null,
      coverageCompliant: e.compliant,
      coverageDetail: e.coverageDetail,
    };
  });

  const topics = {};
  for (const r of rows) (topics[r.topic] = topics[r.topic] || { native: [], solo: [] })[r.mode].push(r);

  const stability = {};
  for (const [topic, modes] of Object.entries(topics)) {
    const synths = modes.native.map((r) => r.synthesis).filter(Boolean);
    const m = modal(synths);
    stability[topic] = m ? { nativeModalSynthesis: m.value, share: Number(m.share.toFixed(2)), runs: synths.length } : null;
  }

  const divergences = [];
  for (const [topic, modes] of Object.entries(topics)) {
    if (!modes.solo.length || !stability[topic]) continue;
    const expected = stability[topic].nativeModalSynthesis;
    const matches = modes.solo.filter((r) => r.synthesis === expected).length;
    divergences.push({ topic, soloRuns: modes.solo.length, matchingNative: matches, divergence: Number((1 - matches / modes.solo.length).toFixed(2)) });
  }

  let premiseRows = null;
  if (fs.existsSync(flags.topics || DEFAULT_TOPICS)) {
    const defs = JSON.parse(fs.readFileSync(flags.topics || DEFAULT_TOPICS, 'utf8'));
    const byId = Object.fromEntries(defs.map((t) => [t.id, t]));
    premiseRows = Object.keys(topics).filter((t) => byId[t] && byId[t].premise_quality === 'flawed').map((t) => ({
      topic: t,
      premise_quality: 'flawed',
      hint: byId[t].expected_verdict_hint || null,
      observedSyntheses: [...new Set(topics[t].native.concat(topics[t].solo).map((r) => r.synthesis).filter(Boolean))],
    }));
  }

  const flawedIds = new Set((premiseRows || []).map((p) => p.topic));
  const report = {
    transcripts: rows.length,
    coverageComplianceRate: Number((rows.filter((r) => r.coverageCompliant).length / rows.length).toFixed(2)),
    spcFlags: rows.filter((r) => r.spcFlag).map((r) => `${r.file}${flawedIds.has(r.topic) ? ' (flawed premise — unanimity expected)' : ''}`),
    meanRound1Disagreement: (() => {
      const rates = rows.map((r) => r.disagreementRate).filter((v) => v !== null);
      return rates.length ? Number((rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(2)) : null;
    })(),
    verdictStability: stability,
    soloVsNativeDivergence: divergences.length ? Number((divergences.reduce((a, b) => a + b.divergence, 0) / divergences.length).toFixed(2)) : null,
    soloDivergenceByTopic: divergences,
    flawedPremiseCheck: premiseRows,
    detail: rows,
  };

  if (flags.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log(`transcripts: ${report.transcripts}  coverage compliance: ${report.coverageComplianceRate}  mean round-1 disagreement: ${report.meanRound1Disagreement}`);
  console.log(`solo-vs-native divergence: ${report.soloVsNativeDivergence}`);
  console.log('verdict stability (native):');
  for (const [topic, s] of Object.entries(report.verdictStability)) {
    console.log(`  ${topic}: ${s ? `${s.nativeModalSynthesis} (${Math.round(s.share * 100)}% of ${s.runs} runs)` : 'no synthesis markers found'}`);
  }
  if (report.spcFlags.length) {
    console.log('SPC advisory (round-1 unanimity):');
    for (const f of report.spcFlags) console.log(`  - ${f}`);
  }
  if (report.flawedPremiseCheck && report.flawedPremiseCheck.length) {
    console.log('flawed-premise check (should trend NO-GO/RESHAPE):');
    for (const p of report.flawedPremiseCheck) console.log(`  - ${p.topic}: observed ${p.observedSyntheses.join(', ') || 'none'}`);
  }
  const nonCompliant = rows.filter((r) => !r.coverageCompliant);
  if (nonCompliant.length) {
    console.log('coverage non-compliant transcripts:');
    for (const r of nonCompliant) console.log(`  - ${r.file}: ${r.coverageDetail || 'unknown'}`);
  }
}

function cmdLog(flags) {
  if (!flags.mode || !MODES.includes(flags.mode)) {
    console.error(`[roundtable-eval] --mode required, one of: ${MODES.join(', ')}`);
    process.exit(2);
  }
  const entry = {
    ts: new Date().toISOString(),
    tool: flags.tool || 'round-table',
    mode: flags.mode,
    topic: flags.topic || null,
    agents: flags.agents ? flags.agents.split(',').map((s) => s.trim()).filter(Boolean) : [],
    note: flags.note || null,
  };
  fs.mkdirSync(path.dirname(STATE_LOG), { recursive: true });
  fs.appendFileSync(STATE_LOG, JSON.stringify(entry) + '\n');
  console.log(`[roundtable-eval] logged mode=${entry.mode} -> ${path.relative(PROJECT_ROOT, STATE_LOG)}`);
}

const { cmd, flags } = parseArgs(process.argv.slice(2));
if (cmd === 'coverage') cmdCoverage(flags);
else if (cmd === 'score') cmdScore(flags);
else if (cmd === 'log') cmdLog(flags);
else usage();
