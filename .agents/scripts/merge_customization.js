#!/usr/bin/env node
// merge_customization.js — 2-file TOML merge for agent customization
// Usage: node .agents/scripts/merge_customization.js <agent-name>
//        node .agents/scripts/merge_customization.js developer

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(__dirname, '..', 'agents');
const CUSTOM_DIR = path.join(__dirname, '..', 'custom');

function splitArrayItems(value, lineNumber) {
  const items = [];
  let current = '';
  let quote = null;

  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if ((char === '"' || char === "'") && value[i - 1] !== '\\') {
      quote = quote === char ? null : quote || char;
    }
    if (char === ',' && !quote) {
      if (!current.trim()) throw new Error(`Invalid empty array item at line ${lineNumber}`);
      items.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (quote) throw new Error(`Unclosed string at line ${lineNumber}`);
  if (!current.trim()) throw new Error(`Invalid empty array item at line ${lineNumber}`);
  items.push(current.trim());
  return items;
}

function parseValue(rawValue, lineNumber) {
  const value = rawValue.trim();

  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value);

  if ((value.startsWith('"') || value.startsWith("'"))) {
    const quote = value[0];
    if (value.length < 2 || value[value.length - 1] !== quote) {
      throw new Error(`Unclosed string at line ${lineNumber}`);
    }
    return value.slice(1, -1);
  }

  if (value.startsWith('[') || value.endsWith(']')) {
    if (!value.startsWith('[') || !value.endsWith(']')) {
      throw new Error(`Malformed array at line ${lineNumber}`);
    }
    const inner = value.slice(1, -1).trim();
    return inner ? splitArrayItems(inner, lineNumber).map(item => parseValue(item, lineNumber)) : [];
  }

  throw new Error(`Unsupported TOML value at line ${lineNumber}`);
}

function parseToml(content) {
  const result = {};
  const lines = content.split('\n');
  let currentTable = result;
  const tableStack = [];
  let currentPath = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === '' || line.startsWith('#')) continue;

    const headerMatch = line.match(/^\[([^\]]+)\]$/);
    if (headerMatch) {
      currentPath = headerMatch[1];
      const parts = currentPath.split('.');
      currentTable = result;
      for (const part of parts) {
        if (!currentTable[part]) currentTable[part] = {};
        currentTable = currentTable[part];
      }
      continue;
    }

    const arrayHeaderMatch = line.match(/^\[\[([^\]]+)\]\]$/);
    if (arrayHeaderMatch) {
      currentPath = arrayHeaderMatch[1];
      const parts = currentPath.split('.');
      const arrKey = parts.pop();
      currentTable = result;
      for (const part of parts) {
        if (!currentTable[part]) currentTable[part] = {};
        currentTable = currentTable[part];
      }
      if (!Array.isArray(currentTable[arrKey])) currentTable[arrKey] = [];
      const newItem = {};
      currentTable[arrKey].push(newItem);
      currentTable = newItem;
      continue;
    }

    const kvMatch = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      currentTable[key] = parseValue(kvMatch[2], i + 1);
      continue;
    }

    throw new Error(`Invalid TOML syntax at line ${i + 1}`);
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
