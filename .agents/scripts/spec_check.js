#!/usr/bin/env node
/**
 * spec_check.js — Validates all SKILL.md files under .agents/skills/
 * against the agentskills.io Agent Skills specification.
 *
 * Rules enforced (fail = exit 1):
 *   - Frontmatter delimiters present; body non-empty
 *   - Top-level keys limited to name, description, license, compatibility, metadata, allowed-tools
 *   - name == parent dir name, ^[a-z0-9]+(-[a-z0-9]+)*$, <= 64 chars
 *   - description 1-1024 chars, non-empty, single-line (no block scalars, no unquoted ': ')
 *   - compatibility 1-500 chars when present, single-line
 *   - allowed-tools is a space-separated string (YAML list form rejected)
 *   - metadata values are strings (nested maps/lists/block scalars rejected)
 *
 *
 * Body-structure channel (02s) — split by DECIDABILITY, not convenience:
 *
 *   Violations (exit 1) — machine-decidable facts. A script can settle these
 *   without reading meaning, so drift is never tolerated:
 *     - missing H1 title
 *     - phantom step link (SKILL.md cites steps/<x>.md that is not on disk)
 *     - unreachable step file (a steps/ file no citation path reaches)
 *     - stale harness-mirror reference (.opencode/skills/ — deleted in 02e)
 *     - phantom skill reference (Prev:/Next: names a skill or agent that does not exist)
 *     - unbalanced code fence
 *     - box-drawing glyph outside a fenced block (DNA 6)
 *     - metadata.last_updated missing
 *
 *   Warnings (exit 0) — prose shape. A human chose the wording; a gate would
 *   pass an empty-but-present section and block a well-written differently-
 *   phrased one, which is the fake gate DNA 3 forbids:
 *     - missing "## What this skill does"  (exempt when <!-- router-skill --> present)
 *     - missing "When to use" / "When to invoke" / "How to invoke"
 *     - router-skill missing "Halt conditions" or "Done when"
 *     - SKILL.md body > 500 lines
 *     - description < 40 chars
 *     - description carries no explicit trigger cue
 *
 * Zero dependencies, node-18 compatible, zero side effects (no file writes).
 * Uses an indent-aware scanner — NOT compile_skills.js's parser, which promotes
 * nested metadata keys to top level.
 */

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', 'skills');
const AGENTS_DIR = path.join(__dirname, '..', 'agents');
const ALLOWED_KEYS = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const BLOCK_SCALARS = new Set(['|', '>', '|-', '>-', '|+', '>+']);
const SCALAR_KEYS = ['description', 'compatibility', 'license', 'allowed-tools'];

