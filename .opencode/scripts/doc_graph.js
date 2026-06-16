#!/usr/bin/env node
/**
 * Doc Graph — Multi-Agent Document Traceability and Relationship Mapper
 * 
 * Crawls artifacts/memory/ and artifacts/output/ for Markdown files.
 * Parses headers, relative/file links, and specific ID references (REQ-XXX, US-XXX)
 * to build a unified semantic relationship graph.
 * 
 * Usage:
 *   node doc_graph.js --out artifacts/memory/structural/doc-graph.json
 */

const fs = require('fs');
const path = require('path');

// Determine document type based on its directory path
function getDocType(relPath) {
  if (relPath.includes('00-discovery')) return 'discovery';
  if (relPath.includes('01-research')) return 'research';
  if (relPath.includes('02-strategy')) return 'strategy';
  if (relPath.includes('03-architecture')) return 'architecture';
  if (relPath.includes('04-planning')) return 'planning';
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
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^(##|###)\s+(.+)$/);
    if (match) {
      headers.push(match[2].trim());
    }
  }
  return headers;
}

function resolveLink(linkPath, sourceFile, projectRoot) {
  // Clean up any anchor/hash parts (e.g., file.md#US-001)
  const cleanLink = linkPath.split('#')[0];
  if (!cleanLink) return null;

  // Handle absolute/file links
  if (cleanLink.startsWith('file:///')) {
    const absPath = cleanLink.replace('file://', '');
    const rel = path.relative(projectRoot, absPath);
    return rel.startsWith('..') ? null : rel;
  }

  // Handle standard relative links
  const sourceDir = path.dirname(path.resolve(projectRoot, sourceFile));
  const resolved = path.resolve(sourceDir, cleanLink);
  const rel = path.relative(projectRoot, resolved);
  return rel.startsWith('..') ? null : rel;
}

function extractMarkdownLinks(content, sourceFile, projectRoot) {
  const links = new Set();
  const linkPattern = /\[.+?\]\((.+?)\)/g;
  let match;
  while ((match = linkPattern.exec(content)) !== null) {
    const linkPath = match[1].trim();
    if (!linkPath.startsWith('http') && !linkPath.startsWith('#')) {
      const resolved = resolveLink(linkPath, sourceFile, projectRoot);
      if (resolved) links.add(resolved);
    }
  }
  return Array.from(links);
}

function extractRequirementIDs(content) {
  const matches = content.match(/REQ-\d+/g);
  return matches ? Array.from(new Set(matches)) : [];
}

function extractUserStoryIDs(content) {
  const matches = content.match(/US-\d+/g);
  return matches ? Array.from(new Set(matches)) : [];
}

function extractCodeFilePaths(content, projectRoot) {
  const paths = new Set();
  // Find strings like "src/utils/crypto.js" or "src/routes/api.js"
  const pathPattern = /(?:^|\s|`|file:\/\/\/)(src|lib|app)\/([a-zA-Z0-9_\-\.\/]+)(?:\s|`|\n|$)/g;
  let match;
  while ((match = pathPattern.exec(content)) !== null) {
    const cleanPath = (match[1] + '/' + match[2]).replace(/[`'"]/g, '').trim();
    // Verify file actually exists
    if (fs.existsSync(path.resolve(projectRoot, cleanPath))) {
      paths.add(cleanPath);
    }
  }
  return Array.from(paths);
}

function scanDirectory(dir, projectRoot, nodes = []) {
  if (!fs.existsSync(dir)) return nodes;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(projectRoot, fullPath);

    if (entry.isDirectory()) {
      // Skip ignorable folders
      if (['node_modules', '.git', 'archive', 'telemetry', '.opencode'].includes(entry.name)) {
        continue;
      }
      scanDirectory(fullPath, projectRoot, nodes);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const title = extractH1(content) || entry.name;
      const type = getDocType(relPath);

      nodes.push({
        path: relPath,
        type,
        title,
        sections: extractHeaders(content),
        links: extractMarkdownLinks(content, relPath, projectRoot),
        requirements: extractRequirementIDs(content),
        user_stories: extractUserStoryIDs(content),
        code_files: extractCodeFilePaths(content, projectRoot)
      });
    }
  }

  return nodes;
}

function buildGraph(projectRoot) {
  const rawNodes = [];
  
  // Scan input, output and memory directories
  scanDirectory(path.resolve(projectRoot, 'artifacts/input'), projectRoot, rawNodes);
  scanDirectory(path.resolve(projectRoot, 'artifacts/output'), projectRoot, rawNodes);
  scanDirectory(path.resolve(projectRoot, 'artifacts/memory'), projectRoot, rawNodes);

  // Filter nodes to keep only files that actually exist (sanity check)
  const nodes = rawNodes.filter(n => fs.existsSync(path.resolve(projectRoot, n.path)));
  
  // Create a fast lookup map for document nodes
  const nodeLookup = new Set(nodes.map(n => n.path));
  
  const edges = [];
  const codeNodePaths = new Set();

  for (const node of nodes) {
    // 1. Process Markdown relative links
    for (const target of node.links) {
      if (nodeLookup.has(target)) {
        // Document-to-Document reference
        let edgeType = 'references';
        if (node.path.includes('requirements') && target.includes('user-stories')) {
          edgeType = 'defines';
        } else if (node.path.includes('user-stories') && target.includes('requirements')) {
          edgeType = 'traces_to';
        } else if (node.path.includes('adr') && target.includes('requirements')) {
          edgeType = 'aligns_with';
        } else if (!node.path.includes('artifacts/input') && target.includes('artifacts/input')) {
          edgeType = 'derived_from';
        }

        edges.push({
          source: node.path,
          target,
          type: edgeType
        });
      }
    }

    // 2. Process Code file references
    for (const codePath of node.code_files) {
      codeNodePaths.add(codePath);
      
      let edgeType = 'maps_to';
      if (node.path.includes('user-stories')) {
        edgeType = 'implements';
      } else if (node.path.includes('adr')) {
        edgeType = 'constrains';
      }

      edges.push({
        source: node.path,
        target: codePath,
        type: edgeType
      });
    }
  }

  // Add virtual nodes for codebase reference paths so the graph joins cleanly
  const finalNodes = [...nodes];
  for (const codePath of codeNodePaths) {
    finalNodes.push({
      path: codePath,
      type: 'code',
      title: path.basename(codePath),
      sections: [],
      links: [],
      requirements: [],
      user_stories: [],
      code_files: []
    });
  }

  return {
    generated_at: new Date().toISOString(),
    file_count: finalNodes.length,
    nodes: finalNodes,
    edges
  };
}

function main() {
  const args = process.argv.slice(2);
  let out = 'artifacts/memory/structural/doc-graph.json';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out') out = args[i + 1];
  }

  const projectRoot = process.cwd();
  const graph = buildGraph(projectRoot);

  const outDir = path.dirname(out);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

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
