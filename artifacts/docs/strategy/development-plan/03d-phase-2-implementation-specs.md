# Implementation Specs — JS Code Reference

> **Source:** Extracted from `2. vespyr_evolution_plan.md` (superseded), with the T8 runtime contract added from `08-cross-cutting-utter-satisfaction-dna.md`. This file is the canonical home for implementation code. Phase files reference this by section number.
> **Rule:** When implementing a script, copy the code from here. When updating a script, update it here first, then update the phase file's checklist.

---

## §1 — sync-entry-points.js (Phase 0, F0.4, ~80 lines)

**Path:** `.agents/scripts/sync-entry-points.js`
**Purpose:** Reads `.agents/templates/system/AGENTS.md.canonical`, replaces harness dotfolder references per target, writes to `AGENTS.md`, `agent.md`, `CLAUDE.md`, and per-harness `AGENTS.md`.

**Spec (no full code in source — implement from this spec):**

```javascript
#!/usr/bin/env node
// sync-entry-points.js — generate per-harness entry-point files from canonical source
// Usage: node .agents/scripts/sync-entry-points.js

const fs = require('fs');
const path = require('path');

const CANONICAL = path.join(__dirname, '..', '..', '.agents', 'agent.md.canonical');
const TARGETS = [
  { file: 'AGENTS.md', dotfolder: '.agents' },
  { file: 'agent.md', dotfolder: '.opencode' },
  { file: 'CLAUDE.md', dotfolder: '.claude' },
  // Add per-harness targets as needed: .kiro/, .cursor/, etc.
];

function sync() {
  if (!fs.existsSync(CANONICAL)) {
    console.error(`[ERROR] canonical file not found: ${CANONICAL}`);
    process.exit(1);
  }
  const source = fs.readFileSync(CANONICAL, 'utf8');
  const root = path.join(__dirname, '..', '..');
  for (const target of TARGETS) {
    const outPath = path.join(root, target.file);
    const content = source.replace(/\.agents\//g, `${target.dotfolder}/`);
    // Validate non-empty and contains canonical sections
    if (!content || !content.includes('# Vespyr')) {
      console.error(`[ERROR] ${target.file}: generated content is empty or missing canonical sections`);
      continue;
    }
    fs.writeFileSync(outPath, content);
    console.log(`[OK] ${target.file} (${target.dotfolder})`);
  }
}

sync();
```

---

## §2 — validate_frontmatter.js (Phase 0, F0.10, ~120 lines)

**Path:** `.agents/scripts/validate_frontmatter.js`
**Purpose:** Enforces v2 frontmatter schema on all 21 agent files. Exit 0 if all pass, exit 1 with file list if any fail.

**Spec:**

```javascript
#!/usr/bin/env node
// validate_frontmatter.js — enforce v2 agent frontmatter schema
// Usage: node .agents/scripts/validate_frontmatter.js
// Requires: npm install js-yaml

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const AGENTS_DIR = path.join(__dirname, '..', 'agents');
const REQUIRED = ['name', 'icon', 'description', 'version', 'human_name', 'mode', 'permission', 'capabilities', 'default_squad', 'origin', 'channeled_mentor'];
const SQUADS = ['full-team', 'startup', 'build', 'research', 'design', 'ship', 'game-studio'];

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  try { return yaml.load(match[1]); }
  catch { return null; }
}

const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));
let errors = 0;

for (const file of files) {
  const content = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8');
  const fm = parseFrontmatter(content);
  if (!fm) { console.log(`[FAIL] ${file}: no frontmatter`); errors++; continue; }
  
  for (const field of REQUIRED) {
    if (!fm[field]) { console.log(`[FAIL] ${file}: missing ${field}`); errors++; }
  }
  
  // name matches filename
  const expectedName = file.replace('.md', '');
  if (fm.name && fm.name !== expectedName) { console.log(`[FAIL] ${file}: name "${fm.name}" != filename`); errors++; }
  
  // icon is single emoji
  if (fm.icon && fm.icon.length > 4) { console.log(`[FAIL] ${file}: icon too long`); errors++; }
  
  // default_squad is known
  if (fm.default_squad && !SQUADS.includes(fm.default_squad)) { console.log(`[FAIL] ${file}: unknown squad "${fm.default_squad}"`); errors++; }
  
  // origin is core or module:<name>
  if (fm.origin && fm.origin !== 'core' && !fm.origin.startsWith('module:')) { console.log(`[FAIL] ${file}: invalid origin "${fm.origin}"`); errors++; }
  
  // T7.3: Socratic Stance section (warn, don't fail)
  if (!fm.mode || fm.mode === 'subagent') {
    if (!content.includes('## Socratic Stance')) { console.log(`[WARN] ${file}: missing ## Socratic Stance section`); }
  }
  
  // IDENTITY block
  if (!content.includes('<!-- IDENTITY: do not edit')) { console.log(`[FAIL] ${file}: missing IDENTITY block`); errors++; }
}

if (errors > 0) { console.log(`\n${errors} error(s).`); process.exit(1); }
console.log(`\n[OK] All ${files.length} agents pass v2 frontmatter validation.`);
```

---

## §3 — merge_customization.js (Phase 0, F0.20, ~80 lines)

**Path:** `.agents/scripts/merge_customization.js`
**Purpose:** 2-file TOML merge (defaults + project override). Scalars override-wins, tables deep-merge, arrays of tables with code/id keyed-merge, other arrays append.

**Merge rules (from Adoption §3.3):**

| Type | Rule |
|---|---|
| Scalars | override wins |
| Tables | deep merge |
| Arrays of tables where every item has `code` OR `id` | keyed merge (matching replace, new append) |
| All other arrays | append |

```javascript
#!/usr/bin/env node
// merge_customization.js — 2-file TOML merge for agent customization
// Usage: node .agents/scripts/merge_customization.js <agent-name>
//        node .agents/scripts/merge_customization.js developer
// Requires: npm install @iarna/toml

const fs = require('fs');
const path = require('path');
const TOML = require('@iarna/toml');

const AGENTS_DIR = path.join(__dirname, '..', 'agents');
const CUSTOM_DIR = path.join(__dirname, '..', 'custom');