// The marker must be a standalone comment on its own line. Matching a bare
// substring would false-positive on skills that *document* the marker (as
// create-skill and the router template both legitimately do).
const ROUTER_MARKER_RE = /^[ \t]*<!--\s*router-skill\s*-->[ \t]*$/m;
const ROUTER_MARKER = '<!-- router-skill -->';
const H1_RE = /^#\s+\S/m;
const FENCE_RE = /^\s*(`{3,}|~{3,})/;
// Box-drawing / block-element glyphs. Inside a fence they are legitimate
// wireframes, trees, or terminal simulations (DNA 6 permits those). Outside
// one they are a rendering leak.
const BOX_GLYPH_RE = /[─-╿▀-▟█░▓]/;
const WHEN_HEADING_RE = /^#{1,3}\s*(when to use|when to invoke|how to invoke|when to use this)/im;
const WHAT_HEADING_RE = /^#{1,3}\s*what this skill does/im;
const HALT_HEADING_RE = /^#{1,3}\s*halt conditions/im;
const DONE_HEADING_RE = /^#{1,3}\s*done when/im;
const TRIGGER_CUE_RE = /(\/[a-z][a-z-]+|use (this skill |it )?(when|for|if)|use whenever|trigger|when the user|whenever)/i;
// Prev:/Next: chain lines — the only place a skill names a sibling skill.
const CHAIN_LINE_RE = /^\s*[-*]?\s*(prev|next|previous skill|next skill)\s*:/i;
const BACKTICK_RE = /`([^`]+)`/g;

// Explicit allowlist: not a real dependency, not a real chain entry, not a
// path. Anything else backticked on a chain line must resolve.
const CHAIN_ALLOWLIST = new Set(['artifacts/', '.agents/', '—', '-', 'n/a']);

/** Every real skill folder name. */
function skillNames() {
  if (!fs.existsSync(SKILLS_DIR)) return new Set();
  return new Set(
    fs.readdirSync(SKILLS_DIR).filter((d) => fs.statSync(path.join(SKILLS_DIR, d)).isDirectory())
  );
}

/** Every real agent file stem. */
function agentNames() {
  if (!fs.existsSync(AGENTS_DIR)) return new Set();
  return new Set(
    fs.readdirSync(AGENTS_DIR)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace(/\.md$/, ''))
  );
}

/**
 * Walk fenced regions and report:
 *   - an unclosed fence
 *   - box-drawing glyphs that escaped a fence (line numbers)
 */
function scanFences(body) {
  const lines = body.split('\n');
  let open = null;
  const stray = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(FENCE_RE);
    if (m) {
      if (open === null) open = { char: m[1][0], len: m[1].length, line: i };
      else if (m[1][0] === open.char && m[1].length >= open.len) open = null;
      continue;
    }
    if (open === null && BOX_GLYPH_RE.test(lines[i])) stray.push(i + 1);
  }
  return { unclosed: open ? open.line + 1 : null, stray };
}

/**
 * Step-file reachability. A steps/ file is reachable when SKILL.md cites it,
 * or when a cited step file cites it (transitively). Returns
 * { phantom: [{file, line}], unreachable: [file] }.
 */
function scanStepLinks(skillDir, body) {
  const stepsDir = path.join(skillDir, 'steps');
  const phantom = [];
  if (!fs.existsSync(stepsDir)) return { phantom, unreachable: [] };

  const bodyLines = body.split('\n');
  const onDisk = new Set(fs.readdirSync(stepsDir).filter((f) => f.endsWith('.md')));

  // A skill may cite its own step file as `steps/step-01-x.md` or bare as
  // `step-01-x.md`; inside a skill folder both unambiguously mean steps/.
  // The prefix is optional in the match, not in the meaning.
  const CITE_RE = /(?:steps\/)?(step-[A-Za-z0-9.-]*\.md)/g;

  // Phantom: a step file cited from SKILL.md that is not on disk.
  const citedFromSkill = new Set();
  bodyLines.forEach((line, i) => {
    CITE_RE.lastIndex = 0;
    let m;
    while ((m = CITE_RE.exec(line)) !== null) {
      if (onDisk.has(m[1])) citedFromSkill.add(m[1]);
      else phantom.push({ file: m[1], line: i + 1 });
    }
  });

  // Reachability: walk forward from every directly-cited step file.
  const reached = new Set(citedFromSkill);
  const queue = [...citedFromSkill];
  while (queue.length > 0) {
    const current = queue.shift();
    let txt;
    try {
      txt = fs.readFileSync(path.join(stepsDir, current), 'utf8');
    } catch {
      continue;
    }
    CITE_RE.lastIndex = 0;
    let m;
    while ((m = CITE_RE.exec(txt)) !== null) {
      const next = m[1];
      if (onDisk.has(next) && !reached.has(next)) {
        reached.add(next);
        queue.push(next);
      }
    }
  }

  return { phantom, unreachable: [...onDisk].filter((f) => !reached.has(f)).sort() };
}

/** Backticked names on a Prev:/Next: chain line that resolve to nothing. */
function scanChainRefs(body) {
  const skills = skillNames();
  const agents = agentNames();
  const bad = [];
  body.split('\n').forEach((line, i) => {
    if (!CHAIN_LINE_RE.test(line)) return;
    BACKTICK_RE.lastIndex = 0;
    let m;
    while ((m = BACKTICK_RE.exec(line)) !== null) {
      const token = m[1].trim();
      if (!token || CHAIN_ALLOWLIST.has(token)) continue;
      if (token.startsWith('@')) {
        if (!agents.has(token.slice(1))) bad.push({ token, line: i + 1 });
        continue;
      }
      if (/[./]/.test(token)) continue; // a path, not a skill name
      if (!skills.has(token)) bad.push({ token, line: i + 1 });
    }
  });
  return bad;
}

function stripQuotes(val) {
  if (val.length >= 2) {
    const first = val[0];
    const last = val[val.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return val.slice(1, -1);
    }
  }
  return val;
}

function isQuoted(val) {
  if (val.length < 2) return false;
  const first = val[0];
  const last = val[val.length - 1];
  return (first === '"' && last === '"') || (first === "'" && last === "'");
}

/**
 * Parse frontmatter with indentation awareness.
 * Returns { data, errors, body, bodyLineCount }.
 */
function parseFrontmatter(content) {
  const errors = [];
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { errors: ['frontmatter delimiters (---) missing'], data: {}, body: content };

  const yamlStr = match[1];
  const body = content.substring(match[0].length);
  const bodyLines = body.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const data = {};
  const lines = yamlStr.split(/\r?\n/);
  let metadataOpen = false;
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    if (/^\s*$/.test(raw) || /^\s*#/.test(raw)) {
      i++;
      continue;
    }

    const trimmed = raw.trim();
    const isIndented = /^[ \t]/.test(raw);

    if (metadataOpen) {
      if (!isIndented) {
        metadataOpen = false; // fall through to top-level handling below
      } else {
        if (trimmed.startsWith('-')) {
          errors.push('metadata contains a list item (values must be strings)');
          i++;
          continue;
        }
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx === -1) {
          errors.push(`metadata entry is not "key: value" — "${trimmed}"`);
          i++;
          continue;
        }
        const mKey = trimmed.substring(0, colonIdx).trim();
        let mVal = trimmed.substring(colonIdx + 1).trim();
        if (!mVal) {
          errors.push(`metadata.${mKey} has no value (nested maps rejected; values must be strings)`);
          i++;
          continue;
        }
        if (BLOCK_SCALARS.has(mVal)) {
          errors.push(`metadata.${mKey} uses a block scalar (values must be single-line strings)`);
          i++;
          continue;
        }
        if (!isQuoted(mVal) && mVal.includes(': ')) {
          errors.push(`metadata.${mKey} contains unquoted ": " — quote the value`);
        }
        if (!data.metadata) data.metadata = {};
        data.metadata[mKey] = stripQuotes(mVal);
        i++;
        continue;
      }
    }

    // Top-level line
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) {
      errors.push(`unparseable frontmatter line "${trimmed}"`);
      i++;
      continue;
    }
    const key = trimmed.substring(0, colonIdx).trim();
    let val = trimmed.substring(colonIdx + 1).trim();

    if (key === 'metadata') {
      if (val && !BLOCK_SCALARS.has(val)) {
        errors.push('metadata must be a block of nested key/value entries');
      } else {
        metadataOpen = true;
      }
      i++;
      continue;
    }

    if (!val) {
      // Empty value: detect YAML list continuation
      const items = [];
      let j = i + 1;
      while (j < lines.length && /^[ \t]/.test(lines[j]) && lines[j].trim().startsWith('-')) {
        items.push(lines[j].trim());
        j++;
      }
      if (items.length > 0) {
        if (key === 'allowed-tools') {
          errors.push('allowed-tools uses YAML list form — must be a space-separated string');
        } else if (key === 'name' || key === 'description' || key === 'license' || key === 'compatibility') {
          errors.push(`${key} uses a multiline block — single-line value required`);
        }
        data[key] = items;
        i = j;
        continue;
      }
      if (key === 'allowed-tools') {
        errors.push('allowed-tools must be a non-empty space-separated string');
      } else if (key === 'name') {
        errors.push('name is empty');
      } else if (key === 'description') {
        errors.push('description is empty');
      } else if (key === 'compatibility') {
        errors.push('compatibility is empty (omit the key if not needed)');
      }
      data[key] = '';
      i++;
      continue;
    }

    if (BLOCK_SCALARS.has(val)) {
      errors.push(`${key} uses a block scalar (| or >) — single-line value required`);
      data[key] = '';
      i++;
      continue;
    }

    if (SCALAR_KEYS.includes(key) && !isQuoted(val) && val.includes(': ')) {
      errors.push(`${key} contains unquoted ": " — quote the value (YAML syntax bomb)`);
    }

    data[key] = stripQuotes(val);
    i++;
  }

  // allowed top-level keys
  for (const key of Object.keys(data)) {
    if (key !== 'allowed-tools' && !ALLOWED_KEYS.has(key)) {
      errors.push(`non-standard top-level key "${key}" — move into metadata: or remove`);
    }
  }

  return { data, errors, body, bodyLineCount: bodyLines.length };
}

