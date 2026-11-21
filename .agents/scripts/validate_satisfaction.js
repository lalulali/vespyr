#!/usr/bin/env node
/**
 * validate_satisfaction.js — Gate 2 (release): machine-check the UTTERLY
 * SATISFIED team record. This is a gate, not a scoring system: an incomplete,
 * blocked, evidence-free, or stale record fails closed.
 *
 * Canonical contract: 03e-phase-2-implementation-specs.md §15;
 * 08-cross-cutting-utter-satisfaction-dna.md §4. A harness must never turn a
 * missing record into implicit approval. There is deliberately no --skip flag.
 *
 * Usage:
 *   node .agents/scripts/validate_satisfaction.js validate <path> [--strict] [--root DIR] [--json]
 *   node .agents/scripts/validate_satisfaction.js status <path> [--root DIR] [--json]
 * Exit 0 = valid (or status), 1 = failed gate.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SCHEMA = 'vespyr/utter-satisfaction@1.0';
const STATES = new Set(['SATISFIED', 'CHANGES REQUESTED', 'BLOCKED', 'NOT ACTIVATED']);
const ACTIVE_STATES = new Set(['SATISFIED', 'CHANGES REQUESTED', 'BLOCKED']);
const MAX_AGE_DAYS = 7;

function canonicalAgentNames(root) {
  const dir = path.join(root, '.agents', 'agents');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.slice(0, -3));
}

function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file, 'utf8')).digest('hex');
}

/** Witness registry is machine-local (03 F2.16); corrupt JSON fails closed. */
function loadWitness(root) {
  const file = path.join(root, '.agents', 'state', 'witness.json');
  if (!fs.existsSync(file)) return { witness: null, corrupt: false };
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { witness: null, corrupt: true, error: 'Witness registry is not a JSON object.' };
    }
    return { witness: parsed, corrupt: false };
  } catch (e) {
    return { witness: null, corrupt: true, error: `Corrupt witness registry: ${e.message}` };
  }
}

function isBlockingRisk(risk) {
  if (!risk) return false;
  if (typeof risk === 'string') return /blocking/i.test(risk);
  return risk.blocking === true || /blocking/i.test(String(risk.description || ''));
}