// Deep merge: scalars override-wins, tables deep-merge, arrays of tables keyed-merge, other arrays append
function deepMerge(defaults, override) {
  const result = { ...defaults };
  for (const key of Object.keys(override)) {
    const dv = defaults[key];
    const ov = override[key];
    if (dv === undefined) { result[key] = ov; continue; }
    if (Array.isArray(dv) && Array.isArray(ov)) {
      // Check if items have 'code' or 'id' for keyed merge
      const hasKey = dv.every(item => item && (item.code || item.id));
      if (hasKey) {
        // Keyed merge: matching replace, new append
        const merged = [...dv];
        for (const newItem of ov) {
          const matchIdx = merged.findIndex(old => (old.code && old.code === newItem.code) || (old.id && old.id === newItem.id));
          if (matchIdx >= 0) merged[matchIdx] = deepMerge(merged[matchIdx], newItem);
          else merged.push(newItem);
        }
        result[key] = merged;
      } else {
        // Append
        result[key] = [...dv, ...ov];
      }
    } else if (typeof dv === 'object' && typeof ov === 'object' && dv !== null && ov !== null) {
      result[key] = deepMerge(dv, ov);
    } else {
      // Scalar: override wins
      result[key] = ov;
    }
  }
  return result;
}

// Main
const agentName = process.argv[2];
if (!agentName) { console.error('Usage: merge_customization.js <agent-name>'); process.exit(1); }

const defaultsPath = path.join(AGENTS_DIR, agentName, 'customize.toml');
const overridePath = path.join(CUSTOM_DIR, `${agentName}.toml`);

let defaults = {};
let override = {};

if (fs.existsSync(defaultsPath)) {
  defaults = TOML.parse(fs.readFileSync(defaultsPath, 'utf8'));
}
if (fs.existsSync(overridePath)) {
  override = TOML.parse(fs.readFileSync(overridePath, 'utf8'));
}

if (!fs.existsSync(defaultsPath) && !fs.existsSync(overridePath)) {
  console.error(`[ERROR] no customization files found for agent: ${agentName}`);
  process.exit(1);
}

const merged = deepMerge(defaults, override);
console.log(JSON.stringify(merged, null, 2));
```

---

## §4 — Memory filter prefetch extension (Phase 0, T7.2, ~80 lines)

**Path:** Update to `.agents/scripts/memory_filter.js`
**Purpose:** Add `--prefetch-patterns` flag that returns matching patterns from `patterns-and-conventions.md` before the full 3-tier load. This is the T7.2 differentiator: the memory system proactively surfaces relevant patterns based on the current agent + phase, rather than waiting for the agent to search.

```javascript
#!/usr/bin/env node
// memory_filter_prefetch.js — prefetch relevant patterns before full 3-tier load
// Usage: node .agents/scripts/memory_filter.js --prefetch-patterns --agent=developer --phase=execution
//        (intended to be called by memory-controller Step 0.3 before the full load)

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, '..', '..', 'artifacts', 'memory');
const PATTERNS_FILE = path.join(MEMORY_DIR, 'patterns-and-conventions.md');

function prefetchPatterns(agent, phase) {
  if (!fs.existsSync(PATTERNS_FILE)) {
    console.log('[PREFETCH] no patterns file');
    return;
  }
  const content = fs.readFileSync(PATTERNS_FILE, 'utf8');
  // Split on ### headers to get individual entries
  const entries = content.split(/^###\s+/m).filter(s => s.trim());
  // Filter for entries tagged with this agent or this phase
  const matched = entries.filter(e => {
    const lower = e.toLowerCase();
    return lower.includes(`[agent: @${agent}]`) ||
           lower.includes(`[agent: ${agent}]`) ||
           lower.includes(`[phase: ${phase}]`);
  }).slice(0, 5); // top 5 matching patterns

  if (matched.length === 0) {
    console.log('[PREFETCH] no matching patterns');
    return;
  }
  console.log('[PREFETCH — top 5 patterns for ' + agent + ' / ' + phase + ']');
  for (const entry of matched) {
    // Extract just the title line + first 2 lines of content
    const lines = entry.split('\n').filter(l => l.trim());
    const title = lines[0] || '(untitled)';
    const detail = lines.slice(1, 3).join(' ');
    console.log(`- ${title}`);
    if (detail) console.log(`  ${detail.substring(0, 120)}${detail.length > 120 ? '...' : ''}`);
  }
}

// Parse args
const args = process.argv.slice(2);
const agentArg = args.find(a => a.startsWith('--agent='));
const phaseArg = args.find(a => a.startsWith('--phase='));
const prefetchFlag = args.includes('--prefetch-patterns');

if (prefetchFlag && agentArg && phaseArg) {
  const agent = agentArg.split('=')[1];
  const phase = phaseArg.split('=')[1];
  prefetchPatterns(agent, phase);
} else if (args.length === 0) {
  console.log('Usage: memory_filter.js --prefetch-patterns --agent=<name> --phase=<phase>');
  console.log('       (or the normal 3-tier load — see existing memory_filter.js for that mode)');
} else {
  // Fall through to existing memory_filter.js logic for normal load
  // (This file is an ADDITION to memory_filter.js, not a replacement.
  //  In practice, merge this prefetch function into the existing memory_filter.js
  //  and add the --prefetch-patterns flag handling at the top of the arg parser.)
}
```

---

## §5 — auto_graph.js (Phase 3, F3.1, ~140 lines)

**Path:** `.agents/scripts/auto_graph.js`
**Usage:** `node .agents/scripts/auto_graph.js check` | `build [code|doc|both]` | `status`

```javascript
#!/usr/bin/env node
// auto_graph.js — automatic graph generation at lifecycle moments
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const STATE_FILE = path.join(__dirname, '..', 'state', 'graph-last-built.json');
const CODE_GRAPH = path.join(__dirname, '..', '..', 'artifacts', 'memory', 'structural', 'code-graph.json');
const DOC_GRAPH  = path.join(__dirname, '..', '..', 'artifacts', 'memory', 'structural', 'doc-graph.json');
const SCRIPT_DIR = __dirname;
const WATCH_DIRS = [
  path.join(__dirname, '..', '..', 'src'),
  path.join(__dirname, '..', '..', 'artifacts', 'output'),
];

function readState() {
  if (!fs.existsSync(STATE_FILE)) return { code: null, doc: null };
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { code: null, doc: null }; }
}

function writeState(s) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

function newestMtime(dirs) {
  let max = 0;
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const stack = [dir];
    while (stack.length) {
      const cur = stack.pop();
      for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
        const full = path.join(cur, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else if (entry.isFile()) max = Math.max(max, fs.statSync(full).mtimeMs);
      }
    }
  }
  return max;
}

