#!/usr/bin/env node
/**
 * Shallow Graph — Language-Agnostic Import/Export Mapper
 * 
 * Generates a lightweight structural map of the repository by parsing
 * import/require/include statements. Does NOT do full AST parsing.
 * 
 * Fast, works across languages, produces a small file.
 * 
 * Usage:
 *   node shallow_graph.js --out artifacts/memory/structural/graph.json
 *   node shallow_graph.js --src src/ --out artifacts/memory/structural/graph.json
 */

const fs = require('fs');
const path = require('path');

// Language definitions: file extensions and regex patterns for imports/exports
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
  java: {
    extensions: ['.java'],
    importPatterns: [
      /(?:^|\n)\s*import\s+([^;]+);/gm
    ],
    exportPatterns: [
      /(?:^|\n)\s*(?:public\s+)?(?:class|interface|enum|record)\s+(\w+)/gm
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
    if (config.extensions.includes(ext)) {
      return lang;
    }
  }
  return null;
}

function resolveImport(importPath, sourceFile, projectRoot) {
  // Skip external packages (no relative path, no project path)
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return null;
  }

  const sourceDir = path.dirname(sourceFile);
  let resolved = path.resolve(sourceDir, importPath);

  // Try common extensions if no extension provided
  const ext = path.extname(resolved);
  if (!ext) {
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.java', '.rb', '.php', '.c', '.h', '.cpp', '.hpp'];
    for (const tryExt of extensions) {
      if (fs.existsSync(resolved + tryExt)) {
        resolved += tryExt;
        break;
      }
    }
    // Try index files
    if (!fs.existsSync(resolved)) {
      for (const tryExt of extensions) {
        if (fs.existsSync(path.join(resolved, 'index' + tryExt))) {
          resolved = path.join(resolved, 'index' + tryExt);
          break;
        }
      }
    }
  }

  // Make relative to project root
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
      // Handle multiple imports in parentheses (Go style)
      if (importPath.includes('\n')) {
        for (const line of importPath.split('\n')) {
          const clean = line.replace(/['"]/g, '').trim();
          if (clean) {
            const resolved = resolveImport(clean, filePath, projectRoot);
            if (resolved) imports.add(resolved);
          }
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
      // Handle destructured exports: export { a, b, c }
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

function scanDirectory(dir, projectRoot, fileMap = {}) {
  if (!fs.existsSync(dir)) return fileMap;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(projectRoot, fullPath);

    if (entry.isDirectory()) {
      // Skip common non-source directories
      if (['node_modules', '.git', 'dist', 'build', 'coverage', '.opencode', 'artifacts'].includes(entry.name)) {
        continue;
      }
      scanDirectory(fullPath, projectRoot, fileMap);
    } else {
      const language = detectLanguage(fullPath);
      if (language) {
        const content = fs.readFileSync(fullPath, 'utf8');
        fileMap[relPath] = {
          path: relPath,
          language,
          exports: extractExports(content, language),
          imports: extractImports(content, language, fullPath, projectRoot)
        };
      }
    }
  }

  return fileMap;
}

function buildGraph(srcDirs, projectRoot) {
  const fileMap = {};

  for (const dir of srcDirs) {
    const fullDir = path.resolve(projectRoot, dir);
    scanDirectory(fullDir, projectRoot, fileMap);
  }

  // Compute imported_by
  const files = Object.values(fileMap);
  for (const file of files) {
    file.imported_by = [];
  }

  for (const file of files) {
    for (const imp of file.imports) {
      // Find the file that matches this import
      for (const other of files) {
        if (other.path === imp || other.path.replace(/\.(js|ts|jsx|tsx)$/, '') === imp.replace(/\.(js|ts|jsx|tsx)$/, '')) {
          if (!other.imported_by.includes(file.path)) {
            other.imported_by.push(file.path);
          }
        }
      }
    }
  }

  return {
    generated_at: new Date().toISOString(),
    file_count: files.length,
    files: files.map(f => ({
      path: f.path,
      language: f.language,
      exports: f.exports,
      imports: f.imports,
      imported_by: f.imported_by
    }))
  };
}

// CLI
function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(`Usage:
  node shallow_graph.js --src src/ --out artifacts/memory/structural/graph.json
  node shallow_graph.js --src src/,lib/,app/ --out artifacts/memory/structural/graph.json`);
    process.exit(0);
  }

  let src = 'src/';
  let out = 'artifacts/memory/structural/graph.json';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--src') src = args[i + 1];
    if (args[i] === '--out') out = args[i + 1];
  }

  const srcDirs = src.split(',').map(s => s.trim());
  const projectRoot = process.cwd();
  const graph = buildGraph(srcDirs, projectRoot);

  // Ensure output directory exists
  const outDir = path.dirname(out);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(out, JSON.stringify(graph, null, 2), 'utf8');
  console.log(JSON.stringify({
    success: true,
    files_scanned: graph.file_count,
    output: out
  }));
}

main();
