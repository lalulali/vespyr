#!/usr/bin/env node
/**
 * qa_check.js — Gate 1 (dev-advance): single fail-closed QA validator.
 *
 * Called by `orchestrator_state.js next` before it advances out of `execution`,
 * and runnable directly as a CLI. A file-existence check is NOT this gate: the
 * sign-off's recommendation is parsed (not regex'd out of prose), cross-checked
 * against qa-report.md, bound to that report with a content+mtime signature,
 * date-checked, and required to carry a real harness mode.
 *
 * Shared parsers for bracketed verdicts, conditions, cited evidence and report
 * freshness come from develop_completion_check.js — one regex set, one gate.
 *
 * Usage:
 *   node .agents/scripts/qa_check.js [--root DIR] [--signoff P] [--report P] [--json]
 * Exit 0 = pass, 1 = fail.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  verdictOf,
  checkSignoff,
  checkFreshness,
  DEFAULTS,
  VERDICTS,
} = require('./develop_completion_check.js');

const REPORT_REL = 'artifacts/output/05-execution/quality/qa-report.md';
const SIGNOFF_REL = DEFAULTS.signoff;
const MODES = new Set(['M1', 'M2', 'M3']);
const TODAY = () => new Date().toISOString().slice(0, 10);

/** Strip markdown/placeholder decoration around a labeled value. */
function stripDecor(value) {
  return String(value)
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .replace(/^[\s{[\]}]+|[\s{[\]}]+$/g, '')
    .replace(/[.;,]+$/, '')
    .trim();
}

function labeledValues(text, pattern) {
  const values = [];
  for (const line of String(text).split(/\r?\n/)) {
    const m = line.match(pattern);
    if (m) values.push(stripDecor(m[1]));
  }
  return values;
}

/**
 * Parse the verdict from a sign-off. An unbracketed sentence is never a verdict.
 * The frontmatter placeholder `"GO | CONDITIONAL | NO-GO"` is ignored unless it
 * was replaced with a single real verdict.
 */
function parseVerdict(text) {
  const candidates = [];
  const bracketed = verdictOf(text);
  if (bracketed && VERDICTS.has(bracketed)) candidates.push(bracketed);

  for (const v of labeledValues(text, /^\s*(?:\*\*)?verdict(?:\*\*)?\s*:\s*(.+)$/im)) {
    if (VERDICTS.has(v)) candidates.push(v);
  }
  for (const v of labeledValues(text, /release\s+recommendation\s*[::]\s*(.+)/i)) {
    if (VERDICTS.has(v)) candidates.push(v);
  }

  const unique = [...new Set(candidates)];
  if (unique.length === 0) return { verdict: null, error: 'unparseable' };
  if (unique.length > 1) return { verdict: null, error: `inconsistent verdicts: ${unique.join(', ')}` };
  return { verdict: unique[0], error: null };
}

function parseReportVerdict(text) {
  const values = labeledValues(text, /release\s+recommendation\s*[::]\s*(.+)/i);
  const verdicts = values.filter((v) => VERDICTS.has(v));
  if (verdicts.length === 1) return verdicts[0];
  if (values.length === 0) {
    const bracketed = verdictOf(text);
    return bracketed && VERDICTS.has(bracketed) ? bracketed : null;
  }
  return null;
}

/** sha256(report content + '\n' + report mtimeMs), as specified in 03 F2.26. */
function computeSignature(reportPath) {
  const content = fs.readFileSync(reportPath, 'utf8');
  const mtimeMs = fs.statSync(reportPath).mtimeMs;
  return crypto.createHash('sha256').update(content + '\n' + String(mtimeMs)).digest('hex');
}

function firstLabeled(text, pattern) {
  for (const line of String(text).split(/\r?\n/)) {
    const m = line.match(pattern);
    if (m) return stripDecor(m[1]);
  }
  return null;
}

