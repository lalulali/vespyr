#!/usr/bin/env node
/**
 * motion_assets_check.js — validator for motion-assets.md.
 *
 * WHY THIS EXISTS
 * `motion_spec_check.js` validates the motion PROMPT. It never checks the asset the prompt
 * depends on. So a spec can be perfectly complete — every MO-### has duration, easing,
 * reduced-motion fallback, and a US-### reference — and still be unimplementable, because
 * MO-004 animates a hero model that does not exist, was generated on a licence that forbids
 * commercial use, or has no fallback for when generation fails.
 *
 * That is the same defect class as an under-specified prompt: the work looks finished and
 * is not. This script closes the asset half.
 *
 * WHAT IT CHECKS
 *   - an AS-### missing `Consumed by` (nothing depends on it)
 *   - an MO-### declared as needing an external asset with no matching AS-### (nothing
 *     provides it) — detected via the `Asset:` field on the motion prompt
 *   - a missing or placeholder LICENCE line
 *   - a missing FALLBACK
 *   - `Route: generated` with no SOURCE
 *   - a generation prompt naming an artist or band (rejected by services, and a rights
 *     problem even where accepted)
 *   - an orphan AS-### referencing an MO-### that is not in the spec
 *
 * ABSENCE IS CONTEXT-DEPENDENT, same rule as motion_spec_check.js. By default a missing
 * motion-assets.md is a skip (exit 0): most motion work needs no external assets. Under
 * `--require-assets` — which `/motion` Phase 3b must pass — absence is a FAILURE, because
 * that phase is only reachable once assets are known to be in scope.
 *
 * Usage:
 *   node .agents/scripts/motion_assets_check.js check \
 *     [--motion-spec <path>] [--assets <path>] [--root <dir>] [--require-assets] [--json]
 *
 * Exit 0 = conformant or skipped. Exit 1 = failure (listed). Exit 2 = usage/IO error.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  motionSpec: 'artifacts/output/03-strategy/motion-spec.md',
  assets: 'artifacts/output/03-strategy/motion-assets.md',
};

const REQUIRED_ASSET_FIELDS = [
  'Consumed by',
  'Purpose',
  'Type',
  'Route',
  'Spec',
  'Source',
  'Licence',
  'Fallback',
];

// `client-data` exists because a blind run on a B2B marine brief had no rung for the
// manufacturer's OWN engineering data — hull geometry, station tables, photographs of the actual
// build — and had to file it under `reuse`, which reads as "we found an existing asset" rather
// than "this is the client's primary source material". On a technical or credibility-driven
// surface that route is not the fifth-best option, it is the only defensible one.
// Stored normalised (non-letters stripped) because `norm` strips them before comparing:
// `client-data` → `clientdata`. An entry with a hyphen would never match.
const VALID_ROUTES = ['clientdata', 'reuse', 'css', 'procedural', 'stock', 'generated'];

// Matched against generation prompts only. This is a coarse net on purpose: it catches the
// real-world failure ("music in the style of <artist>") without pretending to adjudicate
// style similarity, which is a legal question, not a regex question.
const ARTIST_NAME_RE =
  /\b(?:in the style of|sounds? like|inspired by|similar to|reminiscent of|à la)\s+[A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+)?/;

// Placeholders that would sail past a naive presence check.
const PLACEHOLDER_RE = /^\s*(\{|tbd|todo|n\/?a|none|placeholder|\?+|-+)\s*$/i;

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--require-assets') args.requireAssets = true;
    else if (a === '--motion-spec') args.motionSpec = argv[++i];
    else if (a === '--assets') args.assets = argv[++i];
    else if (a === '--root') args.root = argv[++i];
    else args._.push(a);
  }
  return args;
}

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

/**
 * Read `**Label:** value` from a block. Returns null when the label is absent entirely.
 *
 * Supports a BLOCK form as well as the inline form: a value continues onto following lines
 * until the next `**label**`. Measured: a blind run wrote `Spec:` as a five-item nested list
 * across six lines and the gate reported it as "still a placeholder" — because only the first
 * line was read and the first line was the bare label. It cost the only gate iteration that
 * run spent, and no document said multi-line fields were unsupported.
 */
