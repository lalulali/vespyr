#!/usr/bin/env node
'use strict';

/**
 * template_version_guard.js — reject generated documents that copied a
 * template's internal versioning metadata.
 *
 * WHY: Vespyr templates track their own revision number (template v2/v3/v5)
 * inside a `<!-- Template Revision History (Vespyr internal ...) -->` comment.
 * That comment is framework metadata, NOT the version of the document being
 * generated. A brand-new document is always version 1. The observed defect:
 * an agent copied the template revision (e.g. "Version: 5.0", "Supersedes:
 * v3.0") verbatim into a first-generation document, so the document was born
 * as v5 and the pipeline's version tracker recorded it wrong.
 *
 * WHAT THIS CATCHES (fail-closed, false-positive-safe): a generated document
 * that contains the template's internal-only markers. These strings never
 * legitimately appear in a real output document, so their presence is a
 * definitive copy-of-template-metadata signal:
 *   1. "Template Revision History"  — the internal comment header
 *   2. "DO NOT copy into the generated document" — the guard instruction itself
 *
 * WHAT THIS DOES NOT DO: it never rejects a document merely for having a
 * version > 1. A legitimately edited document (v2, v3, …) is expected and
 * allowed — only leaked *template* metadata is a defect.
 *
 * USAGE:
 *   node template_version_guard.js check --file <generated-doc.md> [--json]
 *   node template_version_guard.js check --file a.md --file b.md [--json]
 * EXIT: 0 clean · 1 leak found · 2 usage error
 */

const fs = require('fs');
const path = require('path');

// Internal-only markers that must never appear in a generated output document.
const LEAK_MARKERS = [
  { re: /Template Revision History/i, label: '"Template Revision History" internal comment copied into the document' },
  { re: /DO NOT copy into the generated document/i, label: 'template guard instruction ("DO NOT copy into the generated document") copied into the document' },
];

function parseArgs(argv) {
  const args = { files: [], json: false, _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--file') args.files.push(argv[++i]);
    else args._.push(a);
  }
  return args;
}

function checkFile(file) {
  const failures = [];
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    return { file, found: false, error: `cannot read: ${e.message}`, failures: [] };
  }
  for (const m of LEAK_MARKERS) {
    if (m.re.test(text)) {
      failures.push(`${path.basename(file)}: ${m.label} — this is template metadata; a generated document must not contain it (document version starts at 1 on first generation)`);
    }
  }
  return { file, found: true, failures };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0] || 'check';
  if (cmd !== 'check' || args.files.length === 0) {
    console.error('Usage: node template_version_guard.js check --file <doc.md> [--file <doc2.md>] [--json]');
    process.exit(2);
  }

  const results = args.files.map(checkFile);
  const failures = results.flatMap((r) => r.failures);
  const readErrors = results.filter((r) => r.error);
  const ok = failures.length === 0 && readErrors.length === 0;

  if (args.json) {
    console.log(JSON.stringify({ ok, results, failures }, null, 2));
  } else if (ok) {
    console.log(`✓ template version guard: ${results.length} document(s) clean — no leaked template revision metadata`);
  } else {
    if (readErrors.length) {
      for (const r of readErrors) console.error(`✗ ${r.error} (${r.file})`);
    }
    if (failures.length) {
      console.error(`✗ template version leak (${failures.length} issue${failures.length === 1 ? '' : 's'}):`);
      for (const f of failures) console.error(`  - ${f}`);
      console.error('  Fix: remove the template revision comment from the output; set the document version to 1 on first generation.');
    }
  }
  process.exit(ok ? 0 : 1);
}

main();
