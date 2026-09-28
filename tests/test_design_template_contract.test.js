#!/usr/bin/env node
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('design skill declares one canonical PRD and user-story contract for both modes', () => {
  const skill = read('.agents/skills/design/SKILL.md');
  assert.match(skill, /## Canonical document contracts/);
  assert.match(skill, /\.agents\/templates\/product\/prd-template\.md/);
  assert.match(skill, /\.agents\/templates\/product\/user-story-template\.md/);
  assert.match(skill, /compact report is not an acceptable substitute/);
  assert.match(skill, /Traces to PRD/);
  assert.match(skill, /L-NN/);
});

test('create-mode steps require the full canonical document structures', () => {
  const personas = read('.agents/skills/design/steps/step-02a-define-personas.md');
  const stories = read('.agents/skills/design/steps/step-03a-user-stories.md');
  assert.match(personas, /prd-template\.md/);
  assert.match(personas, /complete numbered structure/);
  assert.match(stories, /user-story-template\.md/);
  assert.match(stories, /Backlog tree|backlog tree/);
  assert.match(stories, /Gherkin/);
  assert.match(stories, /Traces to PRD/);
});

test('reverse-mode steps preserve templates and enforce ledger grounding', () => {
  const productManager = read('.agents/agents/product-manager.md');
  const ledger = read('.agents/skills/design/steps/step-02d-evidence-ledger.md');
  const synthesis = read('.agents/skills/design/steps/step-03d-prd-synthesis.md');
  const parity = read('.agents/skills/design/steps/step-04d-parity-gate.md');
  assert.match(ledger, /prd-template\.md/);
  assert.match(ledger, /§14/);
  assert.match(ledger, /L-NN/);
  assert.match(ledger, /Type/);
  assert.match(ledger, /Status/);
  assert.match(synthesis, /prd-template\.md/);
  assert.match(synthesis, /user-story-template\.md/);
  assert.match(synthesis, /Full-template gate/);
  assert.match(synthesis, /product-spec-template\.md/);
  assert.match(synthesis, /design\.md/);
  assert.match(synthesis, /Traces to PRD/);
  assert.match(synthesis, /L-NN/);
  assert.match(parity, /prd-template\.md/);
  assert.match(parity, /user-story-template\.md/);
  assert.match(productManager, /Canonical documents for both modes/);
  assert.match(productManager, /prd-template\.md/);
  assert.match(productManager, /user-story-template\.md/);
});