function fieldValue(body, label) {
  const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = body.match(new RegExp(`\\*\\*${esc}:?\\*\\*[ \\t]*([^\\n]*)`, 'i'));
  if (!m) return null;
  const inline = (m[1] || '').trim();

  // A field's value continues onto following lines until the next label — even when the first
  // line is non-empty. Returning early on a non-empty inline value silently truncated every
  // wrapped field: a `Source:` whose candidates and licence sat on lines 2–4 was read as only
  // line 1, so a stock asset looked like it named nothing.
  const hasContinuation = (() => {
    const after = body.slice(body.indexOf(m[0]) + m[0].length);
    for (const line of after.split('\n').slice(1)) {
      if (/^\s*(?:[-*+]\s+)?\*\*[^*]+\*\*/.test(line)) return false;
      if (/^\s*(?:[-*+]\s+)?#{2,4}\s/.test(line)) return false;
      if (line.trim().length > 0) return true;
    }
    return false;
  })();

  if (inline.length > 0 && !/^\{[^}]*\}$/.test(inline) && !hasContinuation) return inline;

  // Inline empty or a placeholder → look for a block form on the following lines.
  const after = body.slice(body.indexOf(m[0]) + m[0].length);
  const collected = [];
  for (const line of after.split('\n').slice(1)) {
    // Break on the next field label. It must tolerate a leading list bullet, because the real
    // format is `- **Label:** value` — a break that required `**` at column zero never fired and
    // the block absorbed every subsequent field.
    if (/^\s*(?:[-*+]\s+)?\*\*[^*]+\*\*/.test(line)) break;
    if (/^\s*(?:[-*+]\s+)?#{2,4}\s/.test(line)) break;   // next heading, possibly bulleted
    if (line.trim().length > 0) collected.push(line.trim());
  }
  const block = collected.join(' ').replace(/\s+/g, ' ').trim();
  const parts = [inline, block].filter((p) => p && !/^\{[^}]*\}$/.test(p));
  const combined = parts.join(' ').replace(/\s+/g, ' ').trim();
  if (combined.length > 0 && !/^\{[^}]*\}$/.test(combined)) return combined;
  return '';
}