function checkSkill(skillDir, report) {
  const dirName = path.basename(skillDir);
  const skillFile = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillFile)) {
    report.errors.push(`${dirName}: missing SKILL.md`);
    return;
  }

  const content = fs.readFileSync(skillFile, 'utf8');
  const { data, errors, body, bodyLineCount } = parseFrontmatter(content);
  const violations = errors.map((e) => `${dirName}: ${e}`);
  const warnings = [];

  // name rules
  if (!data.name) {
    violations.push(`${dirName}: name is required`);
  } else {
    if (data.name !== dirName) violations.push(`${dirName}: name "${data.name}" != dir name "${dirName}"`);
    if (!NAME_RE.test(data.name)) violations.push(`${dirName}: name "${data.name}" must match ^[a-z0-9]+(-[a-z0-9]+)*$`);
    if (data.name.length > 64) violations.push(`${dirName}: name exceeds 64 chars`);
  }

  // description rules
  if (data.description === undefined) {
    violations.push(`${dirName}: description is required`);
  } else if (typeof data.description === 'string') {
    const len = data.description.length;
    if (len < 1) violations.push(`${dirName}: description must be non-empty`);
    if (len > 1024) violations.push(`${dirName}: description exceeds 1024 chars (${len})`);
    if (len < 40) warnings.push(`${dirName}: description is short (${len} chars)`);
  }

  // compatibility rules
  if (typeof data.compatibility === 'string' && data.compatibility.length > 0) {
    if (data.compatibility.length > 500) {
      violations.push(`${dirName}: compatibility exceeds 500 chars (${data.compatibility.length})`);
    }
  }

  // metadata rules
  if (data.metadata !== undefined) {
    if (Array.isArray(data.metadata) || typeof data.metadata !== 'object') {
      violations.push(`${dirName}: metadata must be a map of string keys to string values`);
    } else {
      for (const [mKey, mVal] of Object.entries(data.metadata)) {
        if (typeof mVal !== 'string') {
          violations.push(`${dirName}: metadata.${mKey} is not a string value`);
        }
      }
    }
  }

  // body size warning
  if (bodyLineCount > 500) warnings.push(`${dirName}: SKILL.md body is ${bodyLineCount} lines (> 500 recommended)`);

  report.errors.push(...violations);
  report.warnings.push(...warnings);
  checkBodyStructure(skillDir, dirName, data, body, report);
}

