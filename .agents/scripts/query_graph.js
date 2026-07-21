#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function resolveProjectRoot(explicitRoot) {
  if (explicitRoot && fs.existsSync(path.join(explicitRoot, 'artifacts'))) return path.resolve(explicitRoot);
  let dir = process.cwd();
  for (let i = 0; i < 10 && dir !== path.dirname(dir); i++) {
    if (fs.existsSync(path.join(dir, 'artifacts', 'memory', 'structural'))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

let PROJECT_ROOT = resolveProjectRoot();
let STRUCTURAL_DIR = path.join(PROJECT_ROOT, 'artifacts', 'memory', 'structural');
let CODE_GRAPH = path.join(STRUCTURAL_DIR, 'code-graph.json');
let DOC_GRAPH = path.join(STRUCTURAL_DIR, 'doc-graph.json');

function loadGraph(graphPath) {
  if (!fs.existsSync(graphPath)) return null;
  try { return JSON.parse(fs.readFileSync(graphPath, 'utf8')); } catch { return null; }
}

function summary() {
  const code = loadGraph(CODE_GRAPH);
  const doc = loadGraph(DOC_GRAPH);

  const lines = [];

  if (!code || !code.files || code.files.length === 0) {
    lines.push('code-graph: empty (no source files indexed)');
  } else {
    const hubs = code.files
      .filter(f => f.imported_by && f.imported_by.length > 0)
      .sort((a, b) => b.imported_by.length - a.imported_by.length)
      .slice(0, 5);
    lines.push(`code-graph: ${code.file_count} files, generated ${code.generated_at}`);
    if (hubs.length > 0) {
      lines.push('top hubs:');
      for (const h of hubs) lines.push(`  ${h.path} (${h.imported_by.length} dependents)`);
    }
  }

  if (!doc || !doc.nodes || doc.nodes.length === 0) {
    lines.push('doc-graph: empty (no documents indexed)');
  } else {
    const docNodes = doc.nodes.filter(n => n.type !== 'code');
    const codeNodes = doc.nodes.filter(n => n.type === 'code');
    const edgeCount = doc.edges ? doc.edges.length : 0;
    lines.push(`doc-graph: ${docNodes.length} docs, ${codeNodes.length} code refs, ${edgeCount} edges, generated ${doc.generated_at}`);
    if (edgeCount > 0) {
      const types = {};
      for (const e of doc.edges) types[e.type] = (types[e.type] || 0) + 1;
      lines.push('edge types: ' + Object.entries(types).map(([k, v]) => `${k}=${v}`).join(', '));
    } else {
      lines.push('WARNING: 0 edges — traceability chain is broken; query_graph trace/search will find no relationships');
    }
  }

  return lines.join('\n');
}

function deps(filePath) {
  if (!filePath) return 'error: missing file path. Usage: query_graph.js deps <file>';
  const code = loadGraph(CODE_GRAPH);
  if (!code || !code.files || code.files.length === 0) return 'code-graph: empty';

  const file = code.files.find(f => f.path === filePath || f.path.endsWith('/' + filePath));
  if (!file) return `not found: ${filePath}`;

  const lines = [`${file.path} (${file.language})`];
  if (file.imports && file.imports.length > 0) {
    lines.push(`imports (${file.imports.length}):`);
    for (const imp of file.imports) lines.push(`  -> ${imp}`);
  } else {
    lines.push('imports: none');
  }
  if (file.exports && file.exports.length > 0) {
    lines.push(`exports: ${file.exports.join(', ')}`);
  }
  return lines.join('\n');
}

function blast(filePath) {
  if (!filePath) return 'error: missing file path. Usage: query_graph.js blast <file>';
  const code = loadGraph(CODE_GRAPH);
  if (!code || !code.files || code.files.length === 0) return 'code-graph: empty';

  const file = code.files.find(f => f.path === filePath || f.path.endsWith('/' + filePath));
  if (!file) return `not found: ${filePath}`;

  const lines = [`${file.path} blast radius`];
  if (file.imported_by && file.imported_by.length > 0) {
    lines.push(`imported by (${file.imported_by.length}):`);
    for (const dep of file.imported_by) lines.push(`  <- ${dep}`);
  } else {
    lines.push('imported by: nothing (leaf node)');
  }
  return lines.join('\n');
}

function trace(docPath) {
  if (!docPath) return 'error: missing document path. Usage: query_graph.js trace <doc>';
  const doc = loadGraph(DOC_GRAPH);
  if (!doc || !doc.nodes || doc.nodes.length === 0) return 'doc-graph: empty';

  const node = doc.nodes.find(n => n.path === docPath || n.path.endsWith('/' + docPath));
  if (!node) return `not found: ${docPath}`;

  const lines = [`${node.path} (${node.type}): ${node.title}`];

  if (node.sections && node.sections.length > 0) {
    lines.push(`sections: ${node.sections.join(', ')}`);
  }

  const outgoing = doc.edges ? doc.edges.filter(e => e.source === node.path) : [];
  const incoming = doc.edges ? doc.edges.filter(e => e.target === node.path) : [];

  if (outgoing.length > 0) {
    lines.push(`outgoing (${outgoing.length}):`);
    for (const e of outgoing) lines.push(`  ${e.type} -> ${e.target}${e.via ? ` (via ${e.via})` : ''}`);
  } else {
    lines.push('outgoing: none');
  }

  if (incoming.length > 0) {
    lines.push(`incoming (${incoming.length}):`);
    for (const e of incoming) lines.push(`  ${e.type} <- ${e.source}${e.via ? ` (via ${e.via})` : ''}`);
  }

  if (node.requirements && node.requirements.length > 0) {
    lines.push(`requirements: ${node.requirements.join(', ')}`);
  }
  if (node.user_stories && node.user_stories.length > 0) {
    lines.push(`user stories: ${node.user_stories.join(', ')}`);
  }
  if (node.code_files && node.code_files.length > 0) {
    lines.push(`code refs: ${node.code_files.join(', ')}`);
  }

  return lines.join('\n');
}

function searchDocs(query) {
  if (!query || !query.trim()) return 'error: missing query. Usage: query_graph.js search <query>';
  const doc = loadGraph(DOC_GRAPH);
  if (!doc || !doc.nodes || doc.nodes.length === 0) return 'doc-graph: empty';

  const q = query.toLowerCase();
  const matches = doc.nodes.filter(n =>
    n.title.toLowerCase().includes(q) ||
    (n.sections && n.sections.some(s => s.toLowerCase().includes(q))) ||
    n.path.toLowerCase().includes(q)
  );

  if (matches.length === 0) return `no matches for: ${query}`;

  const lines = [`matches for "${query}" (${matches.length}):`];
  for (const m of matches) {
    lines.push(`  ${m.path} (${m.type}): ${m.title}`);
  }
  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);

  // Extract --root <path> if present, then remove it and its value from args
  let rootFlag = null;
  const cleanArgs = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root') { rootFlag = args[i + 1]; i++; }
    else cleanArgs.push(args[i]);
  }
  if (rootFlag) {
    PROJECT_ROOT = resolveProjectRoot(rootFlag);
    STRUCTURAL_DIR = path.join(PROJECT_ROOT, 'artifacts', 'memory', 'structural');
    CODE_GRAPH = path.join(STRUCTURAL_DIR, 'code-graph.json');
    DOC_GRAPH = path.join(STRUCTURAL_DIR, 'doc-graph.json');
  }

  if (cleanArgs.length === 0 || cleanArgs[0] === '--help') {
    console.log(`Usage:
  node query_graph.js summary              — compact overview of both graphs
  node query_graph.js deps <file>          — what does this file import/export?
  node query_graph.js blast <file>         — what depends on this file?
  node query_graph.js trace <doc>          — document relationships and edges
  node query_graph.js search <query>       — find documents by title/section/path

  Optional: --root <path> to target a project other than the current directory.`);
    process.exit(0);
  }

  const cmd = cleanArgs[0];
  const target = cleanArgs[1];

  const handlers = {
    summary: () => summary(),
    deps: () => deps(target),
    blast: () => blast(target),
    trace: () => trace(target),
    search: () => searchDocs(cleanArgs.slice(1).join(' '))
  };

  if (!handlers[cmd]) {
    console.error(`Unknown command: ${cmd}. Use --help.`);
    process.exit(1);
  }

  console.log(handlers[cmd]());
}

main();