// Split into `### Asset: AS-### ...` blocks.
function extractAssetBlocks(text) {
  const heads = [];
  const re = /^#{2,4}\s*Asset:\s*(AS-\d{2,})\b[^\n]*$/gim;
  let m;
  while ((m = re.exec(text)) !== null) heads.push({ id: m[1], start: m.index });
  return heads.map((h, i) => {
    const afterHeading = text.indexOf('\n', h.start) + 1;
    const rest = text.slice(afterHeading);
    const next = rest.search(/^#{2,4}\s+\S/m);
    const end = next === -1 ? text.length : afterHeading + next;
    return { id: h.id, body: text.slice(h.start, end) };
  });
}

function extractPromptIds(text) {
  const ids = new Set();
  const re = /^#{2,4}\s*Motion Prompt:\s*(MO-\d{2,})\b/gim;
  let m;
  while ((m = re.exec(text)) !== null) ids.add(m[1]);
  return ids;
}

function checkMotionAssets(assetsText, specText, requireAssets = false) {
  const failures = [];
  const blocks = extractAssetBlocks(assetsText);
  const specIds = extractPromptIds(specText || '');

  if (blocks.length === 0) {
    failures.push('motion-assets.md contains no `### Asset: AS-###` entries.');
  }

  for (const b of blocks) {
    for (const label of REQUIRED_ASSET_FIELDS) {
      const v = fieldValue(b.body, label);
      if (v === null) {
        failures.push(`${b.id}: missing field "${label}"`);
      } else if (v === '' || PLACEHOLDER_RE.test(v)) {
        failures.push(`${b.id}: "${label}" is still a placeholder`);
      }
    }

    const route = fieldValue(b.body, 'Route');
    if (route && route.length > 0) {
      const norm = route.toLowerCase().replace(/[^a-z]/g, '');
      if (!VALID_ROUTES.includes(norm)) {
        failures.push(
          `${b.id}: Route "${route}" is not one of ${VALID_ROUTES.join(' | ')}`
        );
      }
      // A generated asset with no recorded source cannot be re-created or audited.
      if (norm === 'generated') {
        const src = fieldValue(b.body, 'Source');
        if (!src || src.length === 0 || PLACEHOLDER_RE.test(src)) {
          failures.push(`${b.id}: Route is "generated" but Source is empty — the asset is unreproducible`);
        }
      }
      // A Source must be RESOLVABLE on every route that consumes bytes from somewhere.
      //
      // Measured by a blind run on a credibility surface: `Source` was enforced only for
      // `generated`, while `client-data` and `procedural` — the two routes such a surface
      // actually uses — accepted prose. "Derived at build time from the offset table" passed
      // without naming the table. A gate that accepts prose is not checking those routes.
      //
      // `css` is exempt: a gradient lives in the stylesheet it is written into, so a locator
      // would be meaningless rather than missing.
      const sourceVal = fieldValue(b.body, 'Source') || '';
      const LOCATOR = /(?:https?:\/\/|\.\/|repo:|client\/|src\/|\/[\w.-]+\/[\w.-]+|[\w-]+\.(?:csv|json|glb|gltf|png|jpe?g|webp|svg|woff2?|hdr|ktx2)\b)/i;
      // "derived at build from AS-001" is a named deterministic input just as much as
      // "derived from foo.csv" is — the words between must not defeat the match.
      const NAMED_INPUT = /(?:derived|computed|generated|built|calculated)\b[^.]{0,40}\bfrom\b/i;
      // A stock asset whose family is deliberately not yet chosen is a legitimate deferral,
      // but only if it names candidates and the licence. Two blind runs both produced this.
      const CANDIDATES = /`[A-Z][A-Za-z0-9 .+'-]{2,}`/;
      const hasLicence = /\b(?:OFL|OFL-1\.1|Apache|MIT|CC0|CC-?BY|SIL|licence|license)\b/i;
      // A stock asset whose concrete item is deliberately not chosen yet is legitimate ONLY when all
      // three hold: the licence is named, the Source says the motion does not depend on the
      // choice, and a Fallback exists (enforced separately, below). Candidates are the
      // preferred form; a stated dependency-free deferral is the fallback form. One word like
      // "provisional" is not enough — otherwise the locator requirement has no teeth.
      const defersDeliberately =
        /(?:\bnot\s+chosen\b|\bprovisional\b|\bto\s+be\s+chosen\b|\bunselected\b)/i.test(sourceVal) &&
        /(?:motion\s+does\s+not\s+depend|does\s+not\s+depend|no\s+motion\s+depend|irrelevant\s+to\s+motion|not\s+motion[-\s]dependent)/i.test(sourceVal);
      const stockDeferred =
        norm === 'stock' &&
        hasLicence.test(sourceVal) &&
        (CANDIDATES.test(sourceVal) || defersDeliberately);
      // A `generated` asset's locator is the tool + model + version, not a path: "FLUX.1
      // schnell" or "Meshy 6" is the correct Source, and refusing it would push authors to
      // invent a repo path for bytes that were never committed.
      const GENERATED_TOOL =
        /\b(?:FLUX|SDXL|SD\s?3|Stable\s?Diffusion|Midjourney|DALL-?E|Imagen|Ideogram|Recraft|Meshy|Tripo|Rodin|Hyper3D|Hunyuan|TRELLIS|Suno|ElevenLabs|Stable\s?Audio|ComfyUI|A1111|Recraft)\b|v?\d[\d.]*\s+[A-Za-z][\w.-]+/i;
      const generatedOk = norm === 'generated' && GENERATED_TOOL.test(sourceVal);
      if (norm !== 'css' && !LOCATOR.test(sourceVal) && !NAMED_INPUT.test(sourceVal) && !stockDeferred && !generatedOk) {
        failures.push(
          `${b.id}: Route "${norm}" needs a Source a reviewer can open — a path or URL, or the named ` +
            `deterministic input it is derived from. Prose like "derived at build time" is not a ` +
            `source; the work cannot be reproduced or its licence verified.`
        );
      }
    }

    const licence = fieldValue(b.body, 'Licence');
    if (licence && licence.length > 0 && !PLACEHOLDER_RE.test(licence)) {
      // The specific traps, named so the message teaches rather than nags.
      if (/cc0|apache|ofl|mit|public\s+domain/i.test(licence)) {
        // known-permissive, fine
      } else if (/cc[\s-]?by/i.test(licence) && !/attribution|credit|by\s/i.test(licence)) {
        failures.push(`${b.id}: CC-BY licence requires an explicit attribution note — state the credit line`);
      } else if (/free\s+tier|non[\s-]?commercial|no\s+commercial/i.test(licence) && !/not\s+(shipped|used)/i.test(licence)) {
        failures.push(
          `${b.id}: licence is non-commercial ("${licence}") — this asset cannot ship. ` +
            `Regenerate on a commercial tier or switch the model.`
        );
      } else if (/\b(tbd|unknown|check|verify)\b/i.test(licence)) {
        failures.push(`${b.id}: licence is unverified ("${licence}") — check the terms before generating, not after`);
      }
    }

    const prompt = fieldValue(b.body, 'Generation prompt');
    if (prompt && prompt.length > 0) {
      const hit = prompt.match(ARTIST_NAME_RE);
      if (hit) {
        failures.push(
          `${b.id}: generation prompt names an artist ("${hit[0]}") — services reject this and it is a ` +
            `rights problem. Describe musical attributes instead: tempo, meter, instrumentation, density, room.`
        );
      }
    }

    // Orphan check: a consumed-by pointing at a prompt the spec does not define.
    const consumed = fieldValue(b.body, 'Consumed by');
    if (consumed && specIds.size > 0) {
      const referenced = consumed.match(/MO-\d{2,}/g) || [];
      if (referenced.length === 0) {
        failures.push(`${b.id}: "Consumed by" names no MO-### — an asset nothing consumes is dead weight`);
      }
      for (const ref of referenced) {
        if (!specIds.has(ref)) {
          failures.push(`${b.id}: references ${ref}, which is not defined in motion-spec.md`);
        }
      }
    }
  }

  // Every prompt must SAY something about its assets — an AS-###, a repo path, or an explicit
  // "none". Measured: deleting the `Asset:` line entirely from a prompt passed both gates, so
  // the Phase 3 → Phase 3b chain could silently produce a manifest with an unconsumed asset.
  // Only under --require-assets: this gate is not even opened when assets are out of scope.
  if (requireAssets) {
    const heads = [];
    const re = /^#{2,4}\s*Motion Prompt:\s*(MO-\d{2,})\b[^\n]*$/gim;
    let m;
    while ((m = re.exec(specText)) !== null) heads.push({ id: m[1], start: m.index });
    for (let i = 0; i < heads.length; i++) {
      const start = heads[i].start;
      const afterHeading = specText.indexOf('\n', start) + 1;
      const rest = specText.slice(afterHeading);
      const next = rest.search(/^#{2,4}\s+\S/m);
      const end = next === -1 ? specText.length : afterHeading + next;
      const body = specText.slice(start, end);
      const declared = fieldValue(body, 'Asset');
      if (declared === null) {
        failures.push(
          `${heads[i].id}: has no "Asset:" line. State it as an AS-###, a repo path, or "none" — ` +
            `silence is read as "no asset" by a reader and as "undecided" by the manifest.`
        );
      }
    }
  }

  // An AS-### that no prompt actually declares is dead weight, and it is how a spec drifts from
  // its manifest. Measured: changing a prompt's `Asset:` from `AS-002` to `none` left AS-002
  // orphaned with no warning.
  //
  // The test must be "this prompt's OWN Asset field names this asset" — an earlier version
  // asked only whether the MO-### id appears anywhere in the file, which is always true and so
  // never fired.
  if (specText) {
    const declaredByPrompt = new Map(); // MO-### -> the Asset field value on its block
    const heads = [];
    const re = /^#{2,4}\s*Motion Prompt:\s*(MO-\d{2,})\b[^\n]*$/gim;
    let m;
    while ((m = re.exec(specText)) !== null) heads.push({ id: m[1], start: m.index });
    for (let i = 0; i < heads.length; i++) {
      const start = heads[i].start;
      const afterHeading = specText.indexOf('\n', start) + 1;
      const rest = specText.slice(afterHeading);
      const next = rest.search(/^#{2,4}\s+\S/m);
      const end = next === -1 ? specText.length : afterHeading + next;
      declaredByPrompt.set(heads[i].id, fieldValue(specText.slice(start, end), 'Asset') || '');
    }

    for (const b of blocks) {
      const refs = (fieldValue(b.body, 'Consumed by') || '').match(/MO-\d{2,}/g) || [];
      if (refs.length === 0) continue;
      const stillDeclared = refs.filter((r) =>
        new RegExp(`\\b${b.id}\\b`).test(declaredByPrompt.get(r) || '')
      );
      if (stillDeclared.length === 0) {
        const missing = refs.filter((r) => !declaredByPrompt.has(r));
        failures.push(
          `${b.id}: "Consumed by" names ${refs.join(', ')}, but none of them declares ${b.id} in its ` +
          `Asset field${missing.length ? ` (and ${missing.join(', ')} ${missing.length > 1 ? 'do' : 'does'} not exist in the spec)` : ''} — ` +
          `delete the asset or restore the reference.`
        );
      }
    }
  }

  // Reverse direction: a motion prompt declaring an external asset must be covered.
  const assetIds = new Set(blocks.map((b) => b.id));
  const covered = new Set();
  for (const b of blocks) {
    for (const ref of (fieldValue(b.body, 'Consumed by') || '').match(/MO-\d{2,}/g) || []) {
      covered.add(ref);
    }
  }
  if (specText) {
    // Split the spec into prompt blocks and look for an `Asset:` field on each.
    const heads = [];
    const re = /^#{2,4}\s*Motion Prompt:\s*(MO-\d{2,})\b[^\n]*$/gim;
    let m;
    while ((m = re.exec(specText)) !== null) heads.push({ id: m[1], start: m.index });
    for (let i = 0; i < heads.length; i++) {
      const start = heads[i].start;
      const afterHeading = specText.indexOf('\n', start) + 1;
      const rest = specText.slice(afterHeading);
      const next = rest.search(/^#{2,4}\s+\S/m);
      const end = next === -1 ? specText.length : afterHeading + next;
      const body = specText.slice(start, end);
      const declared = fieldValue(body, 'Asset');
      if (declared && declared.length > 0 && !/^(none|n\/?a|not applicable|-|—)\b/i.test(declared)) {
        // Two legitimate ways to satisfy an `Asset:` field: a direct path to a file in the
        // repo, or an AS-### reference that must actually exist.
        //
        // Note the reverse direction is NOT sufficient on its own: an asset whose
        // `Consumed by` names this MO-### only asserts a relationship, it does not resolve
        // what the prompt asked for. A prompt saying "a hero model, description to follow"
        // is still unresolved even if some asset claims to feed it.
        const direct = /[\w./-]+\.(glb|gltf|png|jpe?g|webp|avif|hdr|exr|svg|mp4|webm|wav|mp3|woff2?)\b/i.test(declared);
        const referenced = declared.match(/AS-\d{2,}/g) || [];
        // "No external asset" is a legitimate, frequently-correct answer. Accept every way a
        // person or agent naturally writes it — bare, backticked, quoted, with an article.
        //
        // Measured: only bare `none` passed. Backticked `` `none` `` and quoted `"none"` were
        // both rejected, and `motion-spec-template.md` printed `"none"` as its example value —
        // so the template shipped a string its own gate refused, and an agent that followed the
        // documentation literally lost a gate iteration discovering it.
        const noAsset = /^(?:["'`]?\s*)(?:none|n\/a|not\s+applicable|no\s+(?:external\s+)?assets?|nothing|—|-)(?:\s*["'`]?)$/i.test(declared.trim());

        if (referenced.length > 0) {
          for (const ref of referenced) {
            if (!assetIds.has(ref)) {
              failures.push(
                `${heads[i].id}: declares Asset ${ref}, which motion-assets.md does not define — ` +
                  `an unimplementable prompt`
              );
            }
          }
        } else if (direct) {
          // A repo file. Nothing to resolve against the manifest.
        } else if (noAsset) {
          // Explicitly no external asset.
        } else {
          // Prose — and a failure whether or not some AS-### claims this prompt.
          //
          // Measured: `**Asset:** generated card texture, not yet written` passed this gate
          // because AS-004 happened to list `Consumed by: MO-002`. That is the ASSET asserting a
          // relationship, not the PROMPT's need being resolved — the implementer still cannot
          // tell which bytes to load. An `Asset:` field must name an identifier (`AS-###`) or a
          // path (`src/hero.png`), never describe something that may or may not exist.
          // Describing is how an unfinished prompt reads as a finished one.
          failures.push(
            `${heads[i].id}: Asset "${declared}" describes an asset instead of naming one — ` +
              `reference an AS-### from motion-assets.md or a direct path. An AS-### listing this ` +
              `prompt under "Consumed by" does not resolve what the prompt asked for.`
          );
        }
      }
    }
  }
  void assetIds;

  return failures;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0] || 'check';
  if (cmd !== 'check') {
    console.error('Usage: node motion_assets_check.js check [--motion-spec P] [--assets P] [--root R] [--require-assets] [--json]');
    process.exit(2);
  }

  const root = args.root ? path.resolve(args.root) : process.cwd();
  const assetsPath = path.resolve(root, args.assets || DEFAULTS.assets);
  const specPath = path.resolve(root, args.motionSpec || DEFAULTS.motionSpec);

  if (!fs.existsSync(assetsPath)) {
    if (args.requireAssets) {
      const msg =
        `motion-assets.md is absent at ${assetsPath}, but this gate was invoked with --require-assets ` +
        `(the /motion Phase 3b gate). Reaching Phase 3b means assets are in scope, so an absent file is a ` +
        `missing deliverable, not an out-of-scope skip. Write it from ` +
        `.agents/templates/product/motion-assets-template.md and re-run.`;
      if (args.json) {
        console.log(JSON.stringify({ ok: false, skipped: false, required: true, reason: msg, assets: { path: assetsPath, found: false }, failures: [msg] }, null, 2));
      } else {
        console.error('✗ motion assets check FAILED — required assets manifest absent');
        console.error(`  ${msg}`);
      }
      process.exit(1);
    }
    if (args.json) {
      console.log(JSON.stringify({ ok: true, skipped: true, reason: 'motion-assets.md not present (no external assets in scope)', assets: { path: assetsPath, found: false } }, null, 2));
    } else {
      console.log('✓ motion assets check skipped — motion-assets.md not present (no external assets in scope)');
    }
    process.exit(0);
  }

  let assetsText;
  try {
    assetsText = read(assetsPath);
  } catch (e) {
    console.error(`motion_assets_check: cannot read ${assetsPath}: ${e.message}`);
    process.exit(2);
  }
  const specText = fs.existsSync(specPath) ? read(specPath) : '';

  const failures = checkMotionAssets(assetsText, specText, !!args.requireAssets);
  const ok = failures.length === 0;
  const result = {
    assets: { path: assetsPath, found: true, specFound: specText.length > 0 },
    failures,
  };

  if (args.json) {
    console.log(JSON.stringify({ ok, ...result }, null, 2));
  } else if (ok) {
    console.log('✓ motion assets: every asset has a route, source, licence, fallback, and a consuming MO-###');
  } else {
    console.error(`✗ motion assets check FAILED (${failures.length} issue${failures.length === 1 ? '' : 's'})`);
    console.error('  An MO-### pointing at a missing or unlicensed asset is an unimplementable prompt.');
    for (const msg of failures) console.error(`  - ${msg}`);
  }

  process.exit(ok ? 0 : 1);
}

main();