/**
 * 02s body-structure channel. Violations are machine-decidable facts; warnings
 * are prose shape. See the header block for the taxonomy and its rationale.
 */
function checkBodyStructure(skillDir, dirName, data, body, report) {
  const isRouter = ROUTER_MARKER_RE.test(body);

  // --- violations (exit 1) ---

  if (!H1_RE.test(body)) {
    report.errors.push(`${dirName}: missing H1 title — body must open with "# <Title>"`);
  }

  body.split('\n').forEach((line, i) => {
    if (/\.opencode\/skills\//.test(line)) {
      report.errors.push(
        `${dirName}:${i + 1}: stale harness-mirror reference ".opencode/skills/" — that tree was removed in 02e; edit .agents/skills/<name>/ only`
      );
    }
  });

  const { phantom, unreachable } = scanStepLinks(skillDir, body);
  for (const p of phantom) {
    report.errors.push(`${dirName}:${p.line}: phantom step link — steps/${p.file} is cited but not on disk`);
  }
  for (const u of unreachable) {
    report.errors.push(
      `${dirName}: unreachable step file steps/${u} — no citation path from SKILL.md reaches it; link it or delete it`
    );
  }

  for (const bad of scanChainRefs(body)) {
    report.errors.push(
      `${dirName}:${bad.line}: phantom skill reference "${bad.token}" — no such skill or agent`
    );
  }

  const { unclosed, stray } = scanFences(body);
  if (unclosed !== null) {
    report.errors.push(`${dirName}: unbalanced code fence — opened at line ${unclosed}, never closed`);
  }
  for (const lineNo of stray) {
    report.errors.push(
      `${dirName}:${lineNo}: box-drawing glyph outside a fenced block — DNA 6 wants a Markdown table or Mermaid diagram`
    );
  }

  if (data.metadata === undefined || typeof data.metadata !== 'object' || Array.isArray(data.metadata)) {
    report.errors.push(`${dirName}: metadata block missing — expected metadata: with version and last_updated`);
  } else if (data.metadata.last_updated === undefined || data.metadata.last_updated === '') {
    report.errors.push(`${dirName}: metadata.last_updated missing — record the date this skill was last revised`);
  }

  // --- warnings (exit 0) ---

  if (!isRouter && !WHAT_HEADING_RE.test(body)) {
    report.warnings.push(
      `${dirName}: no "## What this skill does" section (router-marked skills are exempt; add the ${ROUTER_MARKER} marker if this is one)`
    );
  }
  if (!WHEN_HEADING_RE.test(body)) {
    report.warnings.push(`${dirName}: no "When to use" / "When to invoke" / "How to invoke" section`);
  }
  if (isRouter) {
    if (!HALT_HEADING_RE.test(body)) {
      report.warnings.push(`${dirName}: router-skill has no "Halt conditions" section`);
    }
    if (!DONE_HEADING_RE.test(body)) {
      report.warnings.push(`${dirName}: router-skill has no "Done when" section`);
    }
  }
  if (typeof data.description === 'string' && !TRIGGER_CUE_RE.test(data.description)) {
    report.warnings.push(
      `${dirName}: description carries no explicit trigger cue — add a slash command or "use when …" so the router does not undertrigger`
    );
  }
}

