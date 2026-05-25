#!/usr/bin/env node
/**
 * Incremental Graph — mtime-based Structural Scan for Vespyr
 *
 * Only scans files that have changed since the last graph generation.
 * First run = full scan. Subsequent runs = delta only.
 *
 * Usage:
 *   node incremental_graph.js --src src/ --out artifacts/memory/structural/code-graph.json
 *   node incremental_graph.js --src src/,lib/ --out artifacts/memory/structural/code-graph.json
 */

const fs = require('fs');
const path = require('path');

// Language definitions (same as shallow_graph.js)
const LANGUAGES = {
  javascript: {
    extensions: ['.js', '.jsx', '.mjs', '.cjs'],
    importPatterns: [
      /(?:^|;|\n)\s*import\s+.*?\s+from\s+['"](.+?)['"]/gm,
      /(?:^|;|\n)\s*import\s*\(\s*['"](.+?)['"]\s*\)/gm,
      /(?:^|;|\n)\s*require\s*\(\s*['"](.+?)['"]\s*\)/gm
    ],
    exportPatterns: [
      /(?:^|;|\n)\s*export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/gm,
      /(?:^|;|\n)\s*export\s+\{([^}]+)\}/gm,
      /(?:^|;|\n)\s*export\s+\*\s+from\s+['"](.+?)['"]/gm
    ]
  },
  typescript: {
    extensions: ['.ts', '.tsx'],
    importPatterns: [
      /(?:^|;|\n)\s*import\s+.*?\s+from\s+['"](.+?)['"]/gm,
      /(?:^|;|\n)\s*import\s*\(\s*['"](.+?)['"]\s*\)/gm,
      /(?:^|;|\n)\s*import\s+type\s+.*?\s+from\s+['"](.+?)['"]/gm,
      /(?:^|;|\n)\s*require\s*\(\s*['"](.+?)['"]\s*\)/gm
    ],
    exportPatterns: [
      /(?:^|;|\n)\s*export\s+(?:default\s+)?(?:class|function|const|let|var|type|interface|enum)\s+(\w+)/gm,
      /(?:^|;|\n)\s*export\s+\{([^}]+)\}/gm,
      /(?:^|;|\n)\s*export\s+\*\s+from\s+['"](.+?)['"]/gm
    ]
  },
  python: {
    extensions: ['.py'],
    importPatterns: [
      /(?:^|\n)\s*import\s+(\S+)/gm,
      /(?:^|\n)\s*from\s+(\S+)\s+import/gm
    ],
    exportPatterns: [
      /(?:^|\n)\s*(?:class|def)\s+(\w+)/gm
    ]
  },
  go: {
    extensions: ['.go'],
    importPatterns: [
      /(?:^|\n)\s*import\s+\(\s*([^)]+)\)/gms,
      /(?:^|\n)\s*import\s+['"](.+?)['"]/gm
    ],
    exportPatterns: [
      /(?:^|\n)\s*(?:func|type|var|const)\s+(\w+)/gm
    ]
  },
  rust: {
    extensions: ['.rs'],
    importPatterns: [
      /(?:^|\n)\s*use\s+([^;]+);/gm,
      /(?:^|\n)\s*extern\s+crate\s+(\w+)/gm
    ],
    exportPatterns: [
      /(?:^|\n)\s*(?:pub\s+)?(?:fn|struct|enum|trait|type|const|static|use)\s+(\w+)/gm
    ]
  },
  ruby: {
    extensions: ['.rb'],
    importPatterns: [
      /(?:^|\n)\s*require\s+['"](.+?)['"]/gm,
      /(?:^|\n)\s*require_relative\s+['"](.+?)['"]/gm,
      /(?:^|\n)\s*include\s+(\w+)/gm
    ],
    exportPatterns: [
      /(?:^|\n)\s*(?:class|module|def)\s+(\w+)/gm
    ]
  },
  php: {
    extensions: ['.php'],
    importPatterns: [
      /(?:^|\n)\s*(?:include|require|include_once|require_once)\s*\(\s*['"](.+?)['"]\s*\)/gm,
      /(?:^|\n)\s*use\s+([^;]+);/gm
    ],
    exportPatterns: [
      /(?:^|\n)\s*(?:class|interface|trait|function)\s+(\w+)/gm
    ]
  },
  c: {
    extensions: ['.c', '.h', '.cpp', '.hpp', '.cc'],
    importPatterns: [
      /(?:^|\n)\s*#include\s+["<](.+?)[">]/gm
    ],
    exportPatterns: [
      /(?:^|\n)\s*(?:void|int|char|float|double|struct|enum|typedef)\s+(\w+)\s*\(/gm
    ]
  }
};

function detectLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  for (const [lang, config] of Object.entries(LANGUAGES)) {
    if (config.extensions.includes(ext)) return lang;
  }
  return null;
}

function resolveImport(importPath, sourceFile, projectRoot) {
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) return null;

  const sourceDir = path.dirname(sourceFile);
  let resolved = path.resolve(sourceDir, importPath);

  const ext = path.extname(resolved);
  if (!ext) {
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.rb', '.php', '.c', '.h', '.cpp', '.hpp'];
    for (const tryExt of extensions) {
      if (fs.existsSync(resolved + tryExt)) { resolved += tryExt; break; }
    }
    if (!fs.existsSync(resolved)) {
      for (const tryExt of extensions) {
        if (fs.existsSync(path.join(resolved, 'index' + tryExt))) { resolved = path.join(resolved, 'index' + tryExt); break; }
      }
    }
  }

  const rel = path.relative(projectRoot, resolved);
  return rel.startsWith('..') ? null : rel;
}

function extractImports(content, language, filePath, projectRoot) {
  const config = LANGUAGES[language];
  if (!config) return [];

  const imports = new Set();
  for (const pattern of config.importPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const importPath = match[1].trim();
      if (importPath.includes('\n')) {
        for (const line of importPath.split('\n')) {
          const clean = line.replace(/['"]/g, '').trim();
          if (clean) { const resolved = resolveImport(clean, filePath, projectRoot); if (resolved) imports.add(resolved); }
        }
      } else {
        const resolved = resolveImport(importPath, filePath, projectRoot);
        if (resolved) imports.add(resolved);
      }
    }
  }
  return Array.from(imports);
}

function extractExports(content, language) {
  const config = LANGUAGES[language];
  if (!config) return [];

  const exports = new Set();
  for (const pattern of config.exportPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const exported = match[1].trim();
      if (exported.includes(',')) {
        for (const part of exported.split(',')) {
          const clean = part.trim().split(/\s+as\s+/)[0].trim();
          if (clean) exports.add(clean);
        }
      } else {
        exports.add(exported);
      }
    }
  }
  return Array.from(exports);
}

function scanFile(filePath, projectRoot) {
  const language = detectLanguage(filePath);
  if (!language) return null;

  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(projectRoot, filePath);
  const stat = fs.statSync(filePath);

  return {
    path: relPath,
    language,
    exports: extractExports(content, language),
    imports: extractImports(content, language, filePath, projectRoot),
    mtime: stat.mtimeMs
  };
}

function scanDirectory(dir, projectRoot, fileMap = {}) {
  if (!fs.existsSync(dir)) return fileMap;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'build', 'coverage', '.opencode', 'artifacts'].includes(entry.name)) continue;
      scanDirectory(fullPath, projectRoot, fileMap);
    } else {
      const lang = detectLanguage(fullPath);
      if (lang) {
        const relPath = path.relative(projectRoot, fullPath);
        const stat = fs.statSync(fullPath);
        fileMap[relPath] = { mtime: stat.mtimeMs };
      }
    }
  }
  return fileMap;
}

function buildGraph(srcDirs, projectRoot, existingGraph) {
  const existingFiles = {};
  if (existingGraph && existingGraph.files) {
    for (const f of existingGraph.files) {
      existingFiles[f.path] = f;
    }
  }

  // Step 1: Scan directory for current file list + mtimes
  const currentFiles = {};
  for (const dir of srcDirs) {
    scanDirectory(path.resolve(projectRoot, dir), projectRoot, currentFiles);
  }

  // Step 2: Determine changed files
  const changedFiles = new Set();
  const deletedFiles = new Set();

  for (const [relPath, info] of Object.entries(currentFiles)) {
    const existing = existingFiles[relPath];
    if (!existing) {
      changedFiles.add(relPath); // New file
    } else if (existing.mtime && info.mtime !== existing.mtime) {
      changedFiles.add(relPath); // Modified file
    }
  }

  for (const relPath of Object.keys(existingFiles)) {
    if (!currentFiles[relPath]) {
      deletedFiles.add(relPath); // Deleted file
    }
  }

  // Step 3: Full scan if no existing graph or all files changed
  const isFullScan = !existingGraph || changedFiles.size === Object.keys(currentFiles).length;

  let fileMap = {};

  if (isFullScan) {
    // Full scan — process all directories
    for (const dir of srcDirs) {
      const fullDir = path.resolve(projectRoot, dir);
      if (!fs.existsSync(fullDir)) continue;
      const allFiles = {};
      scanDirectory(fullDir, projectRoot, allFiles);
      for (const relPath of Object.keys(allFiles)) {
        if (!fileMap[relPath]) {
          const fullPath = path.join(projectRoot, relPath);
          const result = scanFile(fullPath, projectRoot);
          if (result) fileMap[relPath] = result;
        }
      }
    }
  } else {
    // Incremental: keep unchanged, rescan changed
    for (const [relPath, existing] of Object.entries(existingFiles)) {
      if (!deletedFiles.has(relPath) && !changedFiles.has(relPath)) {
        fileMap[relPath] = { ...existing };
      }
    }
    for (const relPath of changedFiles) {
      const fullPath = path.join(projectRoot, relPath);
      const result = scanFile(fullPath, projectRoot);
      if (result) fileMap[relPath] = result;
    }
  }

  // Remove deleted files
  for (const relPath of deletedFiles) {
    delete fileMap[relPath];
  }

  // Step 4: Recompute imported_by
  const files = Object.values(fileMap);
  for (const file of files) file.imported_by = [];

  // Build a lookup for imports
  const pathLookup = {};
  for (const file of files) {
    pathLookup[file.path] = file;
    // Also index without extension for fuzzy matching
    const noExt = file.path.replace(/\.(js|ts|jsx|tsx|py|go|rs|rb|php|c|h|cpp|hpp)$/, '');
    if (!pathLookup[noExt]) pathLookup[noExt] = file;
  }

  for (const file of files) {
    for (const imp of file.imports) {
      const target = pathLookup[imp] || pathLookup[imp.replace(/\.(js|ts|jsx|tsx)$/, '')];
      if (target && !target.imported_by.includes(file.path)) {
        target.imported_by.push(file.path);
      }
    }
  }

  return {
    generated_at: new Date().toISOString(),
    file_count: files.length,
    files_scanned: isFullScan ? files.length : changedFiles.size,
    scan_mode: isFullScan ? 'full' : 'incremental',
    changed_files: Array.from(changedFiles),
    deleted_files: Array.from(deletedFiles),
    files: files.map(f => ({
      path: f.path,
      language: f.language,
      exports: f.exports,
      imports: f.imports,
      imported_by: f.imported_by,
      mtime: f.mtime
    }))
  };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(`Usage:
  node incremental_graph.js --src src/ --out artifacts/memory/structural/code-graph.json
  node incremental_graph.js --src src/,lib/,app/ --out artifacts/memory/structural/code-graph.json`);
    process.exit(0);
  }

  let src = 'src/';
  let out = 'artifacts/memory/structural/code-graph.json';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--src') src = args[i + 1];
    if (args[i] === '--out') out = args[i + 1];
  }

  const srcDirs = src.split(',').map(s => s.trim());
  const projectRoot = process.cwd();

  // Load existing graph if present
  let existingGraph = null;
  if (fs.existsSync(out)) {
    try {
      existingGraph = JSON.parse(fs.readFileSync(out, 'utf8'));
    } catch (e) {
      // Corrupt or missing — full scan
    }
  }

  const graph = buildGraph(srcDirs, projectRoot, existingGraph);

  const outDir = path.dirname(out);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(out, JSON.stringify(graph, null, 2), 'utf8');
  console.log(JSON.stringify({
    success: true,
    scan_mode: graph.scan_mode,
    files_total: graph.file_count,
    files_scanned: graph.files_scanned,
    changed: graph.changed_files.length,
    deleted: graph.deleted_files.length,
    output: out
  }));
}

main();
