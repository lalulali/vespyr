#!/usr/bin/env node
/**
 * Ensure Graph — Self-Healing Wrapper for Vespyr Structural Graphs
 *
 * Single entry point every consumer (skills, agents, orchestrator) calls
 * to obtain a current code-graph.json or doc-graph.json. The wrapper:
 *
 *   1. Checks if the graph file exists
 *   2. If not, runs a full scan via the appropriate script
 *   3. If yes, compares graph mtime against source-file mtime
 *      - For code-graph: delegates to incremental_graph.js (mtime-aware)
 *      - For doc-graph: runs a full re-scan when any .md under
 *        artifacts/memory/ or artifacts/output/ is newer than the graph
 *   4. Returns a JSON status with scan mode, counts, and a `regenerated`
 *      flag so callers can record telemetry and surface cost
 *
 * This is the canonical trigger. Do NOT call shallow_graph.js,
 * incremental_graph.js, or doc_graph.js directly from skills/agents —
 * always go through this wrapper so freshness checks are consistent.
 *
 * Usage:
 *   node ensure_graph.js code [--src src/] [--out <path>]
 *   node ensure_graph.js doc  [--out <path>]
 *
 * Exit code 0 on success, 1 on scan failure.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Resolve project root robustly. Vespyr scripts may be invoked from a harness
// directory (e.g. ~/.agents/scripts/) rather than the target project root.
// Resolution order:
//   1. --root <path> CLI flag (explicit)
//   2. Walk up from cwd looking for artifacts/memory/structural/ (canonical marker)
//   3. Fall back to cwd (legacy behavior)
function resolveProjectRoot(explicitRoot) {
  if (explicitRoot && fs.existsSync(path.join(explicitRoot, 'artifacts'))) return path.resolve(explicitRoot);
  let dir = process.cwd();
  for (let i = 0; i < 10 && dir !== path.dirname(dir); i++) {
    if (fs.existsSync(path.join(dir, 'artifacts', 'memory', 'structural'))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

// Load graph configuration from .agents/config.yaml.
// Returns { src, docs, ids } with sensible defaults.
function loadConfig(projectRoot) {
  const configPath = path.join(projectRoot, '.agents', 'config.yaml');
  const defaults = { src: 'src/', docs: ['artifacts/input/', 'artifacts/memory/', 'artifacts/output/'], ids: ['US-\\d+', 'REQ-\\d+'] };
  if (!fs.existsSync(configPath)) return defaults;

  const content = fs.readFileSync(configPath, 'utf8');

  // Parse graph.code.src
  const srcMatch = content.match(/graph:\s*\n\s+code:\s*\n\s+src:\s+(.+)/);
  if (srcMatch) defaults.src = srcMatch[1].trim();

  // Parse graph.doc.docs list
  const docsMatch = content.match(/graph:\s*\n\s+doc:\s*\n\s+docs:\s*([\s\S]*?)(?=\n\s{2}\w|\n\w|\n\s+ids:|\Z)/);
  if (docsMatch) {
    const items = docsMatch[1].match(/\s*-\s+(.+)/g);
    if (items) defaults.docs = items.map(i => i.replace(/^\s*-\s+/, '').trim());
  }

  // Parse graph.doc.ids list
  const idsMatch = content.match(/ids:\s*([\s\S]*?)(?=\n\w|\n\s\w|\Z)/);
  if (idsMatch) {
    const items = idsMatch[1].match(/\s*-\s+(.+)/g);
    if (items) defaults.ids = items.map(i => i.replace(/^\s*-\s+/, '').trim());
  }

  return defaults;
}

// Default root for module-level constants; main() re-resolves if --root is passed.
const PROJECT_ROOT = resolveProjectRoot();
const STRUCTURAL_DIR = path.join(PROJECT_ROOT, 'artifacts', 'memory', 'structural');
const DEFAULT_SRC = 'src/';
const DEFAULT_CODE_OUT = path.join(STRUCTURAL_DIR, 'code-graph.json');
const DEFAULT_DOC_OUT = path.join(STRUCTURAL_DIR, 'doc-graph.json');

// --- helpers ---------------------------------------------------------------

function ensureStructuralDir(structuralDir) {
  if (!fs.existsSync(structuralDir)) fs.mkdirSync(structuralDir, { recursive: true });
}

function parseArgs(args) {
  const out = { type: null, src: null, out: null, force: false, root: null, docs: null, ids: null };
  if (args.length === 0) return out;
  out.type = args[0];
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--src') { out.src = args[i + 1]; i++; }
    else if (args[i] === '--out') { out.out = args[i + 1]; i++; }
    else if (args[i] === '--root') { out.root = args[i + 1]; i++; }
    else if (args[i] === '--docs') { out.docs = args[i + 1]; i++; }
    else if (args[i] === '--ids') { out.ids = args[i + 1]; i++; }
    else if (args[i] === '--force') out.force = true;
  }
  return out;
}

function walk(dir, results = [], ignore = new Set()) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignore.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, results, ignore);
    } else {
      results.push(full);
    }
  }
  return results;
}

// Find the most recent mtime across source files relevant to the graph.
// For code: any source file under --src dirs (or config default).
// For doc: any .md under configured doc roots (or config default).
function maxMtimeOfSources(srcDirs, projectRoot) {
  const ignore = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.agents', 'artifacts', 'archive', 'telemetry']);
  let maxMtime = 0;
  for (const dir of srcDirs) {
    const absDir = path.resolve(projectRoot, dir);
    if (!fs.existsSync(absDir)) continue;
    for (const file of walk(absDir, [], ignore)) {
      try {
        const stat = fs.statSync(file);
        if (stat.mtimeMs > maxMtime) maxMtime = stat.mtimeMs;
      } catch (e) { /* ignore */ }
    }
  }
  return maxMtime;
}

