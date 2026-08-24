#!/usr/bin/env node
/**
 * Archive Manager — Deterministic, Safe JSON Operations for Vespyr Memory Archive
 *
 * Supports both legacy JSON array format and new NDJSON append-only format.
 * Uses temp-file + rename pattern to prevent corruption on crash.
 * Validates schema before every write.
 *
 * Usage:
 *   node archive_manager.js validate --file artifacts/memory/archive/index.json
 *   node archive_manager.js append --file artifacts/memory/archive/index.json --entry '{...}'
 *   node archive_manager.js append-ndjson --file artifacts/memory/archive/index.ndjson --entry '{...}'
 *   node archive_manager.js search-ndjson --file artifacts/memory/archive/index.ndjson --query "auth token"
 *   node archive_manager.js migrate --from index.json --to index.ndjson
 *   node archive_manager.js merge --ours index.json --theirs index.json --out index.json
 */

const fs = require('fs');
const { writeFileSync: atomicWriteFileSync, writeJsonSync: atomicWriteJson } = require('./lib/fs_atomic.js');
const path = require('path');

const SCHEMA_VERSION = '1.0';

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error(`Invalid JSON in ${filePath}: ${e.message}`);
  }
}

function writeJsonAtomic(filePath, data) {
  // Delegates to the shared crash-safe helper (02h WS-5): tmp+rename with
  // EXDEV/EPERM fallback and temp cleanup on failure.
  atomicWriteJson(filePath, data);
}

function validateSchema(data) {
  if (typeof data !== 'object' || data === null) {
    return { valid: false, error: 'Root must be an object' };
  }
  if (data.schema_version !== SCHEMA_VERSION) {
    return { valid: false, error: `schema_version must be "${SCHEMA_VERSION}"` };
  }
  if (!data.created || !/\d{4}-\d{2}-\d{2}/.test(data.created)) {
    return { valid: false, error: 'created must be YYYY-MM-DD' };
  }
  if (!data.last_updated || !/\d{4}-\d{2}-\d{2}/.test(data.last_updated)) {
    return { valid: false, error: 'last_updated must be YYYY-MM-DD' };
  }
  if (!Array.isArray(data.entries)) {
    return { valid: false, error: 'entries must be an array' };
  }
  for (let i = 0; i < data.entries.length; i++) {
    const entry = data.entries[i];
    const required = ['id', 'title', 'domain', 'keywords', 'date', 'status', 'summary', 'location'];
    for (const key of required) {
      if (!(key in entry)) {
        return { valid: false, error: `Entry ${i} missing required field: ${key}` };
      }
    }
    if (!['resolved', 'superseded', 'stale'].includes(entry.status)) {
      return { valid: false, error: `Entry ${i} invalid status: ${entry.status}` };
    }
    if (!Array.isArray(entry.keywords)) {
      return { valid: false, error: `Entry ${i} keywords must be an array` };
    }
    if (!Array.isArray(entry.referenced_by || [])) {
      return { valid: false, error: `Entry ${i} referenced_by must be an array` };
    }
    if (!Array.isArray(entry.references || [])) {
      return { valid: false, error: `Entry ${i} references must be an array` };
    }
  }
  return { valid: true, entries: data.entries.length };
}

function createEmptyIndex() {
  const today = new Date().toISOString().split('T')[0];
  return {
    schema_version: SCHEMA_VERSION,
    created: today,
    last_updated: today,
    entries: []
  };
}

