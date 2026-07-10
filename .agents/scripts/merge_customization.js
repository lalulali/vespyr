#!/usr/bin/env node
// merge_customization.js — 2-file TOML merge for agent customization
// Usage: node .agents/scripts/merge_customization.js <agent-name>
//        node .agents/scripts/merge_customization.js developer

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(__dirname, '..', 'agents');
const CUSTOM_DIR = path.join(__dirname, '..', 'custom');

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

    const kvMatch = line.match(/^(\S+)\s*=\s*(.+)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      let value = kvMatch[2].trim();

      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (/^\d+$/.test(value)) value = parseInt(value, 10);
      else if (/^\d+\.\d+$/.test(value)) value = parseFloat(value);
      else if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);

      currentTable[key] = value;
      continue;
    }
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

if (fs.existsSync(defaultsPath)) {
  defaults = parseToml(fs.readFileSync(defaultsPath, 'utf8'));
}
if (fs.existsSync(overridePath)) {
  override = parseToml(fs.readFileSync(overridePath, 'utf8'));
}

if (!fs.existsSync(defaultsPath) && !fs.existsSync(overridePath)) {
  console.error(`No customization files found for agent: ${agentName}`);
  process.exit(1);
}

const merged = deepMerge(defaults, override);
console.log(JSON.stringify(merged, null, 2));
