# Implementation Specs — JS Code Reference

> **Source:** Extracted from `2. vespyr_evolution_plan.md` (superseded). This file is the canonical home for implementation code. Phase files reference this by section number.
> **Rule:** When implementing a script, copy the code from here. When updating a script, update it here first, then update the phase file's checklist.

---

## §1 — sync-entry-points.js (Phase 0, F0.4, ~80 lines)

**Path:** `.agents/scripts/sync-entry-points.js`
**Purpose:** Reads `.opencode/agent.md.canonical`, replaces harness dotfolder references per target, writes to `AGENTS.md`, `agent.md`, `CLAUDE.md`, and per-harness `AGENTS.md`.

**Spec (no full code in source — implement from this spec):**

```javascript
#!/usr/bin/env node
// sync-entry-points.js — generate per-harness entry-point files from canonical source
// Usage: node .agents/scripts/sync-entry-points.js

const fs = require('fs');
const path = require('path');

const CANONICAL = path.join(__dirname, '..', '..', '.opencode', 'agent.md.canonical');
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

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(__dirname, '..', 'agents');
const REQUIRED = ['name', 'icon', 'description', 'version', 'human_name', 'mode', 'permission', 'capabilities', 'default_squad', 'origin', 'channeled_mentor'];
const SQUADS = ['full-team', 'startup', 'build', 'research', 'design', 'ship', 'game-studio'];

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) fm[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return fm;
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

**Spec:** Read `<agent>/customize.toml` (defaults) and `.agents/custom/<agent>.toml` (override). Apply merge rules. Output merged config. Use a minimal hand-written TOML parser or vendor BMAD's Python resolver logic as JS. See Adoption §3.3 for merge rules table.

---

## §4 — Memory filter prefetch extension (Phase 0, T7.2, ~80 lines)

**Path:** Update to `.agents/scripts/memory_filter.js`
**Purpose:** Add `--prefetch-patterns` flag that returns matching patterns from `patterns-and-conventions.md` before the full 3-tier load.

**Spec:**

```javascript
// Add to memory_filter.js:
// --prefetch-patterns flag: scan patterns-and-conventions.md for entries
// tagged with the current phase + agent, return matching patterns first

function prefetchPatterns(agent, phase) {
  const patternsFile = path.join(MEMORY_DIR, 'patterns-and-conventions.md');
  if (!fs.existsSync(patternsFile)) return [];
  const content = fs.readFileSync(patternsFile, 'utf8');
  const entries = content.split(/^###\s+/m).filter(s => s.trim());
  return entries.filter(e => {
    const lower = e.toLowerCase();
    return lower.includes(`[agent: @${agent}]`) || lower.includes(`[phase: ${phase}]`);
  }).slice(0, 5); // top 5 matching patterns
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
  const adrDir = path.join(__dirname, '..', '..', 'artifacts', 'output', '03-architecture');
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
