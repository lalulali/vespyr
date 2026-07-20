#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
  const stepMatch = fmText.match(/^step:\s*(\d+)/m);
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

  // Injected begin call
  if (content.includes('## Process')) {
    content = content.replace('## Process', `## Process\n> **Tracker:** \`node .agents/scripts/step_tracker.js begin --skill ${skill} --step ${step}\``);
  } else {
    const firstHeading2 = content.indexOf('\n## ');
    if (firstHeading2 !== -1) {
      content = content.slice(0, firstHeading2) + `\n\n> **Tracker:** \`node .agents/scripts/step_tracker.js begin --skill ${skill} --step ${step}\`` + content.slice(firstHeading2);
    } else {
      const endFm = content.indexOf('---', 3);
      if (endFm !== -1) {
        content = content.slice(0, endFm + 3) + `\n\n> **Tracker:** \`node .agents/scripts/step_tracker.js begin --skill ${skill} --step ${step}\`` + content.slice(endFm + 3);
      }
    }
  }

  // Injected complete call
  content = content.trim() + `\n\n> **Tracker:** \`node .agents/scripts/step_tracker.js complete --skill ${skill} --step ${step}\`\n`;

  fs.writeFileSync(filePath, content, 'utf-8');
  modifiedCount++;
});

console.log(`\nProcessed all step files.`);
console.log(`Modified: ${modifiedCount}`);
console.log(`Skipped (already tracked): ${skippedCount}`);
