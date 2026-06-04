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

const PROJECT_ROOT = process.cwd();
const STRUCTURAL_DIR = path.join(PROJECT_ROOT, 'artifacts', 'memory', 'structural');
const DEFAULT_SRC = 'src/';
const DEFAULT_CODE_OUT = path.join(STRUCTURAL_DIR, 'code-graph.json');
const DEFAULT_DOC_OUT = path.join(STRUCTURAL_DIR, 'doc-graph.json');

// --- helpers ---------------------------------------------------------------

function ensureStructuralDir() {
  if (!fs.existsSync(STRUCTURAL_DIR)) fs.mkdirSync(STRUCTURAL_DIR, { recursive: true });
}

function parseArgs(args) {
  const out = { type: null, src: null, out: null, force: false };
  if (args.length === 0) return out;
  out.type = args[0];
  for (let i = 1; i < args.length; i += 2) {
    if (args[i] === '--src') out.src = args[i + 1];
    else if (args[i] === '--out') out.out = args[i + 1];
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
// For code: any source file under --src dirs.
// For doc: any .md under artifacts/memory/ and artifacts/output/.
function maxMtimeOfSources(srcDirs) {
  const ignore = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.opencode', 'artifacts', 'archive', 'telemetry']);
  let maxMtime = 0;
  for (const dir of srcDirs) {
    const absDir = path.resolve(PROJECT_ROOT, dir);
    for (const file of walk(absDir, [], ignore)) {
      try {
        const stat = fs.statSync(file);
        if (stat.mtimeMs > maxMtime) maxMtime = stat.mtimeMs;
      } catch (e) { /* ignore */ }
    }
  }
  return maxMtime;
}

function maxMtimeOfDocs() {
  const ignore = new Set(['node_modules', '.git', 'archive', 'telemetry', '.opencode']);
  const roots = [
    path.join(PROJECT_ROOT, 'artifacts', 'memory'),
    path.join(PROJECT_ROOT, 'artifacts', 'output')
  ];
  let maxMtime = 0;
  for (const root of roots) {
    for (const file of walk(root, [], ignore)) {
      if (!file.endsWith('.md')) continue;
      try {
        const stat = fs.statSync(file);
        if (stat.mtimeMs > maxMtime) maxMtime = stat.mtimeMs;
      } catch (e) { /* ignore */ }
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

function ensureCode(src, out, force) {
  ensureStructuralDir();
  const graphExists = fs.existsSync(out);
  const gMtime = graphMtime(out);
  const srcDirs = src.split(',').map(s => s.trim());
  const srcMaxMtime = maxMtimeOfSources(srcDirs);

  const needsBuild = force || !graphExists || srcMaxMtime > gMtime;
  if (!needsBuild) {
    return {
      type: 'code',
      status: 'fresh',
      scan_mode: 'none',
      output: out,
      regenerated: false,
      graph_mtime: new Date(gMtime).toISOString(),
      source_max_mtime: srcMaxMtime ? new Date(srcMaxMtime).toISOString() : null
    };
  }

  const result = runChildScript('incremental_graph.js', ['--src', src, '--out', out]);
  return {
    type: 'code',
    status: 'regenerated',
    scan_mode: result.scan_mode,
    files_total: result.files_total,
    files_scanned: result.files_scanned,
    changed: result.changed,
    deleted: result.deleted,
    output: out,
    regenerated: true,
    graph_mtime: new Date().toISOString(),
    source_max_mtime: srcMaxMtime ? new Date(srcMaxMtime).toISOString() : null
  };
}

function ensureDoc(out, force) {
  ensureStructuralDir();
  const graphExists = fs.existsSync(out);
  const gMtime = graphMtime(out);
  const docMaxMtime = maxMtimeOfDocs();

  const needsBuild = force || !graphExists || docMaxMtime > gMtime;
  if (!needsBuild) {
    return {
      type: 'doc',
      status: 'fresh',
      scan_mode: 'none',
      output: out,
      regenerated: false,
      graph_mtime: new Date(gMtime).toISOString(),
      source_max_mtime: docMaxMtime ? new Date(docMaxMtime).toISOString() : null
    };
  }

  const result = runChildScript('doc_graph.js', ['--out', out]);
  return {
    type: 'doc',
    status: 'regenerated',
    scan_mode: 'full',
    documents_scanned: result.documents_scanned,
    code_references: result.code_references,
    edges_created: result.edges_created,
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
  node ensure_graph.js code [--src src/] [--out <path>] [--force]
  node ensure_graph.js doc  [--out <path>] [--force]

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

  let result;
  try {
    if (parsed.type === 'code') {
      const src = parsed.src || DEFAULT_SRC;
      const out = parsed.out || DEFAULT_CODE_OUT;
      result = ensureCode(src, out, parsed.force);
    } else {
      const out = parsed.out || DEFAULT_DOC_OUT;
      result = ensureDoc(out, parsed.force);
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