function validate(record, options = {}) {
  const root = options.root ? path.resolve(options.root) : process.cwd();
  const strict = Boolean(options.strict);
  const failures = [];
  const warnings = [];
  const result = {
    valid: false,
    gate: null,
    failures,
    warnings,
    active_count: 0,
    satisfied_count: 0,
    inactive_count: 0,
    evidence_complete: false,
    revalidation_required: false,
    witness: 'unavailable',
  };

  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    failures.push('Satisfaction record is not a JSON object.');
    return result;
  }
  result.gate = typeof record.gate === 'string' ? record.gate : null;
  result.revalidation_required = record.revalidation_required === true;

  // Rule 1: schema and identity.
  if (record.schema !== SCHEMA) {
    failures.push(`Unsupported schema "${record.schema}"; expected "${SCHEMA}".`);
  }
  if (typeof record.release !== 'string' || !record.release.trim()) {
    failures.push('Record has no release/feature identifier.');
  }

  // Rule 8: staleness.
  const updated = Date.parse(record.updated_at);
  if (Number.isNaN(updated)) {
    failures.push('Record has no valid updated_at timestamp.');
  } else {
    const ageDays = (Date.now() - updated) / 86400000;
    if (ageDays > MAX_AGE_DAYS) {
      failures.push(`Record is ${ageDays.toFixed(1)} days old (max ${MAX_AGE_DAYS}); revalidate before release.`);
    }
  }

  if (!Array.isArray(record.agents) || record.agents.length === 0) {
    failures.push('Record has no agent matrix; every active agent needs exactly one row.');
    return result;
  }

  const known = new Set(canonicalAgentNames(root));
  const seen = new Set();
  const witnessState = loadWitness(root);
  const witness = witnessState.witness;
  if (witnessState.corrupt) {
    failures.push(`${witnessState.error} (.agents/state/witness.json) — Gate 2 failed closed.`);
  }
  const qaSignoffPath = path.join(root, 'artifacts', 'output', '05-execution', 'quality', 'qa-signoff.md');
  if (fs.existsSync(qaSignoffPath)) {
    const qaText = fs.readFileSync(qaSignoffPath, 'utf8');
    if (/VERDICT:\s*\[CONDITIONAL\]/i.test(qaText) || /\*\*Release recommendation:\*\*\s*CONDITIONAL\b/i.test(qaText)) {
      failures.push('QA sign-off is CONDITIONAL; CONDITIONAL advances development but never ships (03 F2.23/F2.28).');
    }
  }
  let evidenceChecked = 0;
  let evidenceOk = 0;
  let witnessChecked = 0;

  for (const row of record.agents) {
    if (!row || typeof row !== 'object') {
      failures.push('Agent matrix contains a non-object row.');
      continue;
    }
    // Rule 2: canonical, unique names.
    if (typeof row.name !== 'string' || (known.size > 0 && !known.has(row.name))) {
      failures.push(`Agent "${row.name || '(missing)'}" is not a canonical persona in .agents/agents/.`);
    }
    if (seen.has(row.name)) failures.push(`Agent "${row.name}" appears more than once.`);
    seen.add(row.name);

    // Rule 3/5: scope/state pairing.
    const inactive = row.scope === 'inactive';
    if (!inactive && row.scope !== 'active') {
      failures.push(`Agent "${row.name}" has invalid scope "${row.scope}"; use active or inactive.`);
    }
    if (!STATES.has(row.state)) {
      failures.push(`Agent "${row.name}" has invalid state "${row.state}".`);
      continue;
    }
    if (inactive) {
      if (row.state !== 'NOT ACTIVATED') {
        failures.push(`Agent "${row.name}" is scope:inactive but state is "${row.state}", not NOT ACTIVATED.`);
      }
      if (typeof row.reason !== 'string' || !row.reason.trim()) {
        failures.push(`Agent "${row.name}" is NOT ACTIVATED with no reason; out-of-scope is not approval.`);
      }
      result.inactive_count++;
      continue;
    }

    result.active_count++;
    if (!ACTIVE_STATES.has(row.state)) {
      failures.push(`Agent "${row.name}" has state "${row.state}" but scope:active; NOT ACTIVATED requires scope:inactive.`);
    }

    // Rule 4: SATISFIED needs evidence, resolved feedback and no blocking risk.
    if (row.state === 'SATISFIED') {
      result.satisfied_count++;
      const refs = Array.isArray(row.evidence_refs) ? row.evidence_refs : [];
      if (refs.length === 0) {
        failures.push(`Agent "${row.name}" is SATISFIED with no evidence reference (rule 4).`);
      }
      if (!Array.isArray(row.feedback_resolved)) {
        failures.push(`Agent "${row.name}" has no feedback_resolved list; assertions are not closure.`);
      }
      const blocking = (Array.isArray(row.residual_risks) ? row.residual_risks : []).filter(isBlockingRisk);
      if (blocking.length > 0) {
        failures.push(`Agent "${row.name}" is SATISFIED but carries ${blocking.length} blocking residual risk(s).`);
      }

      // Rules 7 and 9: evidence exists and matches its witness fingerprint.
      for (const ref of refs) {
        evidenceChecked++;
        const full = path.resolve(root, String(ref));
        if (!fs.existsSync(full)) {
          failures.push(`Agent "${row.name}" cites "${ref}", which does not exist on disk (DNA 5).`);
          continue;
        }
        evidenceOk++;
        if (witness) {
          witnessChecked++;
          const normRef = String(ref).replace(/\\/g, '/').replace(/^\.\//, '');
          const entry = witness[normRef] || witness[ref] || witness[String(ref)];
          if (!entry) {
            if (strict) {
              failures.push(`Evidence "${ref}" has no witness signature in .agents/state/witness.json (--strict).`);
            } else {
              warnings.push(`Evidence "${ref}" is unsigned; witness fingerprint unavailable.`);
            }
          } else if (entry.sha256 && entry.sha256 !== hashFile(full)) {
            failures.push(`Evidence "${ref}" changed after signing; affected row "${row.name}" must be revalidated (rule 9).`);
            result.revalidation_required = true;
          }
        }
      }
    }

    // Rule 6: unresolved states fail the release gate.
    if (row.state === 'CHANGES REQUESTED' || row.state === 'BLOCKED') {
      failures.push(`Agent "${row.name}" state is ${row.state}; release is blocked.`);
    }
  }

  // 08 §4: an out-of-scope domain is an explicit NOT ACTIVATED row, never an
  // omission. A partial matrix cannot establish a complete team gate.
  for (const name of known) {
    if (!seen.has(name)) {
      failures.push(`Agent "${name}" has no row in the satisfaction matrix; out-of-scope domains need an explicit NOT ACTIVATED row.`);
    }
  }

  if (witness && witnessChecked > 0) result.witness = 'verified';
  else if (witness) result.witness = 'partial';
  else warnings.push('No witness registry present — fingerprint check unavailable; evidence existence was still verified.');

  result.evidence_complete = evidenceChecked > 0 && evidenceOk === evidenceChecked;

  // Rule 8: GO only when the whole matrix is satisfied and clean.
  if (record.gate !== 'GO') {
    failures.push(`Release gate is "${record.gate || 'missing'}", not GO.`);
  }
  if (result.revalidation_required === true) {
    failures.push('Record is marked revalidation_required; a material change invalidated affected sign-offs.');
  }
  if (result.gate === 'GO' && result.active_count !== result.satisfied_count) {
    failures.push(`gate is GO but only ${result.satisfied_count}/${result.active_count} active agents are SATISFIED.`);
  }
  for (const row of record.agents) {
    if (row && row.scope === 'inactive' && row.state === 'NOT ACTIVATED' && !String(row.reason || '').trim()) {
      failures.push(`Agent "${row.name}" is NOT ACTIVATED without a reason; GO is invalid.`);
    }
  }

  result.valid = failures.length === 0;
  return result;
}