function main() {
  if (process.argv.includes('--self-test')) {
    runSelfTest();
    return;
  }

  if (!fs.existsSync(SKILLS_DIR)) {
    console.error(`Skills directory not found: ${SKILLS_DIR}`);
    process.exit(1);
  }

  const report = { errors: [], warnings: [] };
  for (const item of fs.readdirSync(SKILLS_DIR).sort()) {
    const skillPath = path.join(SKILLS_DIR, item);
    if (!fs.statSync(skillPath).isDirectory()) continue;
    checkSkill(skillPath, report);
  }

  for (const w of report.warnings) console.log(`  ⚠ ${w}`);
  if (report.errors.length > 0) {
    for (const e of report.errors) console.error(`  ✗ ${e}`);
    console.error(`\n${report.errors.length} violation(s) across ${report.warnings.length} warning(s).`);
    process.exit(1);
  }
  console.log(`✓ All ${fs.readdirSync(SKILLS_DIR).filter((d) => fs.statSync(path.join(SKILLS_DIR, d)).isDirectory()).length} skills pass agentskills.io spec checks.`);
  if (report.warnings.length > 0) console.log(`  (${report.warnings.length} warning(s) — see above)`);
}

function runSelfTest() {
  const cases = [
    {
      name: 'grill-me (migrated) passes',
      content: '---\nname: grill-me\ndescription: Runs a 7+1-branch Socratic decision tree that stress-tests requirements one assumption at a time. Use when you want to be grilled.\nmetadata:\n  version: "2.0"\n  last_updated: "2026-07-10"\n---\n\n# Body\n',
      minErrors: 0,
    },
    {
      name: 'nested map under metadata fails',
      content: '---\nname: test\ndescription: A sufficiently long description that passes the length check.\nmetadata:\n  nested:\n    deep: value\n---\n',
      minErrors: 1,
    },
    {
      name: 'list under metadata fails',
      content: '---\nname: test\ndescription: A sufficiently long description that passes the length check.\nmetadata:\n  capabilities:\n    - one\n    - two\n---\n',
      minErrors: 1,
    },
    {
      name: 'block scalar description fails',
      content: '---\nname: test\ndescription: |\n  folded text\n---\n',
      minErrors: 1,
    },
    {
      name: 'allowed-tools list form fails',
      content: '---\nname: test\ndescription: A sufficiently long description that passes the length check.\nallowed-tools:\n  - Read\n  - Write\n---\n',
      minErrors: 1,
    },
    {
      name: 'unquoted colon fails',
      content: '---\nname: test\ndescription: Contains patterns including: a colon sequence and is long enough.\n---\n',
      minErrors: 1,
    },
    {
      name: 'non-standard top-level key fails',
      content: '---\nname: test\ndescription: A sufficiently long description that passes the length check.\nversion: "1.0"\n---\n',
      minErrors: 1,
    },
  ];

  let failed = 0;
  for (const c of cases) {
    const { errors } = parseFrontmatter(c.content);
    const total = errors.length;
    if (total >= c.minErrors) {
      console.log(`  ✓ ${c.name}`);
    } else {
      console.error(`  ✗ ${c.name} — expected >= ${c.minErrors} error(s), got ${total}`);
      failed++;
    }
  }
  console.log(failed === 0 ? 'Self-test passed.' : `Self-test FAILED (${failed} case(s)).`);
  if (failed === 0) runStructureSelfTest();
  process.exit(failed === 0 ? 0 : 1);
}

