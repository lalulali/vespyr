#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { editFile, summarize } = require('./lib/safe_edit');

const SKILLS_DIR = path.resolve(__dirname, '..', 'skills');

function getStepFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file.startsWith('steps')) {
        const subFiles = fs.readdirSync(filePath);
        subFiles.forEach(subFile => {
          if (subFile.endsWith('.md')) {
            results.push(path.join(filePath, subFile));
          }
        });
      } else {
        results = results.concat(getStepFiles(filePath));
      }
    }
  });
  return results;
}

const stepFiles = getStepFiles(SKILLS_DIR);
let modifiedCount = 0;
let skippedCount = 0;
const failed = [];

stepFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf-8');

  if (content.includes('step_tracker.js')) {
    skippedCount++;
    return;
  }

  // Parse frontmatter
  const fmMatch = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
  if (!fmMatch) {
    console.warn(`WARNING: No frontmatter in ${path.relative(SKILLS_DIR, filePath)}`);
    return;
  }

  const fmText = fmMatch[1];
  const stepMatch = fmText.match(/^step:\s*(\d+[a-z]?)/m);
  if (!stepMatch) {
    console.warn(`WARNING: No step number in ${path.relative(SKILLS_DIR, filePath)}`);
    return;
  }

  const step = stepMatch[1];
  const modeMatch = fmText.match(/^mode:\s*(\S+)/m);
  
  // Extract skill name from path
  const pathParts = filePath.split(path.sep);
  const stepsIndex = pathParts.findIndex(part => part.startsWith('steps'));
  if (stepsIndex === -1 || stepsIndex < 1) {
    console.warn(`WARNING: Invalid path structure for ${filePath}`);
    return;
  }
  let skill = pathParts[stepsIndex - 1];
  if (modeMatch) {
    skill = `${skill}-${modeMatch[1].trim()}`;
  }

  const beginCall = `> **Tracker:** \`node .agents/scripts/step_tracker.js begin --skill ${skill} --step ${step}\``;

  // Injected begin call. THREE fallbacks, tried in order. Previously, if all
  // three anchors were absent the script fell through, added only the `complete`
  // call, wrote the file, and counted it as modified — leaving a step file with
  // a half-migrated tracker pair and a success message. An unresolvable insert
  // point is now a FAILURE and the file is left untouched.
  let next = null;
  if (content.includes('## Process')) {
    next = content.replace('## Process', `## Process\n${beginCall}`);
  } else {
    const firstHeading2 = content.indexOf('\n## ');
    if (firstHeading2 !== -1) {
      next = content.slice(0, firstHeading2) + `\n\n${beginCall}` + content.slice(firstHeading2);
    } else {
      const endFm = content.indexOf('---', 3);
      if (endFm !== -1) {
        next = content.slice(0, endFm + 3) + `\n\n${beginCall}` + content.slice(endFm + 3);
      }
    }
  }

  if (next === null) {
    const rel = path.relative(SKILLS_DIR, filePath);
    console.error(`FAIL: ${rel} — no insertion point for the begin call (tried "## Process", the first "## " heading, and end-of-frontmatter). File left untouched.`);
    failed.push({ ok: false, reason: 'no-insert-point-for-begin-call', path: filePath, label: rel });
    return;
  }

  // Injected complete call
  next = next.trim() + `\n\n> **Tracker:** \`node .agents/scripts/step_tracker.js complete --skill ${skill} --step ${step}\`\n`;

  const r = editFile(filePath, () => ({ ok: true, reason: null, content: next }));
  if (r.ok) {
    modifiedCount++;
  } else {
    console.error(`FAIL: ${path.relative(SKILLS_DIR, filePath)} — ${r.reason}`);
    failed.push({ ...r, label: path.relative(SKILLS_DIR, filePath) });
  }
});

console.log(`\nProcessed all step files.`);
console.log(`Modified: ${modifiedCount}`);
console.log(`Skipped (already tracked): ${skippedCount}`);
process.exit(summarize('Step tracker calls', failed));
