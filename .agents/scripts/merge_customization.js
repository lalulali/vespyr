#!/usr/bin/env node
// merge_customization.js — 2-file TOML merge for agent customization
// Usage: node .agents/scripts/merge_customization.js <agent-name>
//        node .agents/scripts/merge_customization.js developer

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(__dirname, '..', 'agents');
const CUSTOM_DIR = path.join(__dirname, '..', 'custom');

function parseTomlValue(raw, lineNum) {
  const str = raw.trim();
  if (str === '') throw new Error(`Empty value at line ${lineNum}`);
  if (str === 'true') return true;
  if (str === 'false') return false;
  if (/^-?\d+$/.test(str)) return parseInt(str, 10);
  if (/^-?\d+\.\d+$/.test(str)) return parseFloat(str);

  if (str.startsWith('"')) {
    if (!str.endsWith('"') || str.length < 2) throw new Error(`Unclosed string at line ${lineNum}`);
    try {
      return JSON.parse(str);
    } catch (e) {
      throw new Error(`Invalid double-quoted string at line ${lineNum}: ${e.message}`);
    }
  }

  if (str.startsWith("'")) {
    if (!str.endsWith("'") || str.length < 2) throw new Error(`Unclosed single-quoted string at line ${lineNum}`);
    return str.slice(1, -1);
  }

  if (str.startsWith('[')) {
    if (!str.endsWith(']')) throw new Error(`Unclosed array at line ${lineNum}`);
    const inner = str.slice(1, -1).trim();
    if (inner === '') return [];

    const items = [];
    let current = '';
    let inQuote = null;
    let bracketDepth = 0;
    let braceDepth = 0;

    for (let i = 0; i < inner.length; i++) {
      const c = inner[i];
      const prev = i > 0 ? inner[i - 1] : '';

      if (inQuote) {
        current += c;
        if (c === inQuote && prev !== '\\') {
          inQuote = null;
        }
      } else {
        if (c === '"' || c === "'") {
          inQuote = c;
          current += c;
        } else if (c === '[') {
          bracketDepth++;
          current += c;
        } else if (c === ']') {
          bracketDepth--;
          current += c;
        } else if (c === '{') {
          braceDepth++;
          current += c;
        } else if (c === '}') {
          braceDepth--;
          current += c;
        } else if (c === ',' && bracketDepth === 0 && braceDepth === 0) {
          const itemTrimmed = current.trim();
          if (itemTrimmed === '') throw new Error(`Empty element in array at line ${lineNum}`);
          items.push(itemTrimmed);
          current = '';
        } else {
          current += c;
        }
      }
    }

    if (inQuote) throw new Error(`Unclosed string in array at line ${lineNum}`);
    if (bracketDepth !== 0 || braceDepth !== 0) throw new Error(`Unbalanced brackets in array at line ${lineNum}`);

    const lastTrimmed = current.trim();
    if (lastTrimmed !== '') {
      items.push(lastTrimmed);
    }

    return items.map(item => parseTomlValue(item, lineNum));
  }

  if (str.startsWith('{') && str.endsWith('}')) {
    const inner = str.slice(1, -1).trim();
    if (inner === '') return {};
    const res = {};
    const parts = inner.split(',');
    for (const part of parts) {
      const kv = part.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/);
      if (!kv) throw new Error(`Invalid inline table entry at line ${lineNum}: "${part}"`);
      res[kv[1].trim()] = parseTomlValue(kv[2].trim(), lineNum);
    }
    return res;
  }

  throw new Error(`Unsupported TOML value at line ${lineNum}: "${str}"`);
}

