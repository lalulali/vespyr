#!/usr/bin/env node
/**
 * Round-Table Eval — coverage validation, verdict scoring, mode telemetry
 *
 * Usage:
 *   node roundtable_eval.js coverage --file <transcript.md>   (or pipe the block on stdin)
 *   node roundtable_eval.js score   --dir <transcripts-dir> [--topics <topics.json>] [--json]
 *   node roundtable_eval.js log     --mode <native|solo|refused> [--tool <name>] [--topic "..."] [--agents "@a,@b"] [--note "..."]
 *       [--topic-id <rt-NNN>] [--synthesis <verdict>] [--coverage-exit <0|1|2>] [--model <name>] [--run-file <path>] [--duration-s <n>]
 *   (log v2: --topic-id must join topics.json; native/solo require non-empty --agents; --run-file warns when absent)
 *   node roundtable_eval.js session begin --topic "..." --agents "@a,@b"  (open panel state)
 *   node roundtable_eval.js session update --turn <n> [--phase <name>]     (advance turn/phase)
 *   node roundtable_eval.js session status                                (resume after compaction)
 *   node roundtable_eval.js session close                                 (clean exit)
 *
 * Transcript contract (full spec: evals/roundtable/README.md):
 *   - fenced block ```roundtable-coverage containing exactly one `panel:` line and `challenges:` lines (`->` or `→`, trailing ':' recommended, self-challenges excluded from counts)
 *   - per-panelist verdict lines [VERDICT: GO|RESHAPE|NO-GO|CONFIRMED|PARTIAL|FALSIFIED] (fenced code quotes ignored)
 *   - concession lines [CONCESSION: reason] are counted and reported
 *   - final outcome line [SYNTHESIS: GO|RESHAPE|NO-GO|ADR:<id>] (ADR id case preserved; escalations excluded from stability)
 *   - legacy PASS/PIVOT/KILL (pre 2026-09-02) normalize onto GO/RESHAPE/NO-GO
 *   - filename <topic>_<mode>_<run>.md with mode in {native, solo}
 *
 * Exit codes (coverage): 0 = all panelists challenged, 1 = coverage gap, 2 = missing/malformed block
 * Exit codes (score): 0 = gate pass, 1 = gate failed (coverage compliance < 1.0 over non-solo runs, or flawed-premise hint contradicted), 2 = usage/input error
 * Exit codes (log/session): 0 = ok, 2 = usage/input error
 */

const fs = require('fs');
const path = require('path');
const { loadRouter } = require('./resolve_agents');

const PROJECT_ROOT = process.cwd();
const RESULTS_DIR = path.join(PROJECT_ROOT, 'artifacts', 'evals', 'roundtable');
const STATE_LOG = path.join(RESULTS_DIR, 'telemetry', 'log.jsonl');
const PANEL_STATE = path.join(PROJECT_ROOT, '.agents', 'state', 'roundtable-current.json');
const DEFAULT_TOPICS = path.join(PROJECT_ROOT, 'evals', 'roundtable', 'topics.json');
const DECISION_VERDICTS = ['GO', 'RESHAPE', 'NO-GO'];
const LEGACY_DECISION_VERDICTS = { PASS: 'GO', PIVOT: 'RESHAPE', KILL: 'NO-GO' };
const normalizeVerdict = (v) => LEGACY_DECISION_VERDICTS[v] || v;
const ALL_VERDICTS = [...DECISION_VERDICTS, 'CONFIRMED', 'PARTIAL', 'FALSIFIED'];
const MODES = ['native', 'solo', 'refused'];

function usage() {
  console.error('Usage: node roundtable_eval.js <coverage|score|log|session> [flags] — see header docblock');
  process.exit(2);
}

function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const flags = {};
  let i = 0;
  if (cmd === 'session' && rest[0] && !rest[0].startsWith('--')) {
    flags._args = [rest[0]];
    i = 1;
  }
  for (; i < rest.length; i++) {
    if (!rest[i].startsWith('--')) usage();
    const key = rest[i].slice(2);
    if (key === 'json') { flags.json = true; continue; }
    if (key === 'force') { flags.force = true; continue; }
    const value = rest[i + 1];
    if (value === undefined || value.startsWith('--')) {
      console.error(`[roundtable-eval] --${key} requires a value`);
      process.exit(2);
    }
    flags[key] = value;
    i++;
  }
  return { cmd, flags };
}

function readCoverageBlock(text) {
  // First fenced block wins; additional blocks are ignored (documented
  // limitation — see RT-P2-3 follow-up: error on >1 block vs first-wins).
  const fence = text.match(/^\s*```\s*roundtable-coverage[^\n]*\n([\s\S]*?)\n\s*```/mi);
  return fence ? fence[1] : null;
}

