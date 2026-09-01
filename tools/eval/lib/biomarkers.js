/**
 * Biomarkers — RQS-D Deterministic Engine (02l Option A Thin Slice)
 * 0 LLM tokens, <25ms, AST/regex only.
 * Computes SCR, MSHA, Placeholder Density, PCI_det, AC testability → composite RQS-D.
 * SRSR/SDS explicitly excluded (RQS-J shadow, Tier B G-Eval).
 */

const { countTokens } = require('./tokenizer');
const { parseMarkdownAST } = require('./ast');
const fs = require('fs');

const PLACEHOLDER_PATTERNS = [/TODO/i, /TBD/i, /\[insert/i, /\[TODO/i, /\[TBD/i];
const AC_REGEX = /^- (Given|When|Then)\b/m;

function computePlaceholderDensity(text) {
  if (!text) return 1;
  const lines = text.split('\n');
  if (lines.length === 0) return 0;
  let bad = 0;
  for (const l of lines) {
    if (PLACEHOLDER_PATTERNS.some(rx => rx.test(l))) bad++;
  }
  return bad / lines.length;
}

function computeSCR(text) {
  // Deterministic: 1.0 if frontmatter parses (if present) and JSON fences parse; else 0.0
  // Minimal: if text contains ```json block, try parse; if frontmatter --- block, try parse
  try {
    const fm = text.match(/^---\n([\s\S]*?)\n---/m);
    if (fm) {
      const yaml = fm[1];
      if (/^\s*[\w-]+\s*:/m.test(yaml)) {
        // crude yaml sanity: contains key: value
      } else if (yaml.trim().length > 0) return 0.0;
    }
    const jsonFences = [...text.matchAll(/```json\n([\s\S]*?)```/g)];
    for (const m of jsonFences) {
      try { JSON.parse(m[1]); } catch(e) { return 0.0; }
    }
    return 1.0;
  } catch(e) { return 0.0; }
}

function computeMSHA(text, requiredHeaders) {
  if (!requiredHeaders || requiredHeaders.length === 0) {
    // default check: at least one H2 present
    const hasH2 = /^##\s+.+/m.test(text);
    return hasH2 ? 1.0 : 0.0;
  }
  let present = 0;
  for (const h of requiredHeaders) {
    const rx = new RegExp('^##\\s+' + h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'im');
    if (rx.test(text)) present++;
  }
  return requiredHeaders.length ? present / requiredHeaders.length : 1.0;
}

function computeAcTestability(text) {
  const lines = text.split('\n');
  const acLines = lines.filter(l => /^\s*-\s*(Given|When|Then)\b/i.test(l));
  if (acLines.length === 0) {
    // no AC section => check if any Gherkin at all; if none, neutral 1.0 (not applicable) else 0
    const hasAcKeyword = /(Given|When|Then)/i.test(text);
    return hasAcKeyword ? 0.0 : 1.0;
  }
  // all acLines already match regex; if we want strict per-commit: ensure they start with "- Given"
  const valid = acLines.filter(l => AC_REGEX.test(l.trim())).length;
  return valid / acLines.length;
}

/**
 * Compute RQS-D from text and options.
 * @param {string} text - markdown artifact text
 * @param {object} opts - { requiredHeaders: string[], pciWeight, mshaWeight, ... } weights override
 * @returns {object} { rqs_d_score, rating, biomarkers: {scr,msha,placeholder_density,pci,ac_testability, srsr:null, scope_drift:null}, details }
 */
function computeRQSD(text, opts = {}) {
  const ast = parseMarkdownAST(text || '');
  const pci = typeof ast.pci === 'number' ? ast.pci : 0;
  const placeholder_density = computePlaceholderDensity(text || '');
  const scr = computeSCR(text || '');
  const msha = computeMSHA(text || '', opts.requiredHeaders);
  const ac_testability = computeAcTestability(text || '');

  // Provisional weights per 02l Option A (sum 1.0, excluding RQS-J)
  const w = {
    scr: opts.w_scr != null ? opts.w_scr : 0.25,
    msha: opts.w_msha != null ? opts.w_msha : 0.25,
    pd: opts.w_pd != null ? opts.w_pd : 0.20,
    pci: opts.w_pci != null ? opts.w_pci : 0.15,
    ac: opts.w_ac != null ? opts.w_ac : 0.15,
  };
  // normalize if custom
  const sum = w.scr + w.msha + w.pd + w.pci + w.ac;
  const nw = { scr: w.scr/sum, msha: w.msha/sum, pd: w.pd/sum, pci: w.pci/sum, ac: w.ac/sum };

  const cleanliness = 1 - placeholder_density;
  const antiPci = 1 - pci; // PCI 0.0 best

  const rqs = nw.scr * scr + nw.msha * msha + nw.pd * cleanliness + nw.pci * antiPci + nw.ac * ac_testability;
  const rqs_d_score = Math.max(0, Math.min(1, Number(rqs.toFixed(3))));
  let rating = 'REJECTED';
  if (rqs_d_score >= 0.95) rating = 'EXCELLENT';
  else if (rqs_d_score >= 0.85) rating = 'PASS';
  else if (rqs_d_score >= 0.70) rating = 'NEEDS_REPAIR';

  return {
    rqs_d_score,
    rating,
    biomarkers: {
      scr,
      msha,
      placeholder_density,
      pci,
      ac_testability,
      srsr: null,
      scope_drift: null,
    },
    weights: nw,
    tier0: {
      scr_pass: scr === 1.0,
      msha_pass: msha === 1.0,
      pd_pass: placeholder_density === 0.0,
      pci_pass: pci === 0.0,
    }
  };
}

function computeRQSDWithDetails(text, opts) {
  const r = computeRQSD(text, opts);
  const checks = [
    { type: 'json_schema', status: r.biomarkers.scr === 1.0 ? 'PASS' : 'FAIL', details: r.biomarkers.scr === 1.0 ? 'SCR 1.0' : 'SCR failed' },
    { type: 'markdown_ast', status: r.biomarkers.msha === 1.0 ? 'PASS' : 'FAIL', details: `MSHA ${r.biomarkers.msha}` },
    { type: 'markdown_ast', status: r.biomarkers.placeholder_density === 0.0 ? 'PASS' : 'FAIL', details: `PD ${r.biomarkers.placeholder_density}` },
    { type: 'markdown_ast', status: r.biomarkers.pci === 0.0 ? 'PASS' : 'FAIL', details: `PCI ${r.biomarkers.pci}` },
    { type: 'markdown_ast', status: r.biomarkers.ac_testability === 1.0 ? 'PASS' : 'FAIL', details: `AC ${r.biomarkers.ac_testability}` },
  ];
  return { ...r, checks };
}

module.exports = { computeRQSD, computeRQSDWithDetails, computePlaceholderDensity, computeSCR, computeMSHA, computeAcTestability };