function maxMtimeOfDocs(docsRoots, projectRoot) {
  const ignore = new Set(['node_modules', '.git', 'archive', 'telemetry', '.agents']);
  let maxMtime = 0;
  for (const entry of docsRoots) {
    const abs = path.resolve(projectRoot, entry);
    if (!fs.existsSync(abs)) continue;
    const stat = fs.statSync(abs);
    if (stat.isFile()) {
      if (entry.endsWith('.md')) maxMtime = Math.max(maxMtime, stat.mtimeMs);
    } else if (stat.isDirectory()) {
      for (const file of walk(abs, [], ignore)) {
        if (!file.endsWith('.md')) continue;
        try {
          const s = fs.statSync(file);
          if (s.mtimeMs > maxMtime) maxMtime = s.mtimeMs;
        } catch (e) { /* ignore */ }
      }
    }
  }
  return maxMtime;
}

function graphMtime(graphPath) {
  if (!fs.existsSync(graphPath)) return 0;
  return fs.statSync(graphPath).mtimeMs;
}

function runChildScript(scriptRel, args) {
  const scriptAbs = path.join(__dirname, scriptRel);
  const stdout = execFileSync('node', [scriptAbs, ...args], { encoding: 'utf8' });
  // Each script ends with a single JSON line on stdout
  const lines = stdout.trim().split('\n').filter(Boolean);
  return JSON.parse(lines[lines.length - 1]);
}

// --- main flows ------------------------------------------------------------

function ensureCode(src, out, force, projectRoot) {
  const structuralDir = path.dirname(out);
  ensureStructuralDir(structuralDir);
  const graphExists = fs.existsSync(out);
  const gMtime = graphMtime(out);
  const srcDirs = src.split(',').map(s => s.trim());
  const srcMaxMtime = maxMtimeOfSources(srcDirs, projectRoot);

  const needsBuild = force || !graphExists || srcMaxMtime > gMtime;
  if (!needsBuild) {
    let fileCount = 0;
    try {
      const existing = JSON.parse(fs.readFileSync(out, 'utf8'));
      fileCount = existing.file_count || (existing.files ? existing.files.length : 0);
    } catch (e) { /* ignore */ }
    return {
      type: 'code',
      status: 'fresh',
      scan_mode: 'none',
      file_count: fileCount,
      empty: fileCount === 0,
      output: out,
      regenerated: false,
      graph_mtime: new Date(gMtime).toISOString(),
      source_max_mtime: srcMaxMtime ? new Date(srcMaxMtime).toISOString() : null
    };
  }

  const childArgs = ['--src', src, '--out', out, '--root', projectRoot];
  const result = runChildScript('incremental_graph.js', childArgs);
  return {
    type: 'code',
    status: 'regenerated',
    scan_mode: result.scan_mode,
    files_total: result.files_total,
    files_scanned: result.files_scanned,
    changed: result.changed,
    deleted: result.deleted,
    empty: result.files_total === 0,
    output: out,
    regenerated: true,
    graph_mtime: new Date().toISOString(),
    source_max_mtime: srcMaxMtime ? new Date(srcMaxMtime).toISOString() : null
  };
}