function parseCoverage(text, options = {}) {
  const warnings = [];
  const block = readCoverageBlock(text);
  if (!block) return { error: 'no ```roundtable-coverage block found', warnings };
  const panelLines = block.match(/^\s*panel:\s*(.+)$/gm) || [];
  if (!panelLines.length) return { error: '`panel:` line missing from coverage block', warnings };
  if (panelLines.length > 1) {
    return { error: `duplicate 'panel:' line (${panelLines.length} found) — multi-turn transcripts must carry exactly one panel`, warnings };
  }
  const panel = panelLines[0].replace(/^\s*panel:\s*/, '').split(',').map((s) => s.trim()).filter(Boolean);
  const minSeats = options.minSeats !== undefined ? options.minSeats : 2;
  if (panel.length < minSeats) return { error: `panel needs at least ${minSeats} panelists`, warnings };
  if (panel.some((p) => !p.startsWith('@'))) return { error: `malformed panel entry in: ${panelLines[0]}`, warnings };
  const challenges = [];
  const re = /^\s*[-*]\s*(@[\w.-]+)\s*(->|→)\s*(@[\w.-]+)(\s*:)?/gm;
  let m;
  while ((m = re.exec(block))) {
    const lineEnd = block.indexOf('\n', m.index);
    const line = (lineEnd === -1 ? block.slice(m.index) : block.slice(m.index, lineEnd)).trim();
    challenges.push({ from: m[1], to: m[3], text: line });
    if (!m[4]) warnings.push(`challenge ${m[1]} -> ${m[3]} missing trailing ':' (accepted — please add it)`);
  }
  if (!challenges.length) return { panel, challenges, unknown: [], uncovered: panel, error: null, malformed: true, warnings };
  const known = new Set(panel);
  const unknown = challenges.filter((c) => !known.has(c.from) || !known.has(c.to));
  const covered = new Set(challenges.filter((c) => c.to !== c.from).map((c) => c.to));
  const uncovered = panel.filter((p) => !covered.has(p));
  return { panel, challenges, unknown, uncovered, error: null, malformed: false, warnings };
}

function cmdCoverage(flags) {
  let text;
  if (flags.file) {
    try {
      text = fs.readFileSync(flags.file, 'utf8');
    } catch {
      console.error(`[roundtable-eval] cannot read --file: ${flags.file}`);
      process.exit(2);
    }
  } else if (process.stdin.isTTY) {
    console.error('[roundtable-eval] no --file and stdin is a TTY — nothing to validate');
    process.exit(2);
  } else {
    text = fs.readFileSync(0, 'utf8');
  }
  let minSeats = 2;
  try {
    const router = loadRouter();
    if (router.rules && Number.isInteger(router.rules.default_seats)) {
      minSeats = router.rules.default_seats;
    }
  } catch (err) {
    console.warn(`[roundtable-eval] warn: could not load router rules (${err.message}); falling back to default seats (2)`);
  }
  const result = parseCoverage(text, { minSeats });
  if (result.error) {
    console.error(`[roundtable-eval] FAIL: ${result.error}`);
    process.exit(2);
  }
  for (const u of result.unknown) {
    console.warn(`[roundtable-eval] warn: challenge ${u.from} -> ${u.to} references a non-panelist`);
  }
  for (const w of (result.warnings || [])) {
    console.warn(`[roundtable-eval] warn: ${w}`);
  }
  if (result.uncovered.length) {
    console.error(`[roundtable-eval] COVERAGE GAP — unchallenged position(s): ${result.uncovered.join(', ')}`);
    console.error('[roundtable-eval] Phase 3 is blocked. Assign a cross-examination or adversarial stress prompt to each listed panelist, then re-run.');
    process.exit(1);
  }
  const substantive = result.challenges.filter((c) => c.to !== c.from).length;
  console.log(`[roundtable-eval] coverage OK: ${result.panel.length} panelists, ${substantive} challenge(s), every position challenged`);
  process.exit(0);
}

function extractVerdicts(text) {
  // Hyphen included: NO-GO is a canonical verdict token.
  // Fenced code blocks are stripped first so documentation pasted into a
  // transcript cannot fabricate verdicts.
  const prose = text.replace(/```[\s\S]*?```/g, '');
  const raw = [...prose.matchAll(/\[VERDICT:\s*([A-Za-z][A-Za-z-]*)\]/g)].map((m) => m[1].toUpperCase());
  const synthesisMatch = prose.match(/\[SYNTHESIS:\s*([A-Za-z][A-Za-z-]*)(?::([^\]]+))?\]/);
  const verdicts = raw.map((v) => normalizeVerdict(v));
  let synthesis = null;
  if (synthesisMatch) {
    // ADR escalations keep their original id case — uppercasing the whole
    // token destroys the id and splits verdict-stability by id.
    synthesis = synthesisMatch[1].toUpperCase() === 'ADR' && synthesisMatch[2] && synthesisMatch[2].trim()
      ? `ADR:${synthesisMatch[2].trim()}`
      : normalizeVerdict(synthesisMatch[1].toUpperCase());
  }
  return {
    decision: verdicts.filter((v) => DECISION_VERDICTS.includes(v)),
    review: verdicts.filter((v) => ALL_VERDICTS.includes(v) && !DECISION_VERDICTS.includes(v)),
    unknownTags: verdicts.filter((v) => !ALL_VERDICTS.includes(v)),
    legacyTags: raw.filter((v) => LEGACY_DECISION_VERDICTS[v]).length,
    synthesis,
  };
}

function extractConcessions(text) {
  // Same fence-strip as verdicts: pasted documentation must not inflate
  // concession counts or defeat the zero-concession flag.
  const prose = text.replace(/```[\s\S]*?```/g, '');
  return [...prose.matchAll(/\[CONCESSION:\s*([^\]]+)\]/g)].map((m) => m[1].trim()).filter(Boolean);
}

// Substance heuristic (RT-P2-3, ADVISORY — never a gate): edge-count is
// necessary, not sufficient. Challenges shorter than this are flagged as
// thin; terse-but-real debates may trip it, so it informs review, and the
// bound check stays purely structural. Calibrate against real transcripts
// before ever gating on it.
const MIN_CHALLENGE_CHARS = 60;

