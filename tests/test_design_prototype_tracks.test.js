#!/usr/bin/env node
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
function read(...parts) {
  return fs.readFileSync(path.join(ROOT, ...parts), 'utf8');
}

test('design skill exposes explicit static and component prototype tracks', () => {
  const skill = read('.agents', 'skills', 'design', 'SKILL.md');
  assert.match(skill, /static-html/);
  assert.match(skill, /nextjs-component/);
  assert.match(skill, /Tailwind Browser CDN/);
  assert.match(skill, /@shadcn\/lint/);
  assert.match(skill, /prototype-collaboration\.md/);
  assert.ok(fs.existsSync(path.join(ROOT, '.agents', 'templates', 'product', 'prototype-collaboration-template.md')));
});

test('Step 0 and R1 route the track without allowing detection to override user intent', () => {
  const step0 = read('.agents', 'skills', 'design', 'steps', 'step-00-scope-and-decision-anchoring.md');
  const step1d = read('.agents', 'skills', 'design', 'steps', 'step-01d-ingest-prototype.md');
  assert.match(step0, /explicit user choice wins/i);
  assert.match(step0, /two-track fork/i);
  assert.match(step1d, /static-html/);
  assert.match(step1d, /nextjs-component/);
  assert.match(step1d, /@shadcn\/lint/);
  assert.match(step1d, /Tailwind CDN/);
  assert.match(step1d, /prototype_collab_gate\.js verify/);
  assert.ok(fs.existsSync(path.join(ROOT, '.agents', 'scripts', 'prototype_collab_gate.js')));
});

test('prototype handoff requires designer-tech collaboration', () => {
  const step1d = read('.agents', 'skills', 'design', 'steps', 'step-01d-ingest-prototype.md');
  const step4a = read('.agents', 'skills', 'design', 'steps', 'step-04a-screen-states.md');
  const step4d = read('.agents', 'skills', 'design', 'steps', 'step-04d-parity-gate.md');
  const handoff = read('.agents', 'skills', 'design', 'steps', 'step-06a-handoff.md');
  const designer = read('.agents', 'agents', 'product-designer.md');
  const techLead = read('.agents', 'agents', 'tech-lead.md');
  const develop = read('.agents', 'skills', 'develop', 'SKILL.md');
  const developAlignment = read('.agents', 'skills', 'develop', 'steps', 'step-01-spec-alignment.md');
  for (const text of [step1d, step4a, step4d, handoff, designer, techLead, develop, developAlignment]) {
    assert.match(text, /prototype-collaboration\.md/);
    assert.match(text, /@product-designer/);
    assert.match(text, /@tech-lead/);
  }
  assert.match(step1d, /SATISFIED/);
  assert.match(step1d, /BLOCKED/);
});

test('designer guidance distinguishes shadcn-flavored HTML from real shadcn components', () => {
  const guidelines = read('.agents', 'references', 'designer-guidelines.md');
  assert.match(guidelines, /static-html/);
  assert.match(guidelines, /nextjs-component/);
  assert.match(guidelines, /not installed shadcn/i);
});