// Auto-detect index format and return { format, data }.
//   NDJSON (canonical): a schema header line + one JSON entry object per line
//   Legacy JSON:        a single object with an `entries` array
function readIndex(filePath) {
  if (!fs.existsSync(filePath)) {
    return { format: 'json', data: createEmptyIndex() };
  }
  const content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content) {
    return { format: 'json', data: createEmptyIndex() };
  }

  // NDJSON detection: every non-empty line parses as a JSON object, and at
  // least one line carries an `id` (an entry, not just the schema header).
  const lines = content.split('\n');
  let ndjsonOk = true;
  let entryLines = 0;
  for (const l of lines) {
    const s = l.trim();
    if (!s) continue;
    try {
      const obj = JSON.parse(s);
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
        ndjsonOk = false;
        break;
      }
      if (obj.id) entryLines++;
    } catch (e) {
      ndjsonOk = false;
      break;
    }
  }

  if (ndjsonOk && entryLines > 0) {
    const entries = [];
    let header = null;
    for (const l of lines) {
      const s = l.trim();
      if (!s) continue;
      const obj = JSON.parse(s);
      if (obj.id) {
        entries.push(obj);
      } else if (!header) {
        header = obj; // schema header line (no `id`)
      }
    }
    return {
      format: 'ndjson',
      data: {
        schema_version: (header && header.schema_version) || SCHEMA_VERSION,
        created: header && header.created,
        last_updated: header && header.last_updated,
        entries
      }
    };
  }

  // Legacy JSON: single object. A header-only NDJSON index (schema object,
  // zero entries) lands here too — normalize it to an empty index.
  let data;
  try {
    data = JSON.parse(content);
  } catch (e) {
    throw new Error(`Invalid JSON in ${filePath}: ${e.message}`);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`Invalid index in ${filePath}: root must be an object`);
  }
  // A schema-only object (no `entries` array) is the NDJSON empty-archive
  // case written by appendNdjson; legacy JSON indexes always carry `entries`.
  if (!Array.isArray(data.entries) && typeof data.schema_version === 'string') {
    data.entries = [];
    return { format: 'ndjson', data };
  }
  return { format: 'json', data };
}

function appendEntry(filePath, entry) {
  let data = readJson(filePath);
  if (!data) {
    data = createEmptyIndex();
  }

  const validation = validateSchema(data);
  if (!validation.valid) {
    throw new Error(`Schema validation failed: ${validation.error}`);
  }

  // Validate entry
  const required = ['id', 'title', 'domain', 'keywords', 'date', 'status', 'summary', 'location'];
  for (const key of required) {
    if (!(key in entry)) {
      throw new Error(`Entry missing required field: ${key}`);
    }
  }

  // Check for duplicate ID
  if (data.entries.some(e => e.id === entry.id)) {
    throw new Error(`Duplicate entry ID: ${entry.id}`);
  }

  // Auto-populate optional fields
  if (!entry.referenced_by) entry.referenced_by = [];
  if (!entry.references) entry.references = [];
  if (!entry.archived_by) entry.archived_by = '@memory-controller';
  if (!entry.archived_on) entry.archived_on = new Date().toISOString().split('T')[0];

  data.entries.push(entry);
  data.last_updated = new Date().toISOString().split('T')[0];

  writeJsonAtomic(filePath, data);
  return { success: true, entries: data.entries.length };
}

function mergeIndexes(oursPath, theirsPath, outPath) {
  const ours = readIndex(oursPath);
  const theirs = readIndex(theirsPath);

  // Output format: NDJSON when either input is NDJSON (canonical format),
  // legacy JSON only when both inputs are legacy JSON.
  const outFormat = (ours.format === 'ndjson' || theirs.format === 'ndjson') ? 'ndjson' : 'json';

  const merged = createEmptyIndex();
  const createdA = ours.data.created || merged.created;
  const createdB = theirs.data.created || merged.created;
  merged.created = createdA < createdB ? createdA : createdB;

  const seen = new Set();
  for (const entry of [...ours.data.entries, ...theirs.data.entries]) {
    if (!seen.has(entry.id)) {
      seen.add(entry.id);
      merged.entries.push(entry);
    }
  }

  // Sort by date
  merged.entries.sort((a, b) => a.date.localeCompare(b.date));
  merged.last_updated = new Date().toISOString().split('T')[0];

  if (outFormat === 'ndjson') {
    ensureDir(outPath);
    const header = JSON.stringify({
      schema_version: SCHEMA_VERSION,
      created: merged.created,
      last_updated: merged.last_updated
    });
    atomicWriteFileSync(outPath, header + '\n');
    for (const entry of merged.entries) {
      fs.appendFileSync(outPath, JSON.stringify(entry) + '\n', 'utf8');
    }
  } else {
    writeJsonAtomic(outPath, merged);
  }

  return {
    success: true,
    format: outFormat,
    entries: merged.entries.length,
    duplicates_removed: (ours.data.entries.length + theirs.data.entries.length) - merged.entries.length
  };
}

