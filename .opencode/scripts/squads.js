#!/usr/bin/env node
/**
 * Squad Manager — Loader and parser for curated agent squads in Vespyr
 */

const fs = require('fs');
const path = require('path');

const SQUADS_DIR = path.join(__dirname, '..', 'squads');

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { data: {}, body: content };

  const yamlStr = match[1];
  const body = content.substring(match[0].length).trim();
  const data = {};
  
  let currentKey = null;
  let currentArray = null;

  const lines = yamlStr.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Array item starting with -
    if (trimmed.startsWith('-') && currentArray) {
      const val = trimmed.substring(1).trim().replace(/^['"]|['"]$/g, '');
      currentArray.push(val);
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.substring(0, colonIdx).trim();
      const val = line.substring(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      
      if (val === '') {
        currentKey = key;
        currentArray = [];
        data[key] = currentArray;
      } else {
        currentKey = key;
        currentArray = null;
        data[key] = val;
      }
    }
  }

  return { data, body };
}

function loadSquad(name) {
  const squadPath = path.join(SQUADS_DIR, `${name}.md`);
  if (!fs.existsSync(squadPath)) {
    throw new Error(`Squad definition not found for: ${name}`);
  }
  const content = fs.readFileSync(squadPath, 'utf8');
  const { data } = parseFrontmatter(content);
  return {
    name: data.name || name,
    description: data.description || '',
    agents: Array.isArray(data.agents) ? data.agents : []
  };
}

function listSquads() {
  if (!fs.existsSync(SQUADS_DIR)) return [];
  return fs.readdirSync(SQUADS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const name = path.basename(f, '.md');
      try {
        return loadSquad(name);
      } catch (e) {
        return { name, error: e.message };
      }
    });
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(`Usage:
  node squads.js list
  node squads.js view <squad-name>`);
    process.exit(0);
  }

  const cmd = args[0];
  if (cmd === 'list') {
    const squads = listSquads();
    console.log(JSON.stringify(squads, null, 2));
  } else if (cmd === 'view' && args[1]) {
    try {
      const squad = loadSquad(args[1]);
      console.log(JSON.stringify(squad, null, 2));
    } catch (e) {
      console.error(JSON.stringify({ error: e.message }));
      process.exit(1);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  loadSquad,
  listSquads,
  parseFrontmatter
};
