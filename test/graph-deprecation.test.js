const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Files and paths that MUST NOT exist physically
const deletedPaths = [
  '.agents/scripts/shallow_graph.js',
  '.agents/scripts/incremental_graph.js',
  '.agents/scripts/doc_graph.js',
  '.agents/scripts/ensure_graph.js',
  '.agents/scripts/query_graph.js',
  'artifacts/memory/structural/code-graph.json',
  'artifacts/memory/structural/doc-graph.json',
  '.agents/skills/code-graph',
  '.agents/skills/doc-graph'
];

for (const p of deletedPaths) {
  const full = path.join(process.cwd(), p);
  assert.strictEqual(fs.existsSync(full), false, `File/directory should be deleted: ${p}`);
}

// Patterns that must not appear in codebase (outside migration plans and decisions)
const forbiddenPatterns = [
  'query_graph.js',
  'shallow_graph.js',
  'incremental_graph.js',
  'ensure_graph.js',
  'doc_graph.js',
  'code-graph.json',
  'doc-graph.json',
  '/code-graph',
  '/doc-graph'
];

const ignoredFiles = [
  '02h-phase-1-graph-shutup-and-cli.md',
  'active-decisions.md',
  'changelog.md',
  'graph-deprecation.test.js',
  'session-summaries',
  'pipeline-state.json'
];

function scanDirectory(dir) {
  let violations = [];
  const entries = fs.readdirSync(dir);
  for (const item of entries) {
    if (['node_modules', '.git', '.gemini', 'structural'].includes(item)) continue;
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      violations = violations.concat(scanDirectory(full));
    } else if (stat.isFile() && (full.endsWith('.js') || full.endsWith('.md') || full.endsWith('.canonical') || full.endsWith('.json'))) {
      if (ignoredFiles.some(ign => full.includes(ign))) continue;
      const content = fs.readFileSync(full, 'utf8');
      for (const pattern of forbiddenPatterns) {
        if (content.includes(pattern)) {
          violations.push({ file: path.relative(process.cwd(), full), pattern });
        }
      }
    }
  }
  return violations;
}

const violations = scanDirectory(process.cwd());
if (violations.length > 0) {
  console.error('Graph deprecation test failed! Found lingering graph references:');
  violations.forEach(v => console.error(`  - ${v.file}: contains "${v.pattern}"`));
  process.exit(1);
} else {
  console.log('✓ graph-deprecation.test.js: All graph files deleted and zero lingering references found.');
}