function isStale(graphFile) {
  if (!fs.existsSync(graphFile)) return true;
  return newestMtime(WATCH_DIRS) > fs.statSync(graphFile).mtimeMs;
}

function build(target) {
  const ensure = path.join(SCRIPT_DIR, 'ensure_graph.js');
  if (target === 'code' || target === 'both') {
    execFileSync('node', [ensure, 'code'], { stdio: 'inherit' });
  }
  if (target === 'doc' || target === 'both') {
    execFileSync('node', [ensure, 'doc'], { stdio: 'inherit' });
  }
  const s = readState();
  if (target === 'code' || target === 'both') s.code = Date.now();
  if (target === 'doc'  || target === 'both') s.doc  = Date.now();
  writeState(s);
}

function check() {
  const c = isStale(CODE_GRAPH), d = isStale(DOC_GRAPH);
  if (c && d) { console.log('[STALE] both'); process.exit(0); }
  if (c)     { console.log('[STALE] code'); process.exit(0); }
  if (d)     { console.log('[STALE] doc');  process.exit(0); }
  console.log('[OK] both');
}

const [, , cmd, target] = process.argv;
switch (cmd) {
  case 'check':  check(); break;
  case 'build':  build(target || 'both'); break;
  case 'status':
    const s = readState();
    console.log(`code-graph: ${s.code ? new Date(s.code).toISOString() : 'never'}`);
    console.log(`doc-graph:  ${s.doc  ? new Date(s.doc ).toISOString() : 'never'}`);
    break;
  default: console.log('Usage: auto_graph.js {check|build [code|doc|both]|status}');
}
```

---

## §6 — graph_query.js (Phase 3, F3.6, ~220 lines)

**Path:** `.agents/scripts/graph_query.js`
**Usage:** `node .agents/scripts/graph_query.js code blast-radius <file>` | `code dependents <file>` | `code dependencies <file> [--depth N]` | `code summary` | `code unreachable` | `doc trace <doc-path>` | `doc story-impl <story-id>` | `doc adr-constrains <module>` | `doc orphans`

```javascript
#!/usr/bin/env node
// graph_query.js — typed query API for code-graph + doc-graph
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CODE_GRAPH = path.join(process.cwd(), 'artifacts', 'memory', 'structural', 'code-graph.json');
const DOC_GRAPH  = path.join(process.cwd(), 'artifacts', 'memory', 'structural', 'doc-graph.json');
const WRAPPER    = path.join(__dirname, 'ensure_graph.js');

