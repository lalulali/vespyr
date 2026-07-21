#!/usr/bin/env node
/**
 * Doc Graph — Multi-Agent Document Traceability and Relationship Mapper
 *
 * Crawls configured directories for Markdown files, extracts headers, links,
 * and document IDs (US-XXX, REQ-XXX, or custom patterns from .agents/config.yaml).
 *
 * Usage:
 *   node doc_graph.js [--out <path>] [--root <path>] [--docs <dirs>] [--ids <patterns>]
 */

const fs = require('fs');
const path = require('path');

// --- config loading ---------------------------------------------------------

function loadConfig(projectRoot) {
  const configPath = path.join(projectRoot, '.agents', 'config.yaml');
  if (!fs.existsSync(configPath)) return { docs: [], ids: [] };

  const content = fs.readFileSync(configPath, 'utf8');

  // Parse docs list: array items under graph.doc.docs
  const docsMatch = content.match(/graph:\s*\n\s+doc:\s*\n\s+docs:\s*([\s\S]*?)(?=\n\s{2}\w|\n\w|\n\s+ids:|\Z)/);
  const docs = [];
  if (docsMatch) {
    const items = docsMatch[1].match(/\s*-\s+(.+)/g);
    if (items) docs.push(...items.map(i => i.replace(/^\s*-\s+/, '').trim()));
  }
  if (docs.length === 0) {
    docs.push('artifacts/input/', 'artifacts/memory/', 'artifacts/output/');
  }

  // Parse ids list: array items under graph.doc.ids
  const idsMatch = content.match(/ids:\s*([\s\S]*?)(?=\n\w|\n\s\w|\Z)/);
  const ids = [];
  if (idsMatch) {
    const items = idsMatch[1].match(/\s*-\s+(.+)/g);
    if (items) ids.push(...items.map(i => i.replace(/^\s*-\s+/, '').trim()));
  }
  if (ids.length === 0) {
    ids.push('US-\\d+', 'REQ-\\d+');
  }

  return { docs, ids };
}

function decodeListFlag(flagValue) {
  // Support both comma-separated and multiple --flag calls.
  // For simplicity the caller joins repeated values.
  if (!flagValue) return [];
  return flagValue.split(',').map(s => s.trim()).filter(Boolean);
}

// --- document parsing -------------------------------------------------------

function getDocType(relPath) {
  if (relPath.includes('01-discovery')) return 'discovery';
  if (relPath.includes('02-research')) return 'research';
  if (relPath.includes('03-strategy')) return 'strategy';
  if (relPath.includes('04-architecture')) return 'architecture';
  if (relPath.includes('05-planning')) return 'planning';
  if (relPath.includes('06-launch')) return 'launch';
  if (relPath.includes('07-iteration')) return 'iteration';
  if (relPath.includes('08-incidents')) return 'incident';
  if (relPath.includes('09-retro')) return 'retrospective';
  if (relPath.includes('artifacts/memory')) return 'memory';
  if (relPath.includes('artifacts/input')) return 'input';
  return 'document';
}