function loadRecord(file) {
  if (!fs.existsSync(file)) return { error: `Satisfaction record is absent at ${file}. A missing record is not implicit approval.` };
  try {
    return { record: JSON.parse(fs.readFileSync(file, 'utf8')) };
  } catch (e) {
    return { error: `Satisfaction record is not valid JSON: ${e.message}` };
  }
}

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const opts = { json: false, strict: false };
  let recordPath = null;
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--json') opts.json = true;
    else if (args[i] === '--strict') opts.strict = true;
    else if (args[i] === '--root') opts.root = args[++i];
    else if (!recordPath) recordPath = args[i];
  }
  if (!cmd || !['validate', 'status'].includes(cmd) || !recordPath) {
    console.error('Usage: validate_satisfaction.js validate <path> [--strict] [--root DIR] [--json] | status <path> [--json]');
    process.exit(2);
  }
  opts.root = opts.root ? path.resolve(opts.root) : process.cwd();
  const full = path.resolve(opts.root, recordPath);
  const loaded = loadRecord(full);
  if (loaded.error) {
    const out = { valid: false, failures: [loaded.error], warnings: [], gate: null };
    console.log(opts.json ? JSON.stringify(out, null, 2) : `✗ satisfaction gate FAILED — ${loaded.error}`);
    process.exit(1);
  }

  const result = validate(loaded.record, opts);
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (cmd === 'status') {
    console.log(`Satisfaction: ${result.active_count} active, ${result.satisfied_count} satisfied, ${result.inactive_count} inactive; gate ${result.gate || 'none'}; witness ${result.witness}.`);
    for (const w of result.warnings) console.log(`  ! ${w}`);
    for (const f of result.failures) console.log(`  - ${f}`);
  } else if (result.valid) {
    console.log('✓ satisfaction gate passed — all active agents SATISFIED with evidence.');
    for (const w of result.warnings) console.log(`  ! ${w}`);
  } else {
    console.error(`✗ satisfaction gate FAILED (${result.failures.length} issue${result.failures.length === 1 ? '' : 's'})`);
    for (const f of result.failures) console.error(`  - ${f}`);
  }
  process.exit(cmd === 'status' || result.valid ? 0 : 1);
}

if (require.main === module) main();

module.exports = { validate, loadRecord, SCHEMA, MAX_AGE_DAYS };