function parseToml(content) {
  const result = {};
  const rawLines = content.split(/\r?\n/);
  let currentTable = result;

  let i = 0;
  while (i < rawLines.length) {
    let line = rawLines[i].trim();
    const lineNum = i + 1;
    i++;

    if (line === '' || line.startsWith('#')) continue;

    const headerMatch = line.match(/^\[([^\[\]]+)\]$/);
    if (headerMatch) {
      const parts = headerMatch[1].split('.');
      currentTable = result;
      for (const part of parts) {
        if (currentTable[part] !== undefined && (typeof currentTable[part] !== 'object' || Array.isArray(currentTable[part]) || currentTable[part] === null)) {
          throw new Error(`Cannot define table [${headerMatch[1]}] at line ${lineNum}: key "${part}" is already defined as non-table`);
        }
        if (!currentTable[part]) currentTable[part] = {};
        currentTable = currentTable[part];
      }
      continue;
    }

    const arrHeaderMatch = line.match(/^\[\[([^\[\]]+)\]\]$/);
    if (arrHeaderMatch) {
      const parts = arrHeaderMatch[1].split('.');
      const arrKey = parts.pop();
      currentTable = result;
      for (const part of parts) {
        if (currentTable[part] !== undefined && (typeof currentTable[part] !== 'object' || Array.isArray(currentTable[part]) || currentTable[part] === null)) {
          throw new Error(`Cannot define array table [[${arrHeaderMatch[1]}]] at line ${lineNum}: key "${part}" is already defined as non-table`);
        }
        if (!currentTable[part]) currentTable[part] = {};
        currentTable = currentTable[part];
      }
      if (currentTable[arrKey] !== undefined && !Array.isArray(currentTable[arrKey])) {
        throw new Error(`Cannot redefine non-array key "${arrKey}" as table array at line ${lineNum}`);
      }
      if (!Array.isArray(currentTable[arrKey])) currentTable[arrKey] = [];
      const newItem = {};
      currentTable[arrKey].push(newItem);
      currentTable = newItem;
      continue;
    }

    const kvMatch = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      let valStr = kvMatch[2].trim();

      if (valStr.startsWith('[') && !valStr.endsWith(']')) {
        while (i < rawLines.length && !valStr.endsWith(']')) {
          const nextLine = rawLines[i].trim();
          i++;
          valStr += ' ' + nextLine;
        }
      }

      currentTable[key] = parseTomlValue(valStr, lineNum);
      continue;
    }

    throw new Error(`Invalid TOML syntax at line ${lineNum}: "${line}"`);
  }

  return result;
}

function deepMerge(defaults, override) {
  const result = { ...defaults };
  for (const key of Object.keys(override)) {
    const dv = defaults[key];
    const ov = override[key];
    if (dv === undefined) { result[key] = ov; continue; }
    if (Array.isArray(dv) && Array.isArray(ov)) {
      const hasKey = dv.length > 0 && dv.every(item => item && typeof item === 'object' && (item.code || item.id));
      if (hasKey) {
        const merged = [...dv];
        for (const newItem of ov) {
          const matchIdx = merged.findIndex(old =>
            (old.code && old.code === (newItem.code || '')) ||
            (old.id && old.id === (newItem.id || ''))
          );
          if (matchIdx >= 0) merged[matchIdx] = deepMerge(merged[matchIdx], newItem);
          else merged.push(newItem);
        }
        result[key] = merged;
      } else {
        result[key] = [...dv, ...ov];
      }
    } else if (typeof dv === 'object' && typeof ov === 'object' && dv !== null && ov !== null && !Array.isArray(dv) && !Array.isArray(ov)) {
      result[key] = deepMerge(dv, ov);
    } else {
      result[key] = ov;
    }
  }
  return result;
}

const agentName = process.argv[2];
if (!agentName) {
  console.error('Usage: node .agents/scripts/merge_customization.js <agent-name>');
  process.exit(1);
}

const defaultsPath = path.join(AGENTS_DIR, agentName, 'customize.toml');
const overridePath = path.join(CUSTOM_DIR, `${agentName}.toml`);

let defaults = {};
let override = {};

try {
  if (fs.existsSync(defaultsPath)) {
    defaults = parseToml(fs.readFileSync(defaultsPath, 'utf8'));
  }
  if (fs.existsSync(overridePath)) {
    override = parseToml(fs.readFileSync(overridePath, 'utf8'));
  }
} catch (error) {
  console.error(`Invalid customization for agent ${agentName}: ${error.message}`);
  process.exit(1);
}

if (!fs.existsSync(defaultsPath) && !fs.existsSync(overridePath)) {
  console.error(`No customization files found for agent: ${agentName}`);
  process.exit(1);
}

const merged = deepMerge(defaults, override);
console.log(JSON.stringify(merged, null, 2));