function ensureCode() { execFileSync('node', [WRAPPER, 'code'], { stdio: 'pipe' }); }
function ensureDoc()  { execFileSync('node', [WRAPPER, 'doc'],  { stdio: 'pipe' }); }
function loadJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function findFile(graph, target) {
  const norm = (s) => s.replace(/^\.\//, '').replace(/^src\//, '');
  const t = norm(target);
  return graph.files.find(f => norm(f.path) === t || f.path.endsWith(t));
}

function codeBlastRadius(target) {
  ensureCode();
  const g = loadJSON(CODE_GRAPH);
  const f = findFile(g, target);
  if (!f) return { error: `file not in graph: ${target}` };
  return { file: f.path, imports: f.imports, imported_by: f.imported_by, blast_size: f.imports.length + f.imported_by.length };
}

function codeDependents(target) {
  ensureCode();
  const g = loadJSON(CODE_GRAPH);
  const f = findFile(g, target);
  if (!f) return { error: `file not in graph: ${target}` };
  return { file: f.path, imported_by: f.imported_by, count: f.imported_by.length };
}

function codeDependencies(target, depth = 3) {
  ensureCode();
  const g = loadJSON(CODE_GRAPH);
  const visited = new Set();
  const stack = [{ path: target, d: 0 }];
  while (stack.length) {
    const { path: p, d } = stack.pop();
    if (visited.has(p) || d > depth) continue;
    visited.add(p);
    const f = findFile(g, p);
    if (f) for (const imp of f.imports) stack.push({ path: imp, d: d + 1 });
  }
  return { root: target, depth, deps: [...visited] };
}

function codeSummary() {
  ensureCode();
  const g = loadJSON(CODE_GRAPH);
  const ranked = g.files.map(f => ({ path: f.path, degree: f.imports.length + f.imported_by.length }))
                        .sort((a, b) => b.degree - a.degree).slice(0, 5);
  return { file_count: g.files.length, edge_count: g.files.reduce((a, f) => a + f.imports.length + f.imported_by.length, 0), top_connected: ranked };
}

function codeUnreachable() {
  ensureCode();
  const g = loadJSON(CODE_GRAPH);
  return { unreachable: g.files.filter(f => f.imports.length === 0 && f.imported_by.length === 0).map(f => f.path) };
}

function docTrace(docPath) {
  ensureDoc();
  const g = loadJSON(DOC_GRAPH);
  const node = g.nodes.find(n => n.path === docPath || n.path.endsWith(docPath));
  if (!node) return { error: `doc not in graph: ${docPath}` };
  const out = node.links.map(t => ({ to: t.target, type: t.type }));
  const inb = g.edges.filter(e => e.target === node.path);
  return { doc: node.path, outgoing: out, incoming: inb };
}

function docStoryImpl(storyId) {
  ensureDoc();
  const g = loadJSON(DOC_GRAPH);
  const edges = g.edges.filter(e => e.source.includes('user-stories') && e.source.toLowerCase().includes(storyId.toLowerCase()));
  return { story: storyId, implements: edges.map(e => ({ target: e.target, type: e.type })) };
}

function docAdrConstrains(module) {
  ensureDoc();
  const g = loadJSON(DOC_GRAPH);
  const matches = g.edges.filter(e => e.source.includes('adr') && e.target.toLowerCase().includes(module.toLowerCase()));
  return { module, constraining_adrs: matches.map(e => ({ adr: e.source, target: e.target, type: e.type })) };
}

function docOrphans() {
  ensureDoc();
  const g = loadJSON(DOC_GRAPH);
  const connected = new Set();
  for (const e of g.edges) { connected.add(e.source); connected.add(e.target); }
  return { orphans: g.nodes.filter(n => !connected.has(n.path)).map(n => n.path) };
}

const [, , graph, op, ...rest] = process.argv;
const flags = Object.fromEntries(rest.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const arg = rest.find(a => !a.startsWith('--'));

const out = (() => {
  if (graph !== 'code' && graph !== 'doc') return { error: 'specify code|doc' };
  if (graph === 'code') {
    if (op === 'blast-radius') return codeBlastRadius(arg);
    if (op === 'dependents')   return codeDependents(arg);
    if (op === 'dependencies') return codeDependencies(arg, parseInt(flags.depth || '3', 10));
    if (op === 'summary')      return codeSummary();
    if (op === 'unreachable')  return codeUnreachable();
  } else {
    if (op === 'trace')          return docTrace(arg);
    if (op === 'story-impl')     return docStoryImpl(arg);
    if (op === 'adr-constrains') return docAdrConstrains(arg);
    if (op === 'orphans')        return docOrphans();
  }
  return { error: `unknown op: ${graph} ${op}` };
})();

console.log(JSON.stringify(out, null, 2));
```

---

## §7 — telemetry_surface.js (Phase 3, F3.8, ~130 lines)

**Path:** `.agents/scripts/telemetry_surface.js`
**Usage:** `node .agents/scripts/telemetry_surface.js session` | `hot-paths` | `compare --agent=<name> --phase=<phase>`

```javascript
#!/usr/bin/env node
// telemetry_surface.js — short, LLM-consumable telemetry digests
const { execFileSync } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, 'swarm_telemetry.js');

function run(cmd, args) {
  try { return execFileSync('node', [SCRIPT, cmd, ...args], { encoding: 'utf8' }); }
  catch { return null; }
}

function session() {
  const summary = run('summary', ['--days', '7']);
  if (!summary) return '[TELEMETRY] no data';
  return ['[TELEMETRY — last 7 days]', ...summary.split('\n').slice(0, 20).join('\n')].join('\n');
}

function hotPaths() {
  const report = run('report', ['--days', '30']);
  if (!report) return '[TELEMETRY] no hot-path data';
  return ['[HOT-PATHS — last 30 days]', ...report.split('\n').slice(0, 15).join('\n')].join('\n');
}

function compare(agent, phase) {
  const out = run('baseline', [`--agent=${agent}`, `--phase=${phase}`]);
  return out || '[TELEMETRY] no baseline data';
}

const [, , cmd, ...args] = process.argv;
switch (cmd) {
  case 'session':   console.log(session()); break;
  case 'hot-paths': console.log(hotPaths()); break;
  case 'compare': {
    const get = (k) => { const a = args.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : null; };
    console.log(compare(get('agent'), get('phase')));
    break;
  }
  default: console.log('Usage: telemetry_surface.js {session|hot-paths|compare}');
}
```

---

## §8 — witness.js (Phase 2, F2.16, ~150 lines)

**Path:** `.agents/scripts/witness.js`
**Usage:** `node .agents/scripts/witness.js check` | `sign <file>` | `verify <file>`

```javascript
#!/usr/bin/env node
// witness.js — artifact integrity tracker (SHA-256)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WITNESS_FILE = path.join(__dirname, '..', 'state', 'witness.json');
const ARTIFACTS = [
  'artifacts/memory/project-context.md',
  'artifacts/memory/active-decisions.md',
  'artifacts/memory/lessons-learned.md',
  'artifacts/memory/patterns-and-conventions.md',
  'artifacts/memory/blockers-and-risks.md',
];

function hashFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

function loadWitness() {
  if (!fs.existsSync(WITNESS_FILE)) return {};
  return JSON.parse(fs.readFileSync(WITNESS_FILE, 'utf8'));
}

function saveWitness(witness) {
  fs.mkdirSync(path.dirname(WITNESS_FILE), { recursive: true });
  fs.writeFileSync(WITNESS_FILE, JSON.stringify(witness, null, 2));
}

function signFile(filepath) {
  const witness = loadWitness();
  witness[filepath] = { sha256: hashFile(filepath), mtime: fs.statSync(filepath).mtimeMs, signedAt: new Date().toISOString() };
  saveWitness(witness);
  console.log(`Signed: ${filepath} (${witness[filepath].sha256.slice(0, 8)}...)`);
}

function verifyFile(filepath) {
  const witness = loadWitness();
  if (!witness[filepath]) { console.log(`[UNSIGNED] ${filepath}`); return false; }
  const currentHash = hashFile(filepath);
  if (currentHash !== witness[filepath].sha256) {
    console.log(`[INTEGRITY-WARNING] ${filepath} (was ${witness[filepath].sha256.slice(0, 8)}, now ${currentHash.slice(0, 8)})`);
    return false;
  }
  console.log(`[OK] ${filepath}`);
  return true;
}

function checkAll() {
  console.log(`\nWitness check — ${new Date().toISOString()}\n`);
  let ok = 0, warnings = 0, unsigned = 0;
  for (const filepath of ARTIFACTS) {
    if (!fs.existsSync(filepath)) continue;
    const witness = loadWitness();
    if (!witness[filepath]) { unsigned++; console.log(`[UNSIGNED] ${filepath}`); continue; }
    const result = verifyFile(filepath);
    if (result) ok++; else warnings++;
  }
  console.log(`\nSummary: ${ok} OK, ${warnings} warnings, ${unsigned} unsigned\n`);
  process.exit(warnings > 0 ? 1 : 0);
}

const [, , cmd, ...args] = process.argv;
switch (cmd) {
  case 'sign': args.forEach(signFile); break;
  case 'verify': args.forEach(verifyFile); break;
  case 'check': checkAll(); break;
  default: console.log('Usage: witness.js {sign|verify|check} <files...>'); process.exit(1);
}
```

---

## §9 — self_learn.js (Phase 2, F2.12, ~280 lines)

**Path:** `.agents/scripts/self_learn.js`
**Usage:** `node .agents/scripts/self_learn.js scan-episodes --since=30d` | `scan-patterns --since=30d` | `demote --pattern=<id> --reason=<reason>`

```javascript
#!/usr/bin/env node
// self_learn.js — promotion pipeline for episodes → patterns → instincts
const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, '..', '..', 'artifacts', 'memory');
const AGENT_NOTES_DIR = path.join(MEMORY_DIR, 'agent-notes');
const PATTERNS_FILE = path.join(MEMORY_DIR, 'patterns-and-conventions.md');
const INSTINCTS_FILE = path.join(MEMORY_DIR, 'instincts.md');
const ARCHIVE_DIR = path.join(MEMORY_DIR, 'archive', 'patterns');