function extractH1(content) {
  const match = content.match(/^(?:#)\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function extractHeaders(content) {
  const headers = [];
  for (const line of content.split('\n')) {
    const m = line.match(/^(##|###)\s+(.+)$/);
    if (m) headers.push(m[2].trim());
  }
  return headers;
}

function resolveLink(linkPath, sourceFile, projectRoot) {
  const cleanLink = linkPath.split('#')[0];
  if (!cleanLink) return null;
  if (cleanLink.startsWith('file:///')) {
    const rel = path.relative(projectRoot, cleanLink.replace('file://', ''));
    return rel.startsWith('..') ? null : rel;
  }
  const sourceDir = path.dirname(path.resolve(projectRoot, sourceFile));
  const rel = path.relative(projectRoot, path.resolve(sourceDir, cleanLink));
  return rel.startsWith('..') ? null : rel;
}

function extractMarkdownLinks(content, sourceFile, projectRoot) {
  const links = new Set();
  const re = /\[.+?\]\((.+?)\)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const linkPath = m[1].trim();
    if (!linkPath.startsWith('http') && !linkPath.startsWith('#')) {
      const r = resolveLink(linkPath, sourceFile, projectRoot);
      if (r) links.add(r);
    }
  }
  return Array.from(links);
}

function extractIDs(content, patterns) {
  const ids = [];
  for (const p of patterns) {
    const re = new RegExp(p, 'g');
    let m;
    while ((m = re.exec(content)) !== null) {
      ids.push(m[0]);
    }
  }
  return Array.from(new Set(ids));
}

function extractCodeFilePaths(content, projectRoot) {
  const paths = new Set();
  const re = /(?:^|\s|`|file:\/\/\/)(src|lib|app|components|pages|utils|services|hooks|middleware|config|types|styles|public|tests)\/([a-zA-Z0-9_\-\.\/]+)(?:\s|`|\n|$)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const cleanPath = (m[1] + '/' + m[2]).replace(/[`'"]/g, '').trim();
    if (fs.existsSync(path.resolve(projectRoot, cleanPath))) paths.add(cleanPath);
  }
  return Array.from(paths);
}

// --- scanning ---------------------------------------------------------------

const IGNORE_DIRS = new Set(['node_modules', '.git', 'archive', 'telemetry', '.agents']);

function scanPath(entry, projectRoot, idPatterns, nodes) {
  const abs = path.resolve(projectRoot, entry);
  if (!fs.existsSync(abs)) return;

  const stat = fs.statSync(abs);
  if (stat.isFile()) {
    if (!entry.endsWith('.md')) return;
    parseFile(abs, projectRoot, idPatterns, nodes);
  } else if (stat.isDirectory()) {
    scanDir(abs, projectRoot, idPatterns, nodes);
  }
}

function scanDir(dir, projectRoot, idPatterns, nodes) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(full, projectRoot, idPatterns, nodes);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      parseFile(full, projectRoot, idPatterns, nodes);
    }
  }
}

function parseFile(fullPath, projectRoot, idPatterns, nodes) {
  const content = fs.readFileSync(fullPath, 'utf8');
  const relPath = path.relative(projectRoot, fullPath);
  const title = extractH1(content) || path.basename(fullPath);
  const matchedIDs = extractIDs(content, idPatterns);

  nodes.push({
    path: relPath,
    type: getDocType(relPath),
    title,
    sections: extractHeaders(content),
    links: extractMarkdownLinks(content, relPath, projectRoot),
    ids: matchedIDs,
    requirements: matchedIDs,     // backward compat
    user_stories: matchedIDs,     // backward compat
    code_files: extractCodeFilePaths(content, projectRoot)
  });
}

// --- graph building ---------------------------------------------------------

function buildGraph(projectRoot, docsRoots, idPatterns) {
  const rawNodes = [];
  for (const entry of docsRoots) {
    scanPath(entry, projectRoot, idPatterns, rawNodes);
  }

  const nodes = rawNodes.filter(n => fs.existsSync(path.resolve(projectRoot, n.path)));
  const nodeLookup = new Set(nodes.map(n => n.path));

  const edges = [];
  const codeNodePaths = new Set();

  const idIndex = new Map();
  for (const node of nodes) {
    for (const id of (node.ids || [])) {
      if (!idIndex.has(id)) idIndex.set(id, []);
      idIndex.get(id).push(node.path);
    }
  }

  for (const node of nodes) {
    // 1. Markdown links
    for (const target of node.links) {
      if (nodeLookup.has(target)) {
        let edgeType = 'references';
        if (node.path.includes('requirements') && target.includes('user-stories')) edgeType = 'defines';
        else if (node.path.includes('user-stories') && target.includes('requirements')) edgeType = 'traces_to';
        else if (node.path.includes('adr') && target.includes('requirements')) edgeType = 'aligns_with';
        else if (!node.path.includes('artifacts/input') && target.includes('artifacts/input')) edgeType = 'derived_from';
        edges.push({ source: node.path, target, type: edgeType });
      }
    }

    // 2. Code references
    for (const codePath of node.code_files) {
      codeNodePaths.add(codePath);
      let edgeType = 'maps_to';
      if (node.path.includes('user-stories')) edgeType = 'implements';
      else if (node.path.includes('adr')) edgeType = 'constrains';
      edges.push({ source: node.path, target: codePath, type: edgeType });
    }

    // 3. Shared IDs
    const nodeIds = node.ids || [];
    for (const id of nodeIds) {
      const peers = idIndex.get(id) || [];
      for (const peerPath of peers) {
        if (peerPath === node.path) continue;
        let edgeType = 'traces_to';
        if (node.path.includes('requirements') && peerPath.includes('user-stories')) edgeType = 'defines';
        else if (node.path.includes('user-stories') && peerPath.includes('product-spec')) edgeType = 'specifies';
        else if (node.path.includes('product-spec') && peerPath.includes('user-stories')) edgeType = 'traces_to';
        else if (node.path.includes('adr') && peerPath.includes('requirements')) edgeType = 'aligns_with';
        edges.push({ source: node.path, target: peerPath, type: edgeType, via: id });
      }
    }
  }

  const edgeSeen = new Set();
  const dedupedEdges = edges.filter(e => {
    const key = `${e.source}|${e.target}|${e.type}`;
    if (edgeSeen.has(key)) return false;
    edgeSeen.add(key);
    return true;
  });

  const finalNodes = [...nodes];
  for (const codePath of codeNodePaths) {
    finalNodes.push({
      path: codePath, type: 'code', title: path.basename(codePath),
      sections: [], links: [], ids: [], requirements: [], user_stories: [], code_files: []
    });
  }

  return {
    generated_at: new Date().toISOString(),
    file_count: finalNodes.length,
    nodes: finalNodes,
    edges: dedupedEdges
  };
}

// --- main -------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  let out = 'artifacts/memory/structural/doc-graph.json';
  let projectRoot = process.cwd();
  let docsFlag = null;
  let idsFlag = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out') { out = args[i + 1]; i++; }
    else if (args[i] === '--root') { projectRoot = args[i + 1]; i++; }
    else if (args[i] === '--docs') { docsFlag = args[i + 1]; i++; }
    else if (args[i] === '--ids') { idsFlag = args[i + 1]; i++; }
  }

  const config = loadConfig(projectRoot);
  const docsRoots = docsFlag ? decodeListFlag(docsFlag) : config.docs;
  const idPatterns = idsFlag ? decodeListFlag(idsFlag) : config.ids;

  const graph = buildGraph(projectRoot, docsRoots, idPatterns);

  const outDir = path.dirname(out);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(out, JSON.stringify(graph, null, 2), 'utf8');

  console.log(JSON.stringify({
    success: true,
    documents_scanned: graph.nodes.filter(n => n.type !== 'code').length,
    code_references: graph.nodes.filter(n => n.type === 'code').length,
    edges_created: graph.edges.length,
    output: out
  }));
}

main();