function updateReferences(filePath, entryId, referencedById) {
  let data = readJson(filePath);
  if (!data) {
    throw new Error(`Index file not found: ${filePath}`);
  }

  const entry = data.entries.find(e => e.id === entryId);
  if (!entry) {
    throw new Error(`Entry not found: ${entryId}`);
  }

  if (!entry.referenced_by.includes(referencedById)) {
    entry.referenced_by.push(referencedById);
    data.last_updated = new Date().toISOString().split('T')[0];
    writeJsonAtomic(filePath, data);
  }

  return { success: true };
}

// NDJSON operations — append-only, zero-read writes

function appendNdjson(filePath, entry) {
  ensureDir(filePath);

  // Validate entry
  const required = ['id', 'title', 'domain', 'keywords', 'date', 'status', 'summary', 'location'];
  for (const key of required) {
    if (!(key in entry)) {
      throw new Error(`Entry missing required field: ${key}`);
    }
  }

  // Keywords must be an array (same check as validateSchema/appendEntry)
  if (!Array.isArray(entry.keywords)) {
    throw new Error('Entry keywords must be an array');
  }

  // Auto-populate optional fields
  if (!entry.referenced_by) entry.referenced_by = [];
  if (!entry.references) entry.references = [];
  if (!entry.archived_by) entry.archived_by = '@memory-controller';
  if (!entry.archived_on) entry.archived_on = new Date().toISOString().split('T')[0];

  // Write header if file doesn't exist
  if (!fs.existsSync(filePath)) {
    const header = JSON.stringify({ schema_version: SCHEMA_VERSION, created: new Date().toISOString().split('T')[0], last_updated: new Date().toISOString().split('T')[0] }) + '\n';
    atomicWriteFileSync(filePath, header);
  }

  // Append entry as single line
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(filePath, line, 'utf8');
  return { success: true, format: 'ndjson' };
}

function searchNdjson(filePath, query, maxResults = 10) {
  if (!fs.existsSync(filePath)) {
    return { error: 'Archive file not found', results: [] };
  }

  const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const results = [];

  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim());
  // First line is header, skip it
  for (let i = 1; i < lines.length; i++) {
    try {
      const entry = JSON.parse(lines[i]);
      let score = 0;
      const titleLower = (entry.title || '').toLowerCase();
      const summaryLower = (entry.summary || '').toLowerCase();
      const domainLower = (entry.domain || '').toLowerCase();
      const entryKeywords = (entry.keywords || []).map(k => k.toLowerCase());

      for (const kw of keywords) {
        if (titleLower.includes(kw)) score += 3;
        if (entryKeywords.some(ek => ek.includes(kw) || kw.includes(ek))) score += 2;
        const matches = (summaryLower.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        score += Math.min(matches, 4);
        if (domainLower.includes(kw)) score += 2;
      }

      if (score >= 2) {
        results.push({ ...entry, score });
      }
    } catch (e) {
      // Skip corrupt lines
    }
  }

  results.sort((a, b) => b.score - a.score);
  return { results: results.slice(0, maxResults), total_matches: results.length };
}

function migrateJsonToNdjson(fromPath, toPath) {
  if (!fs.existsSync(fromPath)) {
    throw new Error(`Source file not found: ${fromPath}`);
  }

  const data = JSON.parse(fs.readFileSync(fromPath, 'utf8'));
  const entries = data.entries || [];

  // Write header
  const header = JSON.stringify({
    schema_version: data.schema_version || SCHEMA_VERSION,
    created: data.created || new Date().toISOString().split('T')[0],
    last_updated: new Date().toISOString().split('T')[0]
  }) + '\n';

  ensureDir(toPath);
  atomicWriteFileSync(toPath, header);

  // Write each entry as a line
  for (const entry of entries) {
    fs.appendFileSync(toPath, JSON.stringify(entry) + '\n', 'utf8');
  }

  return { success: true, entries_migrated: entries.length, from: fromPath, to: toPath };
}