function parseEpisodes(sinceDays) {
  const since = Date.now() - (sinceDays * 24 * 60 * 60 * 1000);
  const episodes = [];
  if (!fs.existsSync(AGENT_NOTES_DIR)) return episodes;
  for (const agentFile of fs.readdirSync(AGENT_NOTES_DIR)) {
    if (!agentFile.endsWith('.md')) continue;
    const agentName = agentFile.replace('.md', '');
    const content = fs.readFileSync(path.join(AGENT_NOTES_DIR, agentFile), 'utf8');
    const entryRegex = /^###\s+\[(\w+)\]\s+(.+?)\s+\[date:\s+(\d{4}-\d{2}-\d{2})\]\s+\[agent:\s+(@?\w+)\]/gm;
    let match;
    while ((match = entryRegex.exec(content)) !== null) {
      const [, domain, title, date, agent] = match;
      const entryDate = new Date(date).getTime();
      if (entryDate < since) continue;
      episodes.push({ domain, title, date, agent, agentName, file: agentFile });
    }
  }
  return episodes;
}

function clusterEpisodes(episodes) {
  const clusters = new Map();
  for (const ep of episodes) {
    const key = ep.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
      .filter(w => w.length > 3).sort().slice(0, 5).join(' ');
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push(ep);
  }
  return Array.from(clusters.entries()).map(([key, eps]) => ({ key, episodes: eps }))
    .filter(c => c.episodes.length >= 3);
}

function isPatternCandidate(cluster) {
  const agents = new Set(cluster.episodes.map(e => e.agentName));
  if (agents.size < 2) return false;
  const dates = cluster.episodes.map(e => new Date(e.date).getTime());
  const span = Math.max(...dates) - Math.min(...dates);
  return span >= 7 * 24 * 60 * 60 * 1000;
}

function loadPatterns() {
  if (!fs.existsSync(PATTERNS_FILE)) return [];
  const content = fs.readFileSync(PATTERNS_FILE, 'utf8');
  const patternRegex = /^###\s+\[PATTERN\]\s+(.+?)\s+\[promoted:\s+(\d{4}-\d{2}-\d{2})\]\s+\[occurrences:\s+(\d+)\]\s+\[agents:\s+([^\]]+)\]/gm;
  const patterns = [];
  let match;
  while ((match = patternRegex.exec(content)) !== null) {
    const [, title, promoted, occurrences, agents] = match;
    patterns.push({ title, promoted, occurrences: parseInt(occurrences, 10), agents });
  }
  return patterns;
}

function countAdrRefs(pattern) {
  const adrDir = path.join(__dirname, '..', '..', 'artifacts', 'output', '04-architecture');
  if (!fs.existsSync(adrDir)) return 0;
  let count = 0;
  for (const adrFile of fs.readdirSync(adrDir)) {
    if (!adrFile.endsWith('.md')) continue;
    const content = fs.readFileSync(path.join(adrDir, adrFile), 'utf8');
    if (content.toLowerCase().includes(pattern.title.toLowerCase().split(' ')[0])) count++;
  }
  return count;
}

function scanEpisodes(sinceDays) {
  const episodes = parseEpisodes(sinceDays);
  const clusters = clusterEpisodes(episodes);
  const candidates = clusters.filter(isPatternCandidate);
  console.log(`\n=== Episode scan (last ${sinceDays} days) ===\n`);
  console.log(`Total episodes: ${episodes.length}`);
  console.log(`Clusters (3+ similar): ${clusters.length}`);
  console.log(`Pattern candidates (cross-agent, 7+ day span): ${candidates.length}\n`);
  for (const c of candidates) {
    const agents = [...new Set(c.episodes.map(e => e.agentName))];
    console.log(`  "${c.episodes[0].title}"`);
    console.log(`     ${c.episodes.length} episodes, agents: ${agents.join(', ')}`);
    console.log(`     dates: ${c.episodes.map(e => e.date).join(', ')}`);
  }
}

function scanPatterns(sinceDays) {
  const patterns = loadPatterns();
  const since = Date.now() - (sinceDays * 24 * 60 * 60 * 1000);
  const candidates = patterns.filter(p => Date.now() - new Date(p.promoted).getTime() >= since);
  console.log(`\n=== Pattern scan (stable for 30+ days) ===\n`);
  console.log(`Total patterns: ${patterns.length}`);
  console.log(`Instinct candidates (30+ days, checking ADR refs):\n`);
  for (const p of candidates) {
    const adrRefs = countAdrRefs(p);
    const eligible = adrRefs >= 2;
    console.log(`  ${eligible ? '✅' : '⏳'} "${p.title}" — ${adrRefs} ADR refs, promoted ${p.promoted}`);
  }
}

function demote(patternId, reason) {
  if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  const content = fs.readFileSync(PATTERNS_FILE, 'utf8');
  const archived = content + `\n\n### [DEMOTED: ${new Date().toISOString().split('T')[0]}] ${patternId}\n**Reason:** ${reason}\n`;
  fs.writeFileSync(PATTERNS_FILE, archived);
  console.log(`Demoted: ${patternId} (reason: ${reason})`);
}

const [, , cmd, ...args] = process.argv;
const sinceDays = parseInt((args.find(a => a.startsWith('--since=')) || '--since=30').split('=')[1], 10);

switch (cmd) {
  case 'scan-episodes': scanEpisodes(sinceDays); break;
  case 'scan-patterns': scanPatterns(sinceDays); break;
  case 'demote':
    const patternId = args.find(a => a.startsWith('--pattern=')).split('=')[1];
    const reason = args.find(a => a.startsWith('--reason=')).split('=')[1];
    demote(patternId, reason);
    break;
  default: console.log('Usage: self_learn.js {scan-episodes|scan-patterns|demote} [options]');
}
```

---

## §10 — delegation_audit.js (Phase 2, F2.21, ~110 lines)

**Path:** `.agents/scripts/delegation_audit.js`
**Usage:** `node .agents/scripts/delegation_audit.js [--since 7d] [--json]`

```javascript
#!/usr/bin/env node
// delegation_audit.js — measure sub-agent delegation rate per agent
const fs = require('fs');
const path = require('path');

const LOG = path.join(__dirname, '..', 'state', 'delegation-log.json');
const AGENTS = [
  'developer', 'code-reviewer', 'architect', 'tech-lead', 'qa-engineer',
  'product-manager', 'product-designer', 'security-engineer', 'performance-engineer',
  'data-analyst', 'devops-engineer', 'ml-engineer', 'researcher',
];

function loadLog() {
  if (!fs.existsSync(LOG)) return [];
  return JSON.parse(fs.readFileSync(LOG, 'utf8'));
}