function thinChallenges(challenges) {
  return (challenges || [])
    .filter((c) => (c.text || '').length < MIN_CHALLENGE_CHARS)
    .map((c) => `${c.from} -> ${c.to} (${(c.text || '').length} chars)`);
}

// Provisional divergence threshold (RT-P1-2): solo-vs-native synthesis
// divergence at or above this is reported as exceeding tolerance.
// PROVISIONAL — owner to confirm (propose-then-confirm); null disables.
const SOLO_DIVERGENCE_THRESHOLD = 0.3;

// Exchange-round markers. Phase 2+3 rounds must open with [ROUND: n];
// more than MAX_ROUNDS distinct rounds fails the bound check (RT-P1-3).
const MAX_ROUNDS = 2;

function extractRounds(text) {
  const prose = text.replace(/```[\s\S]*?```/g, '');
  const rounds = [...prose.matchAll(/\[ROUND:\s*(\d+)\]/g)]
    .map((m) => parseInt(m[1], 10))
    .filter((n) => !Number.isNaN(n));
  return [...new Set(rounds)].sort((a, b) => a - b);
}

// Red-team assignment marker (RT-P1-9/SPC gate): unanimous Round-1 on
// sound-premise topics must name the challenger or the injected prompt.
// Fenced quotes are stripped like verdicts — pasted docs must not fabricate it.
function extractRedTeam(text) {
  const prose = text.replace(/```[\s\S]*?```/g, '');
  const m = prose.match(/\[RED-TEAM:\s*([^\]]+)\]/);
  return m ? m[1].trim() : null;
}

// ROSTER-line observer check (RT-P2-6): transcripts carrying a validated
// ROSTER line get an observer-voice audit — every seat beyond the first 2
// must appear as a CHALLENGER (being challenged is being spoken to, not
// speaking; the observer contract is voice-on-tag-match). Advisory only:
// silence is flagged, never gated (listening is legitimate).
function extractRosterLine(text) {
  const m = text.match(/^ROSTER:\s*(.+)$/m);
  if (!m) return null;
  return m[1]
    .split(',')
    .map((s) => s.trim().replace(/^\+/, '').replace(/\s*:.*$/, '').replace(/^@/, ''))
    .filter(Boolean);
}

function observerCheck(seats, challenges) {
  if (!seats || seats.length <= 2) return [];
  const challengers = new Set();
  for (const c of challenges || []) {
    const from = String(c.from || '').trim().replace(/^@/, '');
    if (from) challengers.add(from.toLowerCase());
  }
  return seats.slice(2).filter((s) => ![...challengers].some((v) => v === s.toLowerCase()));
}

function verifySoloDisclosure(text) {
  // Marker must open the transcript (first non-blank line) and carry a seat
  // count — a buried or count-less marker is the evasion this mandate kills.
  const first = String(text || '').split('\n').map((l) => l.trim()).find((l) => l.length > 0) || '';
  return /^\[MODE:\s*solo\b[^\]]*\d+\s*seats?[^\]]*\]/.test(first);
}

function modal(arr) {
  // Tie-break is insertion order: deterministic but arbitrary. Documented
  // limitation — fine at eval scale, do not use for adjudication.
  const counts = {};
  for (const v of arr) counts[v] = (counts[v] || 0) + 1;
  let best = null;
  for (const [value, count] of Object.entries(counts)) {
    if (!best || count > best.count) best = { value, count };
  }
  return best ? { ...best, share: best.count / arr.length } : null;
}

// Agent-name normalization for reconciliation: case-insensitive, @ ensured.
// Empty names normalize to null and are skipped by callers.
function normAgent(name) {
  const s = String(name || '').trim().toLowerCase();
  if (!s) return null;
  return s.startsWith('@') ? s : '@' + s;
}

function loadTranscripts(dir) {
  // NOTE(RT-P2-1, deliberate): `refused` runs are log-only by design — a
  // refusal produces no debate and therefore no transcript to score. Refused
  // files get an explicit bucket (visible, counted, excluded from compliance
  // math) — never silent-skipped, never conflated with malformed files.
  // See SKILL.md Exit / fallback tiers ("a refused roundtable logs and stops").
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const m = f.match(/^(.+)_(native|solo|refused)_(\d+)\.md$/);
      if (!m) return { file: f, nameError: 'filename must be <topic>_<mode>_<run>.md with mode native|solo|refused' };
      if (m[2] === 'refused') return { file: f, topic: m[1], mode: 'refused', run: Number(m[3]), refused: true };
      return { file: f, topic: m[1], mode: m[2], run: Number(m[3]) };
    });
}