// CLI
function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(`Usage:
  node archive_manager.js validate --file <path>
  node archive_manager.js append --file <path> --entry '<json>'
  node archive_manager.js append-ndjson --file <path> --entry '<json>'
  node archive_manager.js search-ndjson --file <path> --query "<query>" [--max N]
  node archive_manager.js migrate --from <json_path> --to <ndjson_path>
  node archive_manager.js merge --ours <path> --theirs <path> --out <path>
  node archive_manager.js update-refs --file <path> --entry <id> --referenced-by <id>`);
    process.exit(0);
  }

  const cmd = args[0];

  try {
    if (cmd === 'validate') {
      const fileIdx = args.indexOf('--file');
      const filePath = fileIdx >= 0 ? args[fileIdx + 1] : null;
      if (!filePath) { console.error('Missing --file'); process.exit(1); }
      if (!fs.existsSync(filePath)) {
        console.log(JSON.stringify({ valid: false, error: 'File not found' }));
        process.exit(1);
      }
      const { format, data } = readIndex(filePath);
      const result = validateSchema(data);
      result.format = format;
      console.log(JSON.stringify(result));
    }

    if (cmd === 'append') {
      const fileIdx = args.indexOf('--file');
      const entryIdx = args.indexOf('--entry');
      const filePath = fileIdx >= 0 ? args[fileIdx + 1] : null;
      const entryStr = entryIdx >= 0 ? args[entryIdx + 1] : null;
      if (!filePath || !entryStr) { console.error('Missing --file or --entry'); process.exit(1); }
      const entry = JSON.parse(entryStr);
      const result = appendEntry(filePath, entry);
      console.log(JSON.stringify(result));
    }

    if (cmd === 'merge') {
      const oursIdx = args.indexOf('--ours');
      const theirsIdx = args.indexOf('--theirs');
      const outIdx = args.indexOf('--out');
      const oursPath = oursIdx >= 0 ? args[oursIdx + 1] : null;
      const theirsPath = theirsIdx >= 0 ? args[theirsIdx + 1] : null;
      const outPath = outIdx >= 0 ? args[outIdx + 1] : null;
      if (!oursPath || !theirsPath || !outPath) { console.error('Missing --ours, --theirs, or --out'); process.exit(1); }
      const result = mergeIndexes(oursPath, theirsPath, outPath);
      console.log(JSON.stringify(result));
    }

    if (cmd === 'update-refs') {
      const fileIdx = args.indexOf('--file');
      const entryIdx = args.indexOf('--entry');
      const refIdx = args.indexOf('--referenced-by');
      const filePath = fileIdx >= 0 ? args[fileIdx + 1] : null;
      const entryId = entryIdx >= 0 ? args[entryIdx + 1] : null;
      const refId = refIdx >= 0 ? args[refIdx + 1] : null;
      if (!filePath || !entryId || !refId) { console.error('Missing required args'); process.exit(1); }
      const result = updateReferences(filePath, entryId, refId);
      console.log(JSON.stringify(result));
    }

    if (cmd === 'append-ndjson') {
      const fileIdx = args.indexOf('--file');
      const entryIdx = args.indexOf('--entry');
      const filePath = fileIdx >= 0 ? args[fileIdx + 1] : null;
      const entryStr = entryIdx >= 0 ? args[entryIdx + 1] : null;
      if (!filePath || !entryStr) { console.error('Missing --file or --entry'); process.exit(1); }
      const entry = JSON.parse(entryStr);
      const result = appendNdjson(filePath, entry);
      console.log(JSON.stringify(result));
    }

    if (cmd === 'search-ndjson') {
      const fileIdx = args.indexOf('--file');
      const queryIdx = args.indexOf('--query');
      const maxIdx = args.indexOf('--max');
      const filePath = fileIdx >= 0 ? args[fileIdx + 1] : null;
      const query = queryIdx >= 0 ? args[queryIdx + 1] : null;
      const max = maxIdx >= 0 ? parseInt(args[maxIdx + 1], 10) : 10;
      if (!filePath || !query) { console.error('Missing --file or --query'); process.exit(1); }
      const result = searchNdjson(filePath, query, max);
      console.log(JSON.stringify(result, null, 2));
    }

    if (cmd === 'migrate') {
      const fromIdx = args.indexOf('--from');
      const toIdx = args.indexOf('--to');
      const fromPath = fromIdx >= 0 ? args[fromIdx + 1] : null;
      const toPath = toIdx >= 0 ? args[toIdx + 1] : null;
      if (!fromPath || !toPath) { console.error('Missing --from or --to'); process.exit(1); }
      const result = migrateJsonToNdjson(fromPath, toPath);
      console.log(JSON.stringify(result));
    }
  } catch (e) {
    console.error(JSON.stringify({ success: false, error: e.message }));
    process.exit(1);
  }
}

main();