function summarize(entries) {
  const byAgent = {};
  for (const agent of AGENTS) byAgent[agent] = { delegated: 0, direct: 0, total: 0 };
  for (const e of entries) {
    if (!byAgent[e.agent]) continue;
    byAgent[e.agent].total++;
    if (e.delegated) byAgent[e.agent].delegated++;
    else byAgent[e.agent].direct++;
  }
  return byAgent;
}

const entries = loadLog();
const summary = summarize(entries);

console.log('\n=== Delegation Audit ===\n');
console.log('Agent                 | Delegated | Direct | Rate');
console.log('----------------------|-----------|--------|------');
for (const [agent, stats] of Object.entries(summary)) {
  const rate = stats.total === 0 ? '—' : `${Math.round(100 * stats.delegated / stats.total)}%`;
  console.log(`${agent.padEnd(21)} | ${String(stats.delegated).padStart(9)} | ${String(stats.direct).padStart(6)} | ${rate}`);
}
const totalDelegated = Object.values(summary).reduce((a, s) => a + s.delegated, 0);
const totalDirect    = Object.values(summary).reduce((a, s) => a + s.direct, 0);
const total = totalDelegated + totalDirect;
console.log('----------------------|-----------|--------|------');
console.log(`${'TOTAL'.padEnd(21)} | ${String(totalDelegated).padStart(9)} | ${String(totalDirect).padStart(6)} | ${total ? Math.round(100 * totalDelegated / total) + '%' : '—'}`);
console.log(`\nLog entries: ${entries.length} | Log file: ${LOG}\n`);
```

---

## §11 — qa_check.js (Phase 2, F2.26, ~60 lines)

**Path:** `.agents/scripts/qa_check.js`
**Usage:** `node .agents/scripts/qa_check.js`

```javascript
#!/usr/bin/env node
// qa_check.js — pre-handoff QA gate verification
const fs = require('fs');
const path = require('path');

const ARTIFACTS = [
  'artifacts/output/06-quality/qa-report.md',
  'artifacts/output/06-quality/qa-signoff.md',
];
const WORKING_DIR = process.cwd();

let allOk = true;
for (const rel of ARTIFACTS) {
  const full = path.join(WORKING_DIR, rel);
  if (!fs.existsSync(full)) { console.log(`[MISSING] ${rel}`); allOk = false; continue; }
  const content = fs.readFileSync(full, 'utf8');
  const isStale = /date:\s*(\d{4}-\d{2}-\d{2})/i.exec(content)?.[1] !== new Date().toISOString().split('T')[0];
  console.log(`[${isStale ? 'STALE' : 'OK'}] ${rel}`);
}

if (!allOk) {
  console.log('\n❌ QA gate FAILED. Invoke @qa-engineer via /develop Step 7a before claiming completion.');
  process.exit(1);
}
console.log('\n✅ QA gate passed.');
```

---

## §12 — worktree.js (Phase 0, T7.1b, ~100 lines)

**Path:** `.agents/scripts/worktree.js`
**Purpose:** Creates, lists, and cleans git worktrees for parallel agent isolation. Each worktree is a separate checkout on its own branch sharing repo history. Tracks active worktrees in `loop-state.json`.

```javascript
#!/usr/bin/env node
// worktree.js — git worktree management for parallel agent isolation
// Usage: node .agents/scripts/worktree.js create <branch>
//        node .agents/scripts/worktree.js list
//        node .agents/scripts/worktree.js clean <branch>
//        node .agents/scripts/worktree.js clean-all

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const WT_DIR = path.join(ROOT, '.agents', 'worktrees');
const STATE = path.join(ROOT, '.agents', 'state', 'loop-state.json');

function loadState() {
  if (!fs.existsSync(STATE)) return { worktrees: [] };
  return JSON.parse(fs.readFileSync(STATE, 'utf8'));
}

function saveState(state) {
  const dir = path.dirname(STATE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify(state, null, 2));
}

function git(args) {
  return execSync(`git ${args}`, { cwd: ROOT, encoding: 'utf8' }).trim();
}

const cmd = process.argv[2];
const branch = process.argv[3];

if (cmd === 'create') {
  if (!branch) { console.error('Usage: worktree.js create <branch>'); process.exit(1); }
  if (!fs.existsSync(WT_DIR)) fs.mkdirSync(WT_DIR, { recursive: true });
  const wtPath = path.join(WT_DIR, branch);
  if (fs.existsSync(wtPath)) { console.error(`[ERROR] worktree already exists: ${wtPath}`); process.exit(1); }
  git(`worktree add -b "${branch}" "${wtPath}"`);
  const state = loadState();
  state.worktrees = state.worktrees || [];
  state.worktrees.push({ branch, path: wtPath, created_at: new Date().toISOString() });
  saveState(state);
  console.log(`[OK] worktree created: ${wtPath} (branch: ${branch})`);

} else if (cmd === 'list') {
  const state = loadState();
  const wts = state.worktrees || [];
  if (wts.length === 0) { console.log('No active worktrees.'); process.exit(0); }
  console.log('Branch                 | Path');
  console.log('-----------------------|----');
  for (const wt of wts) {
    console.log(`${wt.branch.padEnd(22)} | ${wt.path}`);
  }

} else if (cmd === 'clean') {
  if (!branch) { console.error('Usage: worktree.js clean <branch>'); process.exit(1); }
  const state = loadState();
  const wt = (state.worktrees || []).find(w => w.branch === branch);
  if (!wt) { console.error(`[ERROR] no worktree for branch: ${branch}`); process.exit(1); }
  git(`worktree remove "${wt.path}" --force`);
  git(`branch -D "${branch}"`);
  state.worktrees = state.worktrees.filter(w => w.branch !== branch);
  saveState(state);
  console.log(`[OK] worktree cleaned: ${branch}`);

} else if (cmd === 'clean-all') {
  const state = loadState();
  for (const wt of (state.worktrees || [])) {
    try { git(`worktree remove "${wt.path}" --force`); git(`branch -D "${wt.branch}"`); }
    catch (e) { console.log(`[WARN] could not clean ${wt.branch}: ${e.message}`); }
  }
  state.worktrees = [];
  saveState(state);
  console.log('[OK] all worktrees cleaned');

} else {
  console.error('Usage: worktree.js <create|list|clean|clean-all> [branch]');
  process.exit(1);
}
```

---

## §13 — goal_check.js (Phase 6, F6.2, ~120 lines)

**Path:** `.agents/scripts/goal_check.js`
**Purpose:** Runs the verification command for a `/goal` loop, captures exit code + output, writes result to `loop-state.json`. Does NOT grade "done" — that's @goal-verifier's job. This script only runs the check and records the result.

```javascript
#!/usr/bin/env node
// goal_check.js — run /goal verification and record result
// Usage: node .agents/scripts/goal_check.js run "<condition>"
//        node .agents/scripts/goal_check.js status
//        node .agents/scripts/goal_check.js resume
//        node .agents/scripts/goal_check.js clear

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const STATE = path.join(ROOT, '.agents', 'state', 'loop-state.json');
const MAX_ITER = parseInt(process.env.VESPYR_GOAL_MAX_ITERATIONS || '10', 10);