function cmdScore(flags) {
  if (!flags.dir) {
    console.error('[roundtable-eval] --dir is required');
    process.exit(2);
  }
  let stat = null;
  try {
    stat = fs.statSync(flags.dir);
  } catch {
    console.error(`[roundtable-eval] --dir is not accessible: ${flags.dir}`);
    process.exit(2);
  }
  if (!stat.isDirectory()) {
    console.error(`[roundtable-eval] --dir is not a directory: ${flags.dir}`);
    process.exit(2);
  }
  let defaultSeats = 2;
  try {
    const router = loadRouter();
    if (router && router.rules && typeof router.rules.default_seats === 'number') {
      defaultSeats = router.rules.default_seats;
    }
  } catch (err) {
    console.warn(`[roundtable-eval] warn: could not load router rules (${err.message}); falling back to default seats (2)`);
  }
  const entries = loadTranscripts(flags.dir).map((e) => {
    if (e.refused) return { ...e, verdicts: null, concessions: [], rounds: [], redTeam: null, rosterSeats: null, soloDisclosure: null, coverage: { skipped: 'refused-log-only' }, compliant: null };
    if (e.nameError) return { ...e, topic: null, mode: null, run: null, verdicts: null, concessions: [], rounds: [], soloDisclosure: null, coverage: { error: e.nameError, warnings: [] }, compliant: false };
    const text = fs.readFileSync(path.join(flags.dir, e.file), 'utf8');
    const verdicts = extractVerdicts(text);
    const cov = parseCoverage(text, { minSeats: defaultSeats });
    const compliant = !cov.error && !cov.malformed && Array.isArray(cov.uncovered) && cov.uncovered.length === 0;
    const coverageDetail = cov.error
      ? cov.error
      : (cov.uncovered && cov.uncovered.length ? `gap: ${cov.uncovered.join(', ')}` : null);
    return {
      ...e,
      verdicts,
      concessions: extractConcessions(text),
      rounds: extractRounds(text),
      redTeam: extractRedTeam(text),
      rosterSeats: extractRosterLine(text),
      soloDisclosure: e.mode === 'solo' ? verifySoloDisclosure(text) : null,
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
    const r = e.verdicts ? e.verdicts.review : [];
    // Disagreement/SPC run on decision verdicts; Review-gate transcripts fall
    // back to review verdicts so the Review path is measured, not skipped.
    // Dominant signal wins: a lone stray verdict never vetoes measurement.
    const signal = d.length >= 2 ? d : (r.length >= 2 ? r : (d.length >= r.length ? d : r));
    const modalV = signal.length >= 2 ? modal(signal) : null;
    return {
      topic: e.topic,
      mode: e.mode,
      run: e.run,
      file: e.file,
      nameError: e.nameError || null,
      refused: e.refused === true,
      decisionVerdicts: d,
      reviewVerdicts: r,
      synthesis: e.verdicts ? e.verdicts.synthesis : null,
      concessions: e.concessions || [],
      rounds: e.rounds || [],
      maxRound: (e.rounds || []).length ? Math.max(...e.rounds) : 0,
      redTeam: e.redTeam || null,
      rosterSeats: e.rosterSeats || null,
      soloDisclosure: e.soloDisclosure,
      badVerdictTags: e.verdicts ? e.verdicts.unknownTags : [],
      disagreementRate: modalV ? Number((1 - modalV.share).toFixed(2)) : null,
      spcFlag: modalV ? modalV.share === 1 : null,
      coverageCompliant: e.compliant,
      coverageDetail: e.coverageDetail,
    };
  });

  const topics = {};
  for (const r of rows) {
    // Misnamed files stay in `detail` only — they join no topic bucket and
    // must never crash stability/divergence aggregation (RT-P0-1).
    if (!r.topic || (r.mode !== 'native' && r.mode !== 'solo')) continue;
    (topics[r.topic] = topics[r.topic] || { native: [], solo: [] })[r.mode].push(r);
  }

  const stability = {};
  const escalations = [];
  for (const [topic, modes] of Object.entries(topics)) {
    // ADR escalations are tracked separately — counting them as instability
    // penalizes escalation by construction (RT-P0-3).
    const synths = modes.native.map((r) => r.synthesis).filter((s) => s && !s.startsWith('ADR:'));
    for (const r of modes.native.concat(modes.solo)) {
      if (r.synthesis && r.synthesis.startsWith('ADR:')) escalations.push({ file: r.file, synthesis: r.synthesis });
    }
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

  // Log-vs-panel reconciliation (RT-P1-6): `log --agents` is aspirational
  // (recorded at activation, before the roster is final). When --log is
  // passed, flag logged agents that never speak in any transcript panel and
  // panelists that never appear in any log entry. Name matching normalizes
  // case and ensures the @-prefix. LIMITATION: the join is global across the
  // whole dir (topics are free text, no session key yet — see RT-P1-10 log
  // schema v2); multi-topic dirs can cross-contaminate. Treat output as a
  // review lead, not a verdict.
  let logReconciliation = null;
  if (flags.log) {
    const logged = new Set();
    try {
      const lines = fs.readFileSync(flags.log, 'utf8').split('\n').filter((l) => l.trim());
      for (const line of lines) {
        const entry = JSON.parse(line);
        for (const a of entry.agents || []) {
          const n = normAgent(a);
          if (n) logged.add(n);
        }
      }
    } catch (err) {
      console.error(`[roundtable-eval] cannot read log file for reconciliation: ${flags.log}`);
      process.exit(2);
    }
    const speakers = new Set();
    for (const e of entries) {
      if (e.coverage && e.coverage.panel) {
        for (const p of e.coverage.panel) {
          const n = normAgent(p);
          if (n) speakers.add(n);
        }
      }
    }
    logReconciliation = {
      loggedNeverSpoke: [...logged].filter((a) => !speakers.has(a)).sort(),
      spokeNeverLogged: [...speakers].filter((a) => !logged.has(a)).sort(),
    };
  }

  let premiseRows = null;
  let soundIds = new Set();
  if (fs.existsSync(flags.topics || DEFAULT_TOPICS)) {
    const defs = JSON.parse(fs.readFileSync(flags.topics || DEFAULT_TOPICS, 'utf8'));
    const byId = Object.fromEntries(defs.map((t) => [t.id, t]));
    soundIds = new Set(defs.filter((t) => t.premise_quality === 'sound').map((t) => t.id));
    premiseRows = Object.keys(topics).filter((t) => byId[t] && byId[t].premise_quality === 'flawed').map((t) => ({
      topic: t,
      premise_quality: 'flawed',
      hint: byId[t].expected_verdict_hint || null,
      observedSyntheses: [...new Set(topics[t].native.concat(topics[t].solo).map((r) => r.synthesis).filter(Boolean))],
    }));
  }

  const flawedIds = new Set((premiseRows || []).map((p) => p.topic));
  // Exit gates (RT-P1-9): the suite score is a gate, not a dashboard.
  // ADR escalations never count as contradictions — penalizing escalation
  // would discourage it.
  const gateFailures = [];
  // Solo runs are context-firewalled sequential dispatches: no cross-challenges
  // can occur by construction, so a coverage block in a solo transcript is
  // uncheckable either way (present = unverifiable, absent = expected). Solo
  // is therefore EXCLUDED from challenge-compliance — same as refused runs —
  // and tracked instead via solo disclosure + solo-vs-native divergence.
  const soloExcluded = rows.filter((r) => !r.refused && r.mode === "solo").map((r) => r.file);
  const scoredRows = rows.filter((r) => !r.refused && r.mode !== "solo");
  // No gateable rows (solo-only or refused-only dir): compliance is UNKNOWN
  // (null), never a vacuous 1.0 — same fail-closed convention as unmeasured
  // eval dimensions. The gate passes vacuously; the report must not claim a
  // measured 1.0.
  const compliance = scoredRows.length
    ? Number((scoredRows.filter((r) => r.coverageCompliant).length / scoredRows.length).toFixed(2))
    : null;
  if (compliance !== null && compliance < 1.0) {
    gateFailures.push(`coverage compliance ${compliance} < 1.0`);
  }
  for (const p of premiseRows || []) {
    if (!p.hint) continue;
    const observed = p.observedSyntheses || [];
    // Per-run granularity: ADR escalations are excluded individually — one
    // escalation must not shield contradicting runs, and penalizing
    // escalation itself would discourage it.
    const judged = observed.filter((s) => !s.startsWith('ADR:'));
    if (judged.length && !judged.includes(p.hint)) {
      gateFailures.push(`flawed premise '${p.topic}' hint ${p.hint} contradicted by [${judged.join(', ')}]`);
    }
  }
  // SPC red-team gate: unanimous decision verdicts on sound-premise topics
  // must name the challenger. Flawed-premise unanimity is exempt (expected).
  for (const r of rows) {
    if (r.spcFlag && r.topic && soundIds.has(r.topic) && !r.redTeam) {
      gateFailures.push(`unanimous sound topic '${r.topic}' without red-team challenger (${r.file})`);
    }
  }
  const zeroConcessionCompliant = rows
    .filter((r) => r.coverageCompliant && (r.concessions || []).length === 0)
    .map((r) => r.file);
  const soloDisclosureFailures = rows
    .filter((r) => r.mode === 'solo' && r.soloDisclosure === false)
    .map((r) => r.file);
  const roundBoundViolations = rows
    .filter((r) => r.maxRound > MAX_ROUNDS)
    .map((r) => `${r.file} (round ${r.maxRound})`);
  const observerSilentFlags = [];
  for (const e of entries) {
    if (e.rosterSeats && e.coverage && e.coverage.challenges) {
      for (const s of observerCheck(e.rosterSeats, e.coverage.challenges)) {
        observerSilentFlags.push(`${e.file}: @${s} seated beyond 2 but never challenges`);
      }
    }
  }
  const thinChallengeFlags = [];
  for (const e of entries) {
    if (e.coverage && e.coverage.challenges) {
      for (const t of thinChallenges(e.coverage.challenges)) {
        thinChallengeFlags.push(`${e.file}: ${t}`);
      }
    }
  }
  const meanSoloDivergence = divergences.length
    ? Number((divergences.reduce((a, b) => a + b.divergence, 0) / divergences.length).toFixed(2))
    : null;
  const report = {
    transcripts: rows.length,
    refusedRuns: rows.filter((r) => r.refused).map((r) => r.file),
    soloExcludedFromCompliance: soloExcluded,
    coverageComplianceRate: compliance,
    gate: { pass: gateFailures.length === 0, failures: gateFailures },
    spcFlags: rows.filter((r) => r.spcFlag).map((r) => `${r.file}${flawedIds.has(r.topic) ? ' (flawed premise — unanimity expected)' : ''}`),
    totalConcessions: rows.reduce((n, r) => n + (r.concessions || []).length, 0),
    zeroConcessionCompliant,
    soloDisclosureFailures,
    roundBoundViolations,
    maxRounds: MAX_ROUNDS,
    observerSilentFlags,
    thinChallenges: thinChallengeFlags,
    minChallengeChars: MIN_CHALLENGE_CHARS,
    soloDivergenceThreshold: SOLO_DIVERGENCE_THRESHOLD,
    soloDivergenceExceeded:
      meanSoloDivergence === null || SOLO_DIVERGENCE_THRESHOLD === null
        ? null
        : meanSoloDivergence >= SOLO_DIVERGENCE_THRESHOLD,
    logReconciliation,
    badVerdictTagCount: rows.reduce((n, r) => n + (r.badVerdictTags || []).length, 0),
    escalations,
    meanRound1Disagreement: (() => {
      const rates = rows.map((r) => r.disagreementRate).filter((v) => v !== null);
      return rates.length ? Number((rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(2)) : null;
    })(),
    verdictStability: stability,
    soloVsNativeDivergence: meanSoloDivergence,
    soloDivergenceByTopic: divergences,
    flawedPremiseCheck: premiseRows,
    detail: rows,
  };

  if (flags.json) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.gate.pass ? 0 : 1);
    return;
  }
  console.log(`transcripts: ${report.transcripts}  coverage compliance: ${report.coverageComplianceRate === null ? "n/a (no native runs)" : report.coverageComplianceRate}  mean round-1 disagreement: ${report.meanRound1Disagreement}`);
  console.log(`solo-vs-native divergence: ${report.soloVsNativeDivergence}`);
  console.log(`concessions: ${report.totalConcessions} total; ${report.zeroConcessionCompliant.length} coverage-compliant transcript(s) with zero concessions`);
  if (report.soloDisclosureFailures.length) {
    console.log(`solo disclosure FAILED (missing [MODE: solo] marker): ${report.soloDisclosureFailures.join(', ')}`);
  }
  if (report.roundBoundViolations.length) {
    console.log(`round bound EXCEEDED (max ${report.maxRounds}): ${report.roundBoundViolations.join(', ')}`);
  }
  if (report.observerSilentFlags.length) {
    console.log(`observer silence (advisory — listening is legitimate, verify intent):`);
    for (const t of report.observerSilentFlags) console.log(`  - ${t}`);
  }
  if (report.thinChallenges.length) {
    console.log(`thin challenges (advisory, under ${report.minChallengeChars} chars — edge-count is necessary, not sufficient):`);
    for (const t of report.thinChallenges) console.log(`  - ${t}`);
  }
  if (report.refusedRuns.length) {
    console.log(`refused runs (log-only, excluded from compliance): ${report.refusedRuns.join(', ')}`);
  }
  if (report.soloExcludedFromCompliance.length) {
    console.log(`solo runs (firewalled, excluded from challenge-compliance): ${report.soloExcludedFromCompliance.join(', ')}`);
  }
  if (report.logReconciliation) {
    const { loggedNeverSpoke, spokeNeverLogged } = report.logReconciliation;
    if (loggedNeverSpoke.length) console.log(`log-vs-panel: logged but never spoke: ${loggedNeverSpoke.join(', ')}`);
    if (spokeNeverLogged.length) console.log(`log-vs-panel: spoke but never logged: ${spokeNeverLogged.join(', ')}`);
    if (!loggedNeverSpoke.length && !spokeNeverLogged.length) console.log('log-vs-panel: reconciled clean');
  }
  console.log(
    `solo divergence threshold: ${report.soloDivergenceThreshold === null ? 'unconfigured' : report.soloDivergenceThreshold}` +
    (report.soloVsNativeDivergence !== null && report.soloDivergenceThreshold !== null
      ? (report.soloVsNativeDivergence >= report.soloDivergenceThreshold ? ' — EXCEEDED' : ' — within tolerance')
      : '')
  );
  if (report.badVerdictTagCount) console.log(`bad verdict tags: ${report.badVerdictTagCount} (pass --json for detail)`);
  if (report.escalations.length) {
    console.log('ADR escalations (excluded from stability):');
    for (const e of report.escalations) console.log(`  - ${e.file}: ${e.synthesis}`);
  }
  console.log('verdict stability (native):');
  for (const [topic, s] of Object.entries(report.verdictStability)) {
    console.log(`  ${topic}: ${s ? `${s.nativeModalSynthesis} (${Math.round(s.share * 100)}% of ${s.runs} runs)` : 'no synthesis markers found'}`);
  }
  if (report.spcFlags.length) {
    console.log('SPC advisory (round-1 unanimity):');
    for (const f of report.spcFlags) console.log(`  - ${f}`);
  }
  if (report.flawedPremiseCheck && report.flawedPremiseCheck.length) {
    console.log('flawed-premise check (should trend NO-GO/RESHAPE on decision topics, FALSIFIED/PARTIAL on review topics):');
    for (const p of report.flawedPremiseCheck) console.log(`  - ${p.topic}: observed ${p.observedSyntheses.join(', ') || 'none'}`);
  }
  const nonCompliant = rows.filter((r) => !r.coverageCompliant);
  if (nonCompliant.length) {
    console.log('coverage non-compliant transcripts:');
    for (const r of nonCompliant) console.log(`  - ${r.file}: ${r.coverageDetail || 'unknown'}`);
  }
  if (report.gate.failures.length) {
    console.log('GATE FAILED:');
    for (const f of report.gate.failures) console.log(`  - ${f}`);
    process.exit(1);
  }
}

function readPanelState() {
  try {
    return JSON.parse(fs.readFileSync(PANEL_STATE, 'utf8'));
  } catch {
    return null;
  }
}

function writePanelState(state) {
  fs.mkdirSync(path.dirname(PANEL_STATE), { recursive: true });
  fs.writeFileSync(PANEL_STATE, JSON.stringify(state, null, 2));
}

function cmdSession(flags) {
  const sub = flags._args && flags._args[0];
  const PHASES = ['position', 'cross-exam', 'defense', 'synthesis'];
  if (sub === 'begin') {
    if (!flags.topic) {
      console.error('[roundtable-eval] session begin requires --topic "..."');
      process.exit(2);
    }
    // Single-panel default: an open session must be closed (or --force)
    // before a new one begins — otherwise the second panel silently destroys
    // the first panel's resume cursor (last-writer-wins on a fixed path).
    if (readPanelState() && !flags.force) {
      console.error('[roundtable-eval] a panel session is already open (use session close or --force to replace it)');
      process.exit(2);
    }
    const state = {
      topic: flags.topic,
      members: flags.agents ? flags.agents.split(',').map((s) => s.trim()).filter(Boolean) : [],
      mode: flags.mode || 'native',
      turn: 1,
      phase: 'position',
      lastSynthesis: null,
      updated: new Date().toISOString(),
    };
    writePanelState(state);
    console.log(`[roundtable-eval] panel session opened: ${state.members.length} member(s), turn 1`);
  } else if (sub === 'update') {
    const state = readPanelState();
    if (!state) {
      console.error('[roundtable-eval] no open panel session to update');
      process.exit(2);
    }
    if (flags.turn !== undefined) {
      const n = Number(flags.turn);
      if (!Number.isInteger(n) || n < 1) {
        console.error(`[roundtable-eval] --turn must be a positive integer, got: ${flags.turn}`);
        process.exit(2);
      }
      state.turn = n;
    }
    if (flags.phase) {
      if (!PHASES.includes(flags.phase)) {
        console.error(`[roundtable-eval] --phase must be one of: ${PHASES.join(', ')}`);
        process.exit(2);
      }
      state.phase = flags.phase;
    }
    if (flags.synthesis !== undefined) state.lastSynthesis = flags.synthesis;
    state.updated = new Date().toISOString();
    writePanelState(state);
    console.log(`[roundtable-eval] panel session updated: turn ${state.turn}, phase ${state.phase}`);
  } else if (sub === 'status') {
    const state = readPanelState();
    if (!state) {
      console.error('[roundtable-eval] no open panel session');
      process.exit(2);
    }
    console.log(JSON.stringify(state, null, 2));
  } else if (sub === 'close') {
    if (fs.existsSync(PANEL_STATE)) fs.unlinkSync(PANEL_STATE);
    console.log('[roundtable-eval] panel session closed');
  } else {
    console.error('[roundtable-eval] session requires one of: begin | update | status | close');
    process.exit(2);
  }
}

// Override/skip-marker audit (RT-P2-6): counts routing and gate markers
// across session-output markdown files and fires the revisit rule (>20% of
// sessions carrying an override, minimum 10 sessions). Markers counted:
// [ROUTING-OVERRIDE:], [ROUTER-DEVIATION:], [SPC: skipped], SPC rosy-absent
// is a completed gate (not counted), [CO-DISPATCH-ABSENT:], [ELICITATION-SKIPPED:].
function collectMarkdown(dir, acc) {
  acc = acc || [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectMarkdown(full, acc);
    else if (entry.isFile() && entry.name.endsWith('.md')) acc.push(full);
  }
  return acc;
}

function cmdOverrides(flags) {
  if (!flags.dir) {
    console.error('[roundtable-eval] overrides requires --dir <session-outputs-dir>');
    process.exit(2);
  }
  let stat = null;
  try {
    stat = fs.statSync(flags.dir);
  } catch {
    console.error(`[roundtable-eval] --dir is not accessible: ${flags.dir}`);
    process.exit(2);
  }
  if (!stat.isDirectory()) {
    console.error(`[roundtable-eval] --dir is not a directory: ${flags.dir}`);
    process.exit(2);
  }
  let maxOverrideRate = 0.20;
  let minSessions = 10;
  try {
    const router = loadRouter();
    const sla = router && router.rules && router.rules.revisit_sla;
    if (sla) {
      if (typeof sla.max_override_rate === 'number' && sla.max_override_rate > 0 && sla.max_override_rate <= 0.50) {
        maxOverrideRate = sla.max_override_rate;
      }
      if (typeof sla.min_sessions === 'number' && sla.min_sessions >= 5) {
        minSessions = sla.min_sessions;
      }
    }
  } catch (err) {
    console.warn(`[roundtable-eval] warn: could not load router policy (${err.message}); falling back to default revisit SLA`);
  }

  const overridePatterns = {
    routing_override: /\[ROUTING-OVERRIDE:/g,
    router_deviation: /\[ROUTER-DEVIATION:/g,
    spc_skipped: /\[SPC:\s*skipped\b/g,
    codispatch_absent: /\[CO-DISPATCH-ABSENT:/g,
    elicitation_skipped: /\[ELICITATION-SKIPPED:/g,
  };
  const telemetryPatterns = {
    router_autoseat: /\[ROUTER-AUTOSEAT:/g,
  };
  const files = collectMarkdown(flags.dir);
  const hits = [];
  let autoseatHits = 0;
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const found = Object.entries(overridePatterns)
      .filter(([, re]) => { re.lastIndex = 0; return re.test(text); })
      .map(([name]) => name);
    if (found.length) hits.push({ file: path.relative(flags.dir, file), markers: found });

    const autoseatMatches = text.match(telemetryPatterns.router_autoseat);
    if (autoseatMatches) autoseatHits += autoseatMatches.length;
  }
  const rate = files.length ? hits.length / files.length : 0;
  const revisit = files.length >= minSessions && rate > maxOverrideRate;
  const report = {
    sessions_scanned: files.length,
    sessions_with_overrides: hits.length,
    override_rate: Number(rate.toFixed(2)),
    revisit_threshold: maxOverrideRate,
    revisit_min_sessions: minSessions,
    revisit: revisit,
    autoseat_markers_detected: autoseatHits,
    hits,
  };
  if (flags.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`override audit: ${hits.length}/${files.length} sessions carry override/skip markers (rate ${report.override_rate})`);
    if (autoseatHits > 0) {
      console.log(`telemetry: ${autoseatHits} router autoseat marker(s) detected`);
    }
    for (const h of hits) console.log(`  - ${h.file}: ${h.markers.join(', ')}`);
    console.log(revisit ? 'REVISIT TRIGGERED: override rate above threshold — recalibrate or kill the default' : 'revisit: not triggered');
  }
  process.exit(0);
}

function cmdLog(flags) {
  if (!flags.mode || !MODES.includes(flags.mode)) {
    console.error(`[roundtable-eval] --mode required, one of: ${MODES.join(', ')}`);
    process.exit(2);
  }
  // Input caps: free-text fields are bounded so callers cannot bloat the
  // JSONL/telemetry consumers without limit. Truncate with warn at the soft
  // cap; refuse gross excess outright.
  const NOTE_CAP = 4096;
  const NOTE_HARD = 65536;
  const SYNTHESIS_CAP = 256;
  const SYNTHESIS_HARD = 4096;
  const capField = (name, value, cap, hard) => {
    if (value === undefined || value === null) return value;
    const s = String(value);
    if (s.length > hard) {
      console.error(`[roundtable-eval] --${name} exceeds ${hard} chars (${s.length})`);
      process.exit(2);
    }
    if (s.length > cap) console.warn(`[roundtable-eval] warn: --${name} truncated to ${cap} chars`);
    return s.slice(0, cap);
  };
  const note = capField('note', flags.note ?? null, NOTE_CAP, NOTE_HARD);
  const synthesisFlag = capField('synthesis', flags.synthesis ?? null, SYNTHESIS_CAP, SYNTHESIS_HARD);
  const agents = flags.agents ? flags.agents.split(',').map((s) => s.trim()).filter(Boolean) : [];
  if ((flags.mode === 'native' || flags.mode === 'solo') && agents.length === 0) {
    console.error('[roundtable-eval] native/solo logs require a non-empty --agents list (a panel log without members is meaningless)');
    process.exit(2);
  }
  const entry = {
    ts: new Date().toISOString(),
    tool: flags.tool || 'round-table',
    mode: flags.mode,
    topic: flags.topic || null,
    agents,
    note,
    topic_id: flags['topic-id'] || null,
    synthesis: synthesisFlag,
    coverage_exit: flags['coverage-exit'] !== undefined ? flags['coverage-exit'] : null,
    model: flags.model || null,
    run_file: flags['run-file'] || null,
    duration_s: flags['duration-s'] !== undefined ? flags['duration-s'] : null,
  };
  // Topic-id must join to the gold set — free-text topics stay in `topic`,
  // but a `topic_id` that matches nothing is a broken join: reject it.
  if (entry.topic_id) {
    let known = [];
    try {
      known = JSON.parse(fs.readFileSync(DEFAULT_TOPICS, 'utf8')).map((t) => t.id);
    } catch {
      console.error('[roundtable-eval] cannot read topics.json to validate --topic-id');
      process.exit(2);
    }
    if (!known.includes(entry.topic_id)) {
      console.error(`[roundtable-eval] unknown --topic-id '${entry.topic_id}' (not in topics.json)`);
      process.exit(2);
    }
  }
  const runFilePresent = entry.run_file ? fs.existsSync(entry.run_file) : null;
  entry.run_file_present = runFilePresent;
  if (entry.run_file && !runFilePresent) {
    console.warn(`[roundtable-eval] warn: --run-file does not exist yet: ${entry.run_file} (expected at activation, before the transcript is written)`);
  }
  fs.mkdirSync(path.dirname(STATE_LOG), { recursive: true });
  fs.appendFileSync(STATE_LOG, JSON.stringify(entry) + '\n');
  console.log(`[roundtable-eval] logged mode=${entry.mode} -> ${path.relative(PROJECT_ROOT, STATE_LOG)}`);
}

if (require.main === module) {
  const { cmd, flags } = parseArgs(process.argv.slice(2));
  if (cmd === 'coverage') cmdCoverage(flags);
  else if (cmd === 'score') cmdScore(flags);
  else if (cmd === 'log') cmdLog(flags);
  else if (cmd === 'session') cmdSession(flags);
  else if (cmd === 'overrides') cmdOverrides(flags);
  else usage();
}

module.exports = {
  readCoverageBlock,
  parseCoverage,
  extractVerdicts,
  extractConcessions,
  extractRounds,
  extractRedTeam,
  MAX_ROUNDS,
  extractRosterLine,
  observerCheck,
  thinChallenges,
  MIN_CHALLENGE_CHARS,
  verifySoloDisclosure,
  SOLO_DIVERGENCE_THRESHOLD,
  modal,
  loadTranscripts,
  normalizeVerdict,
  DECISION_VERDICTS,
  ALL_VERDICTS,
};