function conditionsSection(text) {
  // Use an end-of-input sentinel, not `$`: with the `m` flag `$` matches every
  // line end and would truncate the section before its first condition row.
  const m = String(text).match(/^##\s*Conditions\b[\s\S]*?(?=^##\s|(?![\s\S]))/im);
  return m ? m[0] : '';
}

function checkQA(options = {}) {
  const root = options.root ? path.resolve(options.root) : process.cwd();
  const reportPath = path.resolve(root, options.report || REPORT_REL);
  const signoffPath = path.resolve(root, options.signoff || SIGNOFF_REL);
  const failures = [];
  const warnings = [];
  const files = {
    report: { path: reportPath, found: fs.existsSync(reportPath) },
    signoff: { path: signoffPath, found: fs.existsSync(signoffPath) },
  };

  // T-GATE-1: absence is a failure here, not a context-dependent skip.
  if (!files.report.found) failures.push(`qa-report.md is absent at ${reportPath}. Invoke @qa-engineer via /develop Step 7a.`);
  if (!files.signoff.found) failures.push(`qa-signoff.md is absent at ${signoffPath}. Write it from .agents/skills/develop/templates/qa-signoff.md.`);
  if (!files.report.found || !files.signoff.found) {
    return { ok: false, recommendation: null, failures, warnings, files };
  }

  const signoffText = fs.readFileSync(signoffPath, 'utf8');
  const reportText = fs.readFileSync(reportPath, 'utf8');

  // T-GATE-2: parse the recommendation; never regex a sentence into a verdict.
  const parsed = parseVerdict(signoffText);
  if (parsed.error) {
    failures.push(`qa-signoff.md recommendation is ${parsed.error}. Write exactly one bracketed VERDICT: [GO], [CONDITIONAL] or [NO-GO].`);
  }
  const recommendation = parsed.verdict;

  // T-GATE-3: the sign-off must agree with the report it signs.
  if (recommendation) {
    const reportVerdict = parseReportVerdict(reportText);
    if (!reportVerdict) {
      failures.push('qa-report.md carries no parseable release recommendation; the sign-off cannot be cross-checked against it.');
    } else if (reportVerdict !== recommendation) {
      failures.push(`qa-signoff.md says [${recommendation}] but qa-report.md says [${reportVerdict}]. A sign-off must match the report it signs.`);
    }
  }

  // T-GATE-4 / T-GATE-8: content+mtime signature binds sign-off to report.
  const storedSig = firstLabeled(signoffText, /^\s*(?:\*\*)?signature(?:\*\*)?\s*[::]\s*(.+)$/im);
  if (!storedSig) {
    failures.push('qa-signoff.md carries no Signature field. Add sha256(qa-report.md content + newline + mtimeMs).');
  } else if (storedSig.toLowerCase() !== computeSignature(reportPath)) {
    failures.push('qa-signoff.md Signature does not match qa-report.md content and mtime. The report changed after signing — re-run QA and re-sign.');
  }

  // T-GATE-5: a recycled sign-off is not evidence for today's work.
  const signoffDate = firstLabeled(signoffText, /^\s*(?:\*\*)?date(?:\*\*)?\s*[::]\s*(.+)$/im);
  if (!signoffDate || signoffDate === 'YYYY-MM-DD' || signoffDate !== TODAY()) {
    failures.push(`qa-signoff.md date is ${signoffDate || 'missing'}, expected ${TODAY()}. A stale sign-off is not evidence for this cycle.`);
  }
  const reportDate = firstLabeled(reportText, /^\s*(?:\*\*)?date(?:\*\*)?\s*[::]\s*(.+)$/im);
  if (reportDate && reportDate !== 'YYYY-MM-DD' && reportDate !== TODAY()) {
    failures.push(`qa-report.md date is ${reportDate}, expected ${TODAY()}.`);
  }

  // T-GATE-6: solo-mode sign-offs are invalid (03b F3b.27).
  const mode = firstLabeled(signoffText, /^\s*(?:\*\*)?mode(?:\*\*)?\s*[::]\s*(.+)$/im);
  if (!mode || !MODES.has(mode)) {
    failures.push(`qa-signoff.md Mode is ${mode || 'missing'}; it must be exactly M1, M2 or M3. Solo-mode sign-offs are invalid.`);
  }

  // T-GATE-7: NO-GO is a verdict, not a completion.
  if (recommendation === 'NO-GO') {
    failures.push('qa-signoff.md verdict is [NO-GO]. Fix the findings and re-run QA; a NO-GO cannot complete a cycle.');
  }

  // T-GATE-9: an unfilled conditions table is not a condition list.
  if (recommendation === 'CONDITIONAL') {
    const section = conditionsSection(signoffText);
    if (/\{[^{}\n]+\}|YYYY-MM-DD/.test(section)) {
      failures.push('qa-signoff.md [CONDITIONAL] still has unsubstituted template placeholders in its Conditions table. Name each condition with a real owner and date.');
    }
  }

  // Reuse the shipped, already-tested parsers for everything they own.
  const shared = checkSignoff(signoffText, root);
  for (const f of shared.failures) if (!failures.includes(f)) failures.push(f);
  for (const w of shared.warnings) if (!warnings.includes(w)) warnings.push(w);
  for (const f of checkFreshness(root, {})) if (!failures.includes(f)) failures.push(f);

  return { ok: failures.length === 0, recommendation, failures, warnings, files };
}

function main() {
  const args = process.argv.slice(2);
  // Signature helper: `node qa_check.js signature [--report P]` prints the value
  // to paste into qa-signoff.md. No silent auto-signing — the human signs.
  if (args[0] === 'signature') {
    let reportPath = path.resolve(process.cwd(), REPORT_REL);
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--root') reportPath = path.resolve(args[++i], REPORT_REL);
      else if (args[i] === '--report') reportPath = path.resolve(args[++i]);
    }
    if (!fs.existsSync(reportPath)) {
      console.error(`qa-report.md not found at ${reportPath}`);
      process.exit(2);
    }
    console.log(computeSignature(reportPath));
    return;
  }

  const opts = { json: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json') opts.json = true;
    else if (args[i] === '--root') opts.root = args[++i];
    else if (args[i] === '--signoff') opts.signoff = args[++i];
    else if (args[i] === '--report') opts.report = args[++i];
  }

  const result = checkQA(opts);
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.ok) {
    console.log(`✓ QA gate passed — recommendation [${result.recommendation}].`);
    for (const w of result.warnings) console.log(`  ! ${w}`);
  } else {
    console.error(`✗ QA gate FAILED (${result.failures.length} issue${result.failures.length === 1 ? '' : 's'})`);
    for (const f of result.failures) console.error(`  - ${f}`);
  }
  process.exit(result.ok ? 0 : 1);
}

if (require.main === module) main();

module.exports = {
  checkQA,
  computeSignature,
  parseVerdict,
  parseReportVerdict,
  stripDecor,
  REPORT_REL,
  SIGNOFF_REL,
};