function loadState() {
  if (!fs.existsSync(STATE)) return { active_goal: null };
  return JSON.parse(fs.readFileSync(STATE, 'utf8'));
}

function saveState(state) {
  const dir = path.dirname(STATE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify(state, null, 2));
}

const cmd = process.argv[2];

if (cmd === 'run') {
  const condition = process.argv[3];
  if (!condition) { console.error('Usage: goal_check.js run "<condition>"'); process.exit(1); }

  const state = loadState();
  if (state.active_goal && state.active_goal.status === 'running') {
    console.error('[ERROR] goal already running. Use "status" or "clear".'); process.exit(1);
  }

  state.active_goal = {
    condition,
    iteration: 0,
    last_failure: null,
    started_at: new Date().toISOString(),
    status: 'running'
  };
  saveState(state);
  console.log(`[OK] goal started: "${condition}" (max ${MAX_ITER} iterations)`);

  while (state.active_goal.iteration < MAX_ITER) {
    state.active_goal.iteration++;
    saveState(state);
    console.log(`\n--- Iteration ${state.active_goal.iteration}/${MAX_ITER} ---`);
    let exitCode = 0;
    let output = '';
    try {
      output = execSync(condition, { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
      console.log(output);
    } catch (e) {
      exitCode = e.status || 1;
      output = (e.stdout || '') + (e.stderr || '');
      console.log(output);
      state.active_goal.last_failure = `iteration ${state.active_goal.iteration}: exit ${exitCode}`;
      saveState(state);
      console.log(`[NOT-DONE] exit code ${exitCode}. Invoke @goal-verifier to confirm, then continue.`);
      process.exit(0);
    }
    if (exitCode === 0) {
      state.active_goal.status = 'done';
      saveState(state);
      console.log('[DONE] condition passed. Invoke @goal-verifier to confirm before declaring success.');
      process.exit(0);
    }
  }
  state.active_goal.status = 'paused';
  saveState(state);
  console.error(`[LIMIT] reached ${MAX_ITER} iterations without passing. Paused.`);
  process.exit(1);

} else if (cmd === 'status') {
  const state = loadState();
  if (!state.active_goal) { console.log('No active goal.'); process.exit(0); }
  const g = state.active_goal;
  console.log(`Condition:  ${g.condition}`);
  console.log(`Status:     ${g.status}`);
  console.log(`Iteration:  ${g.iteration}/${MAX_ITER}`);
  if (g.last_failure) console.log(`Last fail:  ${g.last_failure}`);

} else if (cmd === 'resume') {
  const state = loadState();
  if (!state.active_goal) { console.error('No paused goal to resume.'); process.exit(1); }
  if (state.active_goal.status !== 'paused') { console.error(`Goal is ${state.active_goal.status}, not paused.`); process.exit(1); }
  state.active_goal.status = 'running';
  saveState(state);
  console.log('[OK] goal resumed. Re-invoke the /goal skill to continue.');

} else if (cmd === 'clear') {
  const state = loadState();
  state.active_goal = null;
  saveState(state);
  console.log('[OK] goal cleared.');

} else {
  console.error('Usage: goal_check.js <run|status|resume|clear> [condition]');
  process.exit(1);
}
```

---

## §14 — automation.js (Phase 6, F6.6, ~180 lines)

**Path:** `.agents/scripts/automation.js`
**Purpose:** Creates, lists, runs, and archives scheduled automations. Each automation = prompt + cadence + skill + environment. Findings land in a triage inbox. Runs that find nothing archive themselves.

```javascript
#!/usr/bin/env node
// automation.js — scheduled automation management
// Usage: node .agents/scripts/automation.js create --name="..." --prompt="..." --cadence="..." [--skill="..."] [--worktree]
//        node .agents/scripts/automation.js list
//        node .agents/scripts/automation.js run <id>
//        node .agents/scripts/automation.js run-all [--due]
//        node .agents/scripts/automation.js archive <id>

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const AUTOS = path.join(ROOT, '.agents', 'state', 'automations.json');
const TRIAGE = path.join(ROOT, 'artifacts', 'output', '01-discovery', 'triage');

function loadAutos() {
  if (!fs.existsSync(AUTOS)) return { automations: [] };
  return JSON.parse(fs.readFileSync(AUTOS, 'utf8'));
}

function saveAutos(data) {
  const dir = path.dirname(AUTOS);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(AUTOS, JSON.stringify(data, null, 2));
}

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    const m = arg.match(/^--(\w+)=(.+)$/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

const cmd = process.argv[2];

if (cmd === 'create') {
  const args = parseArgs(process.argv.slice(3));
  if (!args.name || !args.prompt || !args.cadence) {
    console.error('Usage: automation.js create --name="..." --prompt="..." --cadence="..." [--skill="..."] [--worktree]');
    process.exit(1);
  }
  const data = loadAutos();
  const id = args.name.toLowerCase().replace(/\s+/g, '-');
  if (data.automations.find(a => a.id === id)) {
    console.error(`[ERROR] automation "${id}" already exists`); process.exit(1);
  }
  data.automations.push({
    id, name: args.name, prompt: args.prompt, cadence: args.cadence,
    skill: args.skill || null, worktree: !!args.worktree,
    last_run: null, findings: 0, archived: 0, created_at: new Date().toISOString()
  });
  saveAutos(data);
  console.log(`[OK] automation created: ${id}`);

} else if (cmd === 'list') {
  const data = loadAutos();
  if (data.automations.length === 0) { console.log('No automations.'); process.exit(0); }
  console.log('ID                     | Cadence      | Last run    | Findings');
  console.log('-----------------------|--------------|-------------|---------');
  for (const a of data.automations) {
    console.log(`${a.id.padEnd(22)} | ${a.cadence.padEnd(12)} | ${(a.last_run || 'never').padEnd(11)} | ${a.findings}`);
  }

} else if (cmd === 'run') {
  const id = process.argv[3];
  if (!id) { console.error('Usage: automation.js run <id>'); process.exit(1); }
  const data = loadAutos();
  const auto = data.automations.find(a => a.id === id);
  if (!auto) { console.error(`[ERROR] automation "${id}" not found`); process.exit(1); }

  const outDir = path.join(TRIAGE, auto.id);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${new Date().toISOString().split('T')[0]}.md`);

  let worktreePath = null;
  if (auto.worktree) {
    const wtBranch = `automation-${auto.id}-${Date.now()}`;
    execSync(`node .agents/scripts/worktree.js create ${wtBranch}`, { cwd: ROOT, stdio: 'inherit' });
    worktreePath = path.join(ROOT, '.agents', 'worktrees', wtBranch);
  }

  const prompt = auto.skill ? `$${auto.skill} ${auto.prompt}` : auto.prompt;
  console.log(`[RUN] automation: ${auto.id}`);
  console.log(`  Prompt: ${prompt}`);
  console.log(`  Output: ${outFile}`);
  console.log(`  Worktree: ${worktreePath || 'none (local checkout)'}`);
  console.log('  → Hand off to the agent. Findings will be written to the triage inbox.');

  auto.last_run = new Date().toISOString();
  saveAutos(data);

} else if (cmd === 'run-all') {
  const dueOnly = process.argv.includes('--due');
  const data = loadAutos();
  let run = 0;
  for (const auto of data.automations) {
    if (dueOnly) {
      console.log(`[CHECK] ${auto.id}: cadence=${auto.cadence} last=${auto.last_run || 'never'}`);
      // Due-check is harness-specific (cron, GitHub Actions, hooks). This is a stub.
      continue;
    }
    console.log(`[RUN] ${auto.id}`);
    run++;
  }
  if (run === 0) console.log('No automations to run.');

} else if (cmd === 'archive') {
  const id = process.argv[3];
  if (!id) { console.error('Usage: automation.js archive <id>'); process.exit(1); }
  const data = loadAutos();
  const auto = data.automations.find(a => a.id === id);
  if (!auto) { console.error(`[ERROR] automation "${id}" not found`); process.exit(1); }
  const triageDir = path.join(TRIAGE, auto.id);
  const archiveDir = path.join(triageDir, 'archive');
  if (fs.existsSync(archiveDir)) {
    const files = fs.readdirSync(triageDir).filter(f => f.endsWith('.md'));
    for (const f of files) fs.renameSync(path.join(triageDir, f), path.join(archiveDir, f));
  }
  auto.archived++;
  saveAutos(data);
  console.log(`[OK] archived findings for: ${id}`);

} else {
  console.error('Usage: automation.js <create|list|run|run-all|archive> [...]');
  process.exit(1);
}
```

---

## §15 - validate_satisfaction.js (Phase 2, F2.28, ~140 lines)

**Path:** `.agents/scripts/validate_satisfaction.js`

**Purpose:** Validate the machine-readable UTTERLY SATISFIED team record before
handoffs and release. This is a gate, not a scoring system. It must return a
non-zero exit code for an incomplete or dishonest record.

**Usage:**

```bash
node .agents/scripts/validate_satisfaction.js validate \
  artifacts/output/06-launch/utter-satisfaction.json
node .agents/scripts/validate_satisfaction.js status \
  artifacts/output/06-launch/utter-satisfaction.json
```

**Required schema:**

```json
{
  "schema": "vespyr/utter-satisfaction@1.0",
  "release": "feature-or-version",
  "updated_at": "YYYY-MM-DDTHH:mm:ssZ",
  "agents": [
    {
      "name": "qa-engineer",
      "scope": "active",
      "state": "SATISFIED",
      "evidence_refs": ["artifacts/output/05-execution/quality/qa-report.md"],
      "feedback_resolved": [],
      "residual_risks": [],
      "updated_at": "YYYY-MM-DDTHH:mm:ssZ"
    }
  ],
  "gate": "GO",
  "revalidation_required": false
}
```

**Validation rules:**

1. File exists, parses as JSON, and declares the supported schema.
2. Agent names are unique and use the canonical persona names.
3. `active` rows have `SATISFIED`, `CHANGES REQUESTED`, or `BLOCKED` state.
4. `SATISFIED` rows contain at least one evidence reference and no unresolved
   blocking risk.
5. `NOT ACTIVATED` rows require `scope: "inactive"` and a non-empty reason.
6. `CHANGES REQUESTED`, `BLOCKED`, or `revalidation_required: true` returns a
   failed release gate.
7. Evidence references must exist when `--strict` is used.
8. `gate: "GO"` is valid only when every active row is `SATISFIED`, all inactive
   rows have reasons, and the record is not stale.
9. A material artifact fingerprint change invalidates affected rows.

**Output:** JSON summary with `valid`, `gate`, `failures[]`, `active_count`,
`satisfied_count`, `inactive_count`, `evidence_complete`, and
`revalidation_required`. Human-readable mode prints the first blocking reason
followed by all remaining failures.

**Integration points:**

- `orchestrator_state.js next` calls `validate` before release-affecting phase
  advancement.
- `/launch` Step 1 calls `validate --strict`.
- `format_agent_output.js` validates each agent's state fields.
- Harness adapters and `@vespyr/mcp` expose the same command/result rather than
  reimplementing the rules.

**Failure behavior:** Never downgrade a failed gate to a warning on a release
path. Do not provide a `--skip` flag. A maintainer resolves the evidence or
uses the documented escalation path; the validator does not decide whether a
risk is acceptable.

---

## Completion Checklist

**03d status: PLANNED (v2.1 Reference Specs — Implementation Pending in Phase 2/3).**

- [ ] Script specs §1–§17 authored and reviewed
- [ ] Test fixtures T-GATE-1..9 and T-SAT-1..5 specified
- [ ] Safe git worktree isolation script patch back-ported
- [ ] `validate_satisfaction.js` and `qa_check.js` ready for Phase 2 implementation

---

## Sign-Off

**@architect (Vera):** PENDING — Script architecture and security isolation review.  
**@tech-lead (Grant):** PENDING — Implementation sequencing and effort calibration.  
**@qa-engineer (Nina):** PENDING — Deterministic test fixture validation.