function ensureDoc(out, force, projectRoot, docsRoots, idPatterns) {
  const structuralDir = path.dirname(out);
  ensureStructuralDir(structuralDir);
  const graphExists = fs.existsSync(out);
  const gMtime = graphMtime(out);
  const docMaxMtime = maxMtimeOfDocs(docsRoots, projectRoot);

  const needsBuild = force || !graphExists || docMaxMtime > gMtime;
  if (!needsBuild) {
    let nodeCount = 0;
    let edgeCount = 0;
    try {
      const existing = JSON.parse(fs.readFileSync(out, 'utf8'));
      nodeCount = existing.file_count || (existing.nodes ? existing.nodes.length : 0);
      edgeCount = existing.edges ? existing.edges.length : 0;
    } catch (e) { /* ignore */ }
    return {
      type: 'doc',
      status: 'fresh',
      scan_mode: 'none',
      node_count: nodeCount,
      edge_count: edgeCount,
      empty: edgeCount === 0,
      output: out,
      regenerated: false,
      graph_mtime: new Date(gMtime).toISOString(),
      source_max_mtime: docMaxMtime ? new Date(docMaxMtime).toISOString() : null
    };
  }

  const childArgs = ['--out', out, '--root', projectRoot];
  if (docsRoots && docsRoots.length > 0) childArgs.push('--docs', docsRoots.join(','));
  if (idPatterns && idPatterns.length > 0) childArgs.push('--ids', idPatterns.join(','));
  const result = runChildScript('doc_graph.js', childArgs);
  return {
    type: 'doc',
    status: 'regenerated',
    scan_mode: 'full',
    documents_scanned: result.documents_scanned,
    code_references: result.code_references,
    edges_created: result.edges_created,
    empty: result.edges_created === 0,
    output: out,
    regenerated: true,
    graph_mtime: new Date().toISOString(),
    source_max_mtime: docMaxMtime ? new Date(docMaxMtime).toISOString() : null
  };
}

// --- CLI -------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`Usage:
  node ensure_graph.js code [--src src/] [--out <path>] [--root <path>] [--force]
  node ensure_graph.js doc  [--out <path>] [--root <path>] [--force] [--docs <comma,list>] [--ids <comma,list>]

  --src <dirs>    Source directories to scan (code-graph default: src/)
  --docs <dirs>   Doc directories/files to scan (doc-graph default: artifacts/input/,artifacts/memory/,artifacts/output/)
  --ids <pats>    Regex patterns for document IDs (doc-graph default: US-\\d+,REQ-\\d+)
  --root <path>   Project root if not the current working directory.

  All defaults can be persisted in .agents/config.yaml under the 'graph' key.
  CLI flags override config values.

Exit codes:
  0  success (fresh or regenerated)
  1  scan failure
  2  invalid arguments`);
    process.exit(args.length === 0 ? 1 : 0);
  }

  const parsed = parseArgs(args);
  if (!['code', 'doc'].includes(parsed.type)) {
    console.error(`Invalid type: "${parsed.type}". Must be "code" or "doc".`);
    process.exit(2);
  }

  // Re-resolve project root if --root was passed; otherwise the module-level
  // PROJECT_ROOT (from cwd walk) is already set.
  const projectRoot = parsed.root ? resolveProjectRoot(parsed.root) : PROJECT_ROOT;
  const config = loadConfig(projectRoot);
  const structuralDir = path.join(projectRoot, 'artifacts', 'memory', 'structural');
  const defaultCodeOut = path.join(structuralDir, 'code-graph.json');
  const defaultDocOut = path.join(structuralDir, 'doc-graph.json');

  let result;
  try {
    if (parsed.type === 'code') {
      const src = parsed.src || config.src;
      const out = parsed.out || defaultCodeOut;
      result = ensureCode(src, out, parsed.force, projectRoot);
    } else {
      const out = parsed.out || defaultDocOut;
      const docs = parsed.docs ? parsed.docs.split(',').map(s => s.trim()).filter(Boolean) : config.docs;
      const ids = parsed.ids ? parsed.ids.split(',').map(s => s.trim()).filter(Boolean) : config.ids;
      result = ensureDoc(out, parsed.force, projectRoot, docs, ids);
    }
  } catch (e) {
    console.error(JSON.stringify({
      type: parsed.type,
      status: 'failed',
      error: e.message
    }));
    process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
}

main();
