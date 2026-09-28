#!/usr/bin/env node
/**
 * anti_generic_check.js — Anti-generic + motion-coverage gate for /design's design.md.
 *
 * WHY THIS EXISTS
 * `.agents/templates/product/design.md` carries a strong "Anti-generic rule"
 * (banned navy darks, banned violet→blue hero gradients, a MANDATORY signature
 * differentiator, a taste interview that must run before tokens) and a
 * context→motion expectation (Vibrant Brand-First / Conversion Storefront are
 * motion-led contexts). But every one of those was PROSE only — nothing failed
 * the build when an agent skipped the taste interview and poured its default
 * palette (navy dark surface + flat gradient + empty differentiator) into the
 * token tables. The reported symptom: "/design always results in traditional
 * design." This script turns the prose contract into a mechanical, build-failing
 * check, mirroring template_conformance.js.
 *
 * SCOPE (deliberate): the DETERMINISTICALLY DETECTABLE subset of "generic", not
 * subjective taste. It asserts:
 *   1. No banned navy dark surface  — dark surface hex must be desaturated
 *      neutral (blue channel not meaningfully above red/green).
 *   2. A named signature differentiator exists (not a placeholder).
 *   3. The Design brief is filled (no {adjective}/{signature} placeholders left).
 *   4. The Inspiration shelf is real (starter placeholder rows replaced).
 *   5. Motion coverage: for a motion-led Product context (Vibrant Brand-First /
 *      Conversion Storefront) the Motion / Micro-animations tables are not empty
 *      — motion must be spec'd or the skip explicitly recorded. It cannot judge
 *      whether a filled design is *tasteful* — that stays human review. Raising
 *      the floor (killing the obvious tells + forcing the taste interview to
 *      actually run), not guaranteeing the ceiling.
 *
 * Usage:
 *   node .agents/scripts/anti_generic_check.js check \
 *     [--design <path>] [--root <dir>] [--json]
 *
 * Exit 0 = conformant. Exit 1 = generic/incomplete (listed). Exit 2 = usage/IO error.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  design: 'artifacts/output/03-strategy/design.md',
};

// Motion-led product contexts (per design.md "Product context" menu). When one
// of these is the selected context, motion is expected to be spec'd.
const MOTION_LED_CONTEXTS = [/Vibrant Brand-First/i, /Conversion Storefront/i];

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--design') args.design = argv[++i];
    else if (a === '--root') args.root = argv[++i];
    else args._.push(a);
  }
  return args;
}

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

// Extract all hex colors in the document as { hex, r, g, b }.
function extractHexColors(text) {
  const out = [];
  const re = /#([0-9a-fA-F]{6})\b/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const h = m[1];
    out.push({
      hex: `#${h.toLowerCase()}`,
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    });
  }
  return out;
}

// A "navy dark" surface = a DARK color (all channels low → it's a background/
// surface, not an accent) whose BLUE channel is meaningfully pushed above red
// and green. Desaturated neutral greys (the template's approved dark surfaces)
// have r≈g≈b and pass. Bright/saturated accents are not surfaces and are ignored.
function isNavyDarkSurface({ r, g, b }) {
  const maxCh = Math.max(r, g, b);
  const isDark = maxCh <= 0x40; // ~64 — a dark surface, not a mid/bright accent
  if (!isDark) return false;
  const bluePush = b - Math.max(r, g);
  return bluePush >= 6; // blue meaningfully above the neutral band → navy tint
}

function checkDesign(text) {
  const failures = [];

  // ---- 1. Banned navy dark surfaces ----
  const navy = extractHexColors(text).filter(isNavyDarkSurface);
  if (navy.length > 0) {
    const list = [...new Set(navy.map((c) => c.hex))].join(', ');
    failures.push(
      `Anti-generic: banned navy dark surface(s) detected (${list}) — dark surfaces must be desaturated neutral grey (blue channel not pushed above red/green). See design.md "Banned defaults".`
    );
  }

  // ---- 2. Signature differentiator must be named (not a placeholder) ----
  // Template: "every design names ONE signature element ... If you can't name
  // it, the design isn't done." Look for a Signature moment / signature element
  // that is filled with real content, not a {placeholder} or empty brace.
  // Rule: the doc must name a signature AND must not leave the brief's
  // "Signature moment:" as an unfilled {placeholder}.
  const brandBrief = text.match(/Signature moment:\s*\{[^}]*\}/i);
  if (!/signature/i.test(text)) {
    failures.push(
      'Anti-generic: no signature differentiator named — design.md requires ONE named signature element ("If you can\'t name it, the design isn\'t done").'
    );
  } else if (brandBrief) {
    failures.push(
      'Anti-generic: the Design brief\'s "Signature moment:" is still an unfilled {placeholder} — name the one interaction users will remember.'
    );
  }

  // ---- 3. Design brief placeholders must be filled ----
  // Template brief: "It should feel {adjective}, {adjective}, {adjective} — never
  // {anti-adjective}." Unfilled {adjective}/{anti-adjective}/{audience} braces
  // mean the brief was never written.
  const briefPlaceholders = text.match(/\{(adjective|anti-adjective|audience|product\/screen|signature element|menu style[^}]*)\}/gi);
  if (briefPlaceholders && briefPlaceholders.length > 0) {
    const uniq = [...new Set(briefPlaceholders.map((s) => s.toLowerCase()))].join(', ');
    failures.push(
      `Anti-generic: the Design brief still contains unfilled placeholders (${uniq}) — the taste brief was not written. Fill it before tokens.`
    );
  }

  // ---- 4. Inspiration shelf must be real (starter rows replaced) ----
  // Template starter shelf: lafys.com / motionsites.ai / sceneai.art with
  // "{what to steal}" braces. If those exact starter lines with unfilled braces
  // remain, the shelf is empty.
  const starterShelf = /(?:lafys\.com|motionsites\.ai|sceneai\.art)\s*[—-]\s*\{what to steal[^}]*\}/i;
  if (starterShelf.test(text)) {
    failures.push(
      'Anti-generic: the Inspiration shelf still holds starter placeholder rows with "{what to steal}" — replace with 2–3 real project references ("An empty Inspiration shelf means go back, not forward").'
    );
  }

  // ---- 5. Motion coverage for motion-led contexts ----
  // Detect the SELECTED product context (a checked box, or the only context
  // asserted). We look for a checked "[x] ... Vibrant Brand-First" style marker,
  // or any motion-led context name present outside the menu list. Conservative:
  // only fire when a motion-led context is affirmatively selected.
  const selectedMotionLed = MOTION_LED_CONTEXTS.some((re) => {
    // checked checkbox form: "- [x] **Vibrant Brand-First**"
    const checked = new RegExp(`\\[[xX]\\][^\\n]*${re.source}`, 'i');
    return checked.test(text);
  });
  if (selectedMotionLed) {
    // Motion tables are "empty" when the Motion / Micro-animations token rows
    // carry no values. Heuristic: after the "## Motion" heading, is there any
    // populated row (a table row with a non-empty value cell) OR a recorded skip?
    const motionEmpty = motionTablesEmpty(text);
    const skipRecorded = /motion.*(?:not in scope|deferred|lightweight|no motion)/i.test(text);
    if (motionEmpty && !skipRecorded) {
      failures.push(
        'Motion coverage: a motion-led Product context (Vibrant Brand-First / Conversion Storefront) is selected but the Motion / Micro-animations tables are empty — run /motion or record why motion is out of scope. Static output for a motion-led context is the silent-skip defect.'
      );
    }
  }

  return failures;
}

// Returns true if BOTH the Motion token table and the Micro-animations table
// have no populated data rows (only header + separator + empty cells).
function motionTablesEmpty(text) {
  const motionSection = sliceSection(text, /^#{1,4}\s+Motion\b/im);
  const microSection = sliceSection(text, /^#{1,4}\s+Micro-?animations\b/im);
  const motionHasData = tableHasDataRow(motionSection);
  const microHasData = tableHasDataRow(microSection);
  return !motionHasData && !microHasData;
}

// Slice from a heading match to the next heading of the same-or-higher level.
function sliceSection(text, headingRe) {
  const m = headingRe.exec(text);
  if (!m) return '';
  const start = m.index;
  const rest = text.slice(start + m[0].length);
  const next = rest.search(/^#{1,4}\s+\S/m);
  return next === -1 ? text.slice(start) : text.slice(start, start + m[0].length + next);
}

// A markdown table "has a data row" when a row (past the header + `---` divider)
// contains at least one non-empty, non-placeholder value cell.
function tableHasDataRow(section) {
  if (!section) return false;
  const lines = section.split('\n').filter((l) => l.trim().startsWith('|'));
  // Drop header row and the |---|---| divider row.
  const dataRows = lines.filter((l) => !/^\s*\|[\s|:-]+\|\s*$/.test(l));
  // The first data row is typically the header labels; require a row where a
  // value cell (2nd+ column) holds real content.
  let headerSeen = false;
  for (const row of dataRows) {
    const cells = row.split('|').slice(1, -1).map((c) => c.trim());
    if (!headerSeen) {
      // treat the first table row as the header (Token | Value | Use etc.)
      headerSeen = true;
      continue;
    }
    // A populated row: any cell beyond the first has non-empty, non-brace content.
    const valueCells = cells.slice(1);
    if (valueCells.some((c) => c.length > 0 && !/^\{[^}]*\}$/.test(c))) {
      return true;
    }
  }
  return false;
}

// Motion traceability: when a motion-spec.md exists, every MO-### it defines must
function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0] || 'check';
  if (cmd !== 'check') {
    console.error('Usage: node anti_generic_check.js check [--design P] [--root R] [--json]');
    process.exit(2);
  }

  const root = args.root ? path.resolve(args.root) : process.cwd();
  const designPath = path.resolve(root, args.design || DEFAULTS.design);

  const result = { design: {}, failures: [] };

  if (!fs.existsSync(designPath)) {
    result.failures.push(`design.md: file not found: ${path.relative(root, designPath)}`);
    result.design = { path: designPath, found: false };
  } else {
    let text;
    try {
      text = read(designPath);
    } catch (e) {
      console.error(`anti_generic_check: cannot read ${designPath}: ${e.message}`);
      process.exit(2);
    }
    const f = checkDesign(text);
    result.design = { path: designPath, found: true, failures: f };
    result.failures.push(...f);
  }

  const ok = result.failures.length === 0;

  if (args.json) {
    console.log(JSON.stringify({ ok, ...result }, null, 2));
  } else if (ok) {
    console.log('✓ anti-generic: design.md names a signature, avoids banned navy defaults, has a real brief + inspiration shelf, and covers motion for motion-led contexts');
  } else {
    console.error(`✗ anti-generic check FAILED (${result.failures.length} issue${result.failures.length === 1 ? '' : 's'})`);
    console.error('  design.md must obey the Anti-generic rule (design.md "Banned defaults" + "Differentiator requirement").');
    console.error('  A design that could be mistaken for any model\'s default output fails review — restart from the brief, do not polish the generic.');
    for (const msg of result.failures) console.error(`  - ${msg}`);
  }

  process.exit(ok ? 0 : 1);
}

main();
