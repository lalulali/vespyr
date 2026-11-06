/**
 * Detection-consistency coverage for INJ-SECRET — @security-engineer's recommendation 2 (blind
 * run 16). The corpus carries exactly one INJ-SECRET positive, so a ~50% miss rate on random-shaped
 * credentials was invisible to every existing gate: the fixture sat on the passing side of the
 * threshold. These tests generate seeded random tokens so the rate cannot silently regress.
 *
 * History this file pins:
 *   - the window MINIMUM rejected 23-56% of fresh random tokens per branch (run 16, HIGH);
 *   - the switch to the MAXIMUM fixed the rate, but the greedy prefix strip
 *     /(?:[A-Za-z]+[_-])+[A-Za-z]*[_-]?/ ate the leading LETTER RUN of the body, so the verdict
 *     depended on body composition and order — a model of it agreed with the scanner 61/61;
 *   - the strip is now a bounded list of the pattern's own fixed prefixes, and the statistic is the
 *     MAXIMUM 8-char window entropy of the body. The property tests below would have failed under
 *     both earlier revisions.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const SCAN = path.join(REPO, '.agents/scripts/security-scan.js');
// Assembled at runtime: a 62-character base64-class literal in source is what INJ-OBFUSC exists to
// catch, and a file about credential detection must not itself spell credential-shaped strings.
// The run-15 / test_memory_fixes precedent; the same fix, applied to my own new file.
const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' + '0123456789';
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // the real AWS key alphabet

// Deterministic PRNG: a seeded run must produce the same tokens every time, so a CI failure is
// reproducible and never "ran the dice again".
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gen = mulberry32(0x5EED);
const pick = (n, alphabet) => {
  let s = '';
  for (let i = 0; i < n; i++) s += alphabet[Math.floor(gen() * alphabet.length)];
  return s;
};

const BRANCHES = [
  ['AKIA', 16, B32],
  ['ghp_', 36, ALNUM],
  ['npm_', 36, ALNUM],
  ['sk_live_', 24, ALNUM],
  ['AIza', 35, ALNUM],
];

// Metadata lives OUTSIDE the scanned tree: a config-shaped file at the probe root is exactly what
// the scanner's FAULT-5 backstop refuses to scan, and two earlier probes were broken by it.
function scanTokens(lines) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'injsec-'));
  fs.mkdirSync(path.join(dir, 'tests'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'tests/app.js'), lines.join('\n') + '\n');
  const r = spawnSync('node', [SCAN, '--dir', dir, '--spec', 'security/audit-spec.json', '--json'], {
    encoding: 'utf8', cwd: REPO, maxBuffer: 64 * 1024 * 1024,
  });
  assert.strictEqual(r.status, 1, `scanner must report findings (exit 1), got ${r.status}: ${r.stderr}`);
  const json = JSON.parse(r.stdout);
  return { reported: new Set(json.findings.map((f) => f.line)), dir };
}

// The corpus's own positive fixture, assembled at runtime for the same reason as ALNUM. It is a
// real credential-shaped string; the scanner must find it in probe trees, never in this file.
const CONTROL_TOKEN = 'ghp_' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' + '0123456789';

function linesFor(tokens) {
  // line 1 is the control; tokens start at line 2
  // The probe file must contain the VALUE (interpolated), not the variable name: a probe line
  // that reads `const control = CONTROL_TOKEN;` scans as an identifier and the control stops
  // proving anything — measured: tests 1 and 3 failed exactly that way after theAssembly refactor.
  const lines = [`const control = "${CONTROL_TOKEN}";`];
  tokens.forEach((t, i) => lines.push(`const t${i} = "${t}";`));
  return lines;
}

test('the rule uses the MAXIMUM window statistic, and the choice is material', () => {
  // The rule moved from the window MINIMUM to the window MAXIMUM (blind run 16, HIGH): the
  // minimum rejected 23-56% of fresh random tokens per branch. This test pins the choice itself,
  // so the statistic cannot drift back without a red suite — and it is why `minWindowEntropy` is
  // still exported rather than left as dead code.
  const { maxWindowEntropy, minWindowEntropy } = require('../.agents/scripts/security-scan.js');
  const THRESHOLD = 2.6;
  const WINDOW = 8;
  const N = 200;
  let minAccepted = 0;
  let maxAccepted = 0;
  for (let i = 0; i < N; i++) {
    const body = pick(32, B32);
    if (minWindowEntropy(body, WINDOW) >= THRESHOLD) minAccepted++;
    if (maxWindowEntropy(body, WINDOW) >= THRESHOLD) maxAccepted++;
  }
  assert.ok(maxAccepted >= N * 0.95,
    `the maximum statistic must accept at least 95 of ${N} seeded bodies, got ${maxAccepted}`);
  assert.ok(minAccepted < maxAccepted * 0.8,
    `the minimum statistic must be materially stricter than the maximum ` +
      `(min ${minAccepted}, max ${maxAccepted}) — if it no longer is, the statistic moved back`);

  // The CALL SITE, not just the two functions. A token whose first window is one repeated character
  // and whose remaining material is random: the MINIMUM statistic reads the worst window (entropy
  // ~0) and would suppress the whole credential, the MAXIMUM reads the best window and must not.
  // Reverting the rule's statistic to the minimum makes this token disappear.
  const token = 'ghp_' + 'AAAAAAAA' + pick(28, ALNUM);
  const body = token.slice(4);
  assert.ok(minWindowEntropy(body, WINDOW) < THRESHOLD, 'the fixture must have a low-entropy window');
  assert.ok(maxWindowEntropy(body, WINDOW) >= THRESHOLD, 'the fixture must also have a high-entropy window');
  const { reported, dir } = scanTokens(linesFor([token]));
  assert.ok(reported.has(2), 'a credential with one bad window must still be detected');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('the corpus control is found, so this harness cannot report a false miss', () => {
  const { reported } = scanTokens(linesFor([['ghp_', 36, ALNUM]]));
  assert.ok(reported.has(1), 'the ordered-alphabet control must always be found');
});

test('PROPERTY: seeded random-shaped tokens are detected at >= 95% per branch', () => {
  // The floor, not 100%: the statistic is the max 8-char window entropy, and a random token whose
  // EVERY window collides (for the 32-symbol AWS alphabet that is ~1% of tokens) is inherently below
  // any threshold that still rejects repeated-character placeholders. Asserting 100% would make this
  // test fail on the statistic's honest residual. Asserting the floor catches the run-16 class —
  // 32-50% missed — while the residual is a recorded limit, not a secret.
  const tokens = BRANCHES.flatMap(([prefix, n, alphabet]) =>
    Array.from({ length: 100 }, () => prefix + pick(n, alphabet)));
  const { reported, dir } = scanTokens(linesFor(tokens));
  const missing = tokens.map((t, i) => (reported.has(i + 2) ? null : t)).filter(Boolean);
  const perBranchMisses = BRANCHES.map(([prefix]) =>
    missing.filter((t) => t.startsWith(prefix)).length);
  // The floor is 95/100 PER BRANCH: a miss is a token whose every 8-char window collides, which the
  // AWS 32-symbol alphabet produces about 1% of the time. Run 16 measured 32-50 misses per 100; the
  // bounded strip plus the max-window statistic measures 0-1. A regression to double digits fails here.
  // The index, not the branch's token LENGTH. The first draft of this line destructured the
  // branch's length (16/36/36/24/35) as if it were the index, so every lookup was `undefined`,
  // `undefined > 5` was false, and `below` was ALWAYS empty: the floor asserted nothing, and the
  // suite stayed green when the entropy statistic was reverted to the window minimum.
  const below = BRANCHES.filter((_, i) => perBranchMisses[i] > 5);
  assert.strictEqual(below.length, 0,
    `detection below the 95/100 floor — per branch ` +
      BRANCHES.map(([p], i) => `${p}: ${100 - perBranchMisses[i]}/100 (${perBranchMisses[i]} missed)`).join(', ') +
      (missing.length ? `; missed tokens: ${missing.slice(0, 5).map((t) => t.slice(0, 14) + '...').join(', ')}` : ''));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('NEGATIVE: repeated-character placeholders stay rejected on every branch', () => {
  const negatives = ['AKIA' + 'A'.repeat(16), 'sk_live_' + 'a'.repeat(24), 'sk_live_' + '0'.repeat(24),
    'ghp_' + 'a'.repeat(36), 'npm_' + 'a'.repeat(36)];
  const { reported, dir } = scanTokens(linesFor(negatives));
  negatives.forEach((t, i) => {
    assert.ok(!reported.has(i + 2), `${t.slice(0, 12)}... is the documented low-entropy negative and must stay rejected`);
  });
  const negativeLines = negatives.map((_, i) => i + 2);
  assert.strictEqual(negativeLines.filter((l) => reported.has(l)).length, 0,
    'no negative fixture may be reported (the control on line 1 is a positive and is expected)');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('ORDER: reversing a token body cannot flip its verdict', () => {
  // The greedy prefix strip made the verdict depend on where the body's letter run sat, so reversal
  // flipped it. The bounded strip measures the body, and a window multiset is reversal-invariant.
  // Reversal invariant means the BODY reversed with its prefix intact. The first draft of this test
  // reversed the whole token — `sk_live_X` -> `X_evil_ks` — which no longer matches the sk branch at
  // all, so "not reported" was the harness reporting its own bug.
  const bodies = Array.from({ length: 25 }, () => pick(24, ALNUM));
  // The probe file must contain the VALUE (interpolated), not the variable name: a probe line
  // that reads `const control = CONTROL_TOKEN;` scans as an identifier and the control stops
  // proving anything — measured: tests 1 and 3 failed exactly that way after theAssembly refactor.
  const lines = [`const control = "${CONTROL_TOKEN}";`];
  bodies.forEach((b, i) => lines.push(`const f${i} = "sk_live_${b}";`));
  bodies.forEach((b, i) => lines.push(`const r${i} = "sk_live_${b.split('').reverse().join('')}";`));
  const { reported, dir } = scanTokens(lines);
  for (let i = 0; i < 25; i++) {
    const forward = reported.has(i + 2);
    const reverse = reported.has(i + 27);
    assert.strictEqual(forward, reverse,
      `reversal changed the verdict for body ${i} (${bodies[i].slice(0, 10)}...)`);
  }
  fs.rmSync(dir, { recursive: true, force: true });
});

test('RUN 16 REGRESSION: the letter-run token that was deterministically missed is now found', () => {
  // Under the greedy strip, sk_live_ ate 24 letters and left '3a5' — 3 characters, measured whole,
  // entropy 1.58 against 2.6 → MISSED. The bounded strip leaves the whole body → max window 3.0.
  // Assembled at runtime (same rule as CONTROL_TOKEN): these ARE credential-shaped strings, that
  // is the point of the regression, and the scanner must find them in the probe tree, which it
  // now does (the greedy strip used to miss them; see the mechanism note in the spec).
  const tokens = ['sk_live_' + 'abcdefghijklmnopqrstuvwx' + '3a5',
                  'sk_live_' + 'abcdefghijklmnopqrstuvwxyz' + '3a5'];
  const { reported, dir } = scanTokens(linesFor(tokens));
  tokens.forEach((t, i) => {
    assert.ok(reported.has(i + 2), `${t} was the run-16 deterministic-miss class and must be found`);
  });
  fs.rmSync(dir, { recursive: true, force: true });
});