/**
 * 02s body-structure self-test. Each case builds a throwaway skill tree in a
 * temp dir and asserts the exact rule fires (or stays silent). Every one of the
 * 8 violations and 6 warnings is covered.
 */
function runStructureSelfTest() {
  const os = require('os');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-check-selftest-'));
  // Frontmatter `name` must equal the folder name, so each fixture's name is
  // bound to the directory it is written into.
  let currentDirName = 'fixture';
  const FM = (extra = '') =>
    `---\nname: ${currentDirName}\ndescription: Does a specific thing for a specific audience with measurable output. Use when the user asks for it.\nmetadata:\n  version: "1.0"\n  last_updated: "2026-09-30"\n${extra}---\n\n`;

  const cases = [
    {
      name: 'missing H1 is a violation',
      build: (d) => fs.writeFileSync(path.join(d, 'SKILL.md'), FM('a') + '## When to use\n- x\n'),
      expect: (r) => r.errors.some((e) => /missing H1 title/.test(e)),
    },
    {
      name: 'present H1 passes',
      build: (d) => fs.writeFileSync(path.join(d, 'SKILL.md'), FM('a') + '# A\n\n## When to use\n- x\n'),
      expect: (r) => !r.errors.some((e) => /missing H1 title/.test(e)),
    },
    {
      name: 'phantom step link is a violation',
      build: (d) => {
        fs.mkdirSync(path.join(d, 'steps'));
        fs.writeFileSync(path.join(d, 'steps', 'step-01-real.md'), '# 1\n');
        fs.writeFileSync(path.join(d, 'SKILL.md'), FM('a') + '# A\n\n1. -> `steps/step-01-real.md`\n2. -> `steps/step-99-ghost.md`\n');
      },
      expect: (r) => r.errors.some((e) => /phantom step link.*step-99-ghost/.test(e)),
    },
    {
      name: 'unreachable step file is a violation',
      build: (d) => {
        fs.mkdirSync(path.join(d, 'steps'));
        fs.writeFileSync(path.join(d, 'steps', 'step-01-a.md'), '# 1\n');
        fs.writeFileSync(path.join(d, 'steps', 'step-02-orphan.md'), '# 2\n');
        fs.writeFileSync(path.join(d, 'SKILL.md'), FM('a') + '# A\n\n1. -> `steps/step-01-a.md`\n');
      },
      expect: (r) => r.errors.some((e) => /unreachable step file steps\/step-02-orphan/.test(e)),
    },
    {
      name: 'transitively reachable step file is NOT flagged',
      build: (d) => {
        fs.mkdirSync(path.join(d, 'steps'));
        fs.writeFileSync(path.join(d, 'steps', 'step-01-a.md'), 'next: steps/step-02-b.md\n');
        fs.writeFileSync(path.join(d, 'steps', 'step-02-b.md'), '# 2\n');
        fs.writeFileSync(path.join(d, 'SKILL.md'), FM('a') + '# A\n\n1. -> `steps/step-01-a.md`\n');
      },
      expect: (r) => !r.errors.some((e) => /unreachable step file/.test(e)),
    },
    {
      name: 'bare step-file citation (no steps/ prefix) counts as reachable',
      build: (d) => {
        fs.mkdirSync(path.join(d, 'steps'));
        fs.writeFileSync(path.join(d, 'steps', 'step-04a-syllabus.md'), '# 4a\n');
        fs.writeFileSync(path.join(d, 'SKILL.md'), FM() + '# A\n\n1. **Syllabus**: `step-04a-syllabus.md`\n');
      },
      expect: (r) => !r.errors.some((e) => /unreachable step file|phantom step link/.test(e)),
    },
    {
      name: 'stale .opencode mirror reference is a violation',
      build: (d) => fs.writeFileSync(path.join(d, 'SKILL.md'), FM('a') + '# A\n\nMirror at `.opencode/skills/a/`.\n'),
      expect: (r) => r.errors.some((e) => /stale harness-mirror reference/.test(e)),
    },
    {
      name: 'phantom skill reference on a chain line is a violation',
      build: (d) => fs.writeFileSync(path.join(d, 'SKILL.md'), FM('a') + '# A\n\n## Skill chain\n- Prev: `nonexistent-skill`\n'),
      expect: (r) => r.errors.some((e) => /phantom skill reference "nonexistent-skill"/.test(e)),
    },
    {
      name: 'real skill reference on a chain line passes',
      build: (d) => fs.writeFileSync(path.join(d, 'SKILL.md'), FM('a') + '# A\n\n## Skill chain\n- Prev: `grill-me`\n- Next: `design`\n'),
      expect: (r) => !r.errors.some((e) => /phantom skill reference/.test(e)),
    },
    {
      name: 'unbalanced code fence is a violation',
      build: (d) => fs.writeFileSync(path.join(d, 'SKILL.md'), FM('a') + '# A\n\n```bash\nnode x.js\n'),
      expect: (r) => r.errors.some((e) => /unbalanced code fence/.test(e)),
    },
    {
      name: 'box glyph inside a fence is allowed',
      build: (d) => fs.writeFileSync(path.join(d, 'SKILL.md'), FM('a') + '# A\n\n```\n┌───┐\n└───┘\n```\n'),
      expect: (r) => !r.errors.some((e) => /box-drawing glyph outside/.test(e)),
    },
    {
      name: 'box glyph outside a fence is a violation',
      build: (d) => fs.writeFileSync(path.join(d, 'SKILL.md'), FM('a') + '# A\n\n```\nok\n```\n\n┌───┐\n'),
      expect: (r) => r.errors.some((e) => /box-drawing glyph outside/.test(e)),
    },
    {
      name: 'missing metadata.last_updated is a violation',
      build: (d) =>
        fs.writeFileSync(
          path.join(d, 'SKILL.md'),
          `---\nname: ${currentDirName}\ndescription: Does a specific thing for a specific audience with measurable output. Use when the user asks for it.\nmetadata:\n  version: "1.0"\n---\n\n# A\n`
        ),
      expect: (r) => r.errors.some((e) => /metadata\.last_updated missing/.test(e)),
    },
    {
      name: 'router marker exempts the "What this skill does" warning',
      build: (d) => fs.writeFileSync(path.join(d, 'SKILL.md'), FM('a') + '<!-- router-skill -->\n\n# A\n\n## When to invoke\n- x\n\n## Halt conditions\n- y\n\n## Done when\n- z\n'),
      expect: (r) => !r.warnings.some((w) => /What this skill does/.test(w)),
    },
    {
      name: 'a skill DOCUMENTING the marker is not treated as a router',
      build: (d) =>
        fs.writeFileSync(
          path.join(d, 'SKILL.md'),
          FM('a') +
            '# A\n\n## What this skill does\n- x\n\n## When to use\n- y\n\nAdd the `<!-- router-skill -->` marker under your H1.\n'
        ),
      expect: (r) => !r.warnings.some((w) => /router-skill has no/.test(w)),
    },
    {
      name: 'router marker still requires Halt conditions and Done when',
      build: (d) => fs.writeFileSync(path.join(d, 'SKILL.md'), FM('a') + '<!-- router-skill -->\n\n# A\n\n## When to invoke\n- x\n'),
      expect: (r) => r.warnings.some((w) => /router-skill has no "Halt conditions"/.test(w)) && r.warnings.some((w) => /router-skill has no "Done when"/.test(w)),
    },
    {
      name: 'missing "When to use" is a warning, not a violation',
      build: (d) => fs.writeFileSync(path.join(d, 'SKILL.md'), FM('a') + '# A\n\n## What this skill does\n- x\n'),
      expect: (r) => r.warnings.some((w) => /no "When to use"/.test(w)) && !r.errors.some((e) => /When to use/.test(e)),
    },
    {
      name: 'description without a trigger cue warns',
      build: (d) =>
        fs.writeFileSync(
          path.join(d, 'SKILL.md'),
          `---\nname: ${currentDirName}\ndescription: Compiles discovery outputs into one unified research report for stakeholders.\nmetadata:\n  version: "1.0"\n  last_updated: "2026-09-30"\n---\n\n# A\n\n## What this skill does\n- x\n\n## When to use\n- y\n`
        ),
      expect: (r) => r.warnings.some((w) => /no explicit trigger cue/.test(w)),
    },
    {
      name: 'description with a slash command does not warn',
      build: (d) => fs.writeFileSync(path.join(d, 'SKILL.md'), FM('a') + '# A\n\n## What this skill does\n- x\n\n## When to use\n- y\n'),
      expect: (r) => !r.warnings.some((w) => /no explicit trigger cue/.test(w)),
    },
    {
      name: 'a clean skill produces zero errors and zero warnings',
      dirName: 'clean-skill',
      build: (d) =>
        fs.writeFileSync(
          path.join(d, 'SKILL.md'),
          FM() + '# A\n\n## What this skill does\n- x\n\n## When to use\n- y\n\n## Output Artifacts\n- z\n'
        ),
      expect: (r) => r.errors.length === 0 && r.warnings.length === 0,
    },
  ];

  let failed = 0;
  for (const c of cases) {
    const dirName = c.dirName || c.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40);
    const dir = path.join(root, dirName);
    fs.mkdirSync(dir, { recursive: true });
    currentDirName = dirName;
    c.build(dir);
    const report = { errors: [], warnings: [] };
    checkSkill(dir, report);
    if (c.expect(report)) {
      console.log(`  ✓ ${c.name}`);
    } else {
      console.error(`  ✗ ${c.name} — errors=[${report.errors.join(' | ')}] warnings=[${report.warnings.join(' | ')}]`);
      failed++;
    }
  }
  fs.rmSync(root, { recursive: true, force: true });
  console.log(failed === 0 ? 'Structure self-test passed.' : `Structure self-test FAILED (${failed} case(s)).`);
  if (failed > 0) process.exit(1);
}

if (require.main === module) main();
module.exports = { parseFrontmatter, checkSkill };
