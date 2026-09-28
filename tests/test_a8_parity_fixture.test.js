#!/usr/bin/env node
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { evaluateTier1 } = require('../tools/eval/tier1-judge');

const ROOT = path.join(__dirname, '..');
const A8_RESULTS = path.join(ROOT, 'artifacts', 'evals', 'reverse-prd', 'a8');
const TRADITIONAL = path.join(A8_RESULTS, 'traditional');
const A8_TRADITIONAL_AVAILABLE = [
  path.join(TRADITIONAL, 'requirements.md'),
  path.join(TRADITIONAL, 'user-stories.md'),
  path.join(TRADITIONAL, 'product-spec.md'),
].every((file) => fs.existsSync(file));
const A8_AVAILABLE = [
  path.join(A8_RESULTS, 'reverse', 'requirements.md'),
  path.join(A8_RESULTS, 'reverse', 'user-stories.md'),
  path.join(A8_RESULTS, 'reverse', 'parity-report.md'),
].every((file) => fs.existsSync(file));
const A8_OPTIONS = A8_AVAILABLE ? {} : { skip: 'valid reverse A8 results are not present; inspect a8/reverse/r1-review.md' };
const A8_TRADITIONAL_OPTIONS = A8_TRADITIONAL_AVAILABLE ? {} : { skip: 'project-local A8 traditional results are not present' };
const RUBRIC_FILE = 'prd-completeness.json';

function read(...parts) {
  return fs.readFileSync(path.join(...parts), 'utf8');
}

function countScopedCriteria(text) {
  const keys = new Set();
  let story = 'unknown';
  for (const line of text.split('\n')) {
    const storyMatch = line.match(/\b(US-\d{3})\b/);
    if (storyMatch && (/^#{2,3}\s/.test(line) || /^\- \*\*Story ID/.test(line))) story = storyMatch[1];
    const criterionMatch = line.match(/^\s*[-*]\s*\[\s*\]\s+\*\*(AC-(?:H|U|E)\d+):/);
    if (criterionMatch) keys.add(`${story}:${criterionMatch[1]}`);
  }
  return keys;
}

async function score(output, weight) {
  const rubric = JSON.parse(read(ROOT, 'evals', 'rubrics', RUBRIC_FILE));
  const weighted = {
    ...rubric,
    criteria: rubric.criteria.map((criterion) =>
      ['PRD-5', 'PRD-6'].includes(criterion.id) ? { ...criterion, weight } : criterion
    ),
  };
  return evaluateTier1(
    { dimension: 'prd_completeness', rubric: weighted },
    { output }
  );
}

test('A8 traditional arm is kernel-only and preserves explicit open decisions', A8_TRADITIONAL_OPTIONS, () => {
  const files = ['requirements.md', 'user-stories.md', 'product-spec.md'];
  const text = files.map((file) => read(TRADITIONAL, file)).join('\n');
  for (const forbidden of [
    'Evidence Ledger',
    'path#id',
    'workspace-members.html',
    'SEEDED-BEHAVIORS',
    'artifacts/evals/reverse-prd/a8/reverse',
    'artifacts/evals/reverse-prd/a12',
    'prototype-collaboration',
  ]) {
    assert.equal(text.includes(forbidden), false, `traditional arm contains reverse-only term: ${forbidden}`);
  }
  assert.match(text, /\[(?:OPEN|BLOCKED)\]/);
});

test('A8 arm counts use stable story and acceptance-criterion IDs', A8_OPTIONS, () => {
  const reverseStories = read(A8_RESULTS, 'reverse', 'user-stories.md');
  const traditionalStories = read(TRADITIONAL, 'user-stories.md');
  assert.equal(new Set([...reverseStories.matchAll(/^- \*\*Story ID:\*\*\s+(US-\d{3})\s*$/gm)].map((match) => match[1])).size, 10);
  assert.equal(countScopedCriteria(reverseStories).size, 30);
  assert.equal([...reverseStories.matchAll(/^\s*[-*]\s*\[\s*\]\s+\*\*AC-(?:H|U|E)\d+:/gm)].length, 30);
  assert.equal(new Set([...traditionalStories.matchAll(/^- \*\*Story ID:\*\*\s+(US-\d{3})\s*$/gm)].map((match) => match[1])).size, 11);
  assert.equal(countScopedCriteria(traditionalStories).size, 38);
  assert.equal([...traditionalStories.matchAll(/^\s*[-*]\s*\[\s*\]\s+\*\*AC-(?:H|U|E)\d+:/gm)].length, 38);
});

test('A8 rubric sensitivity is recorded without changing the shipped rubric', A8_OPTIONS, async () => {
  const reverse = [
    read(A8_RESULTS, 'reverse', 'requirements.md'),
    read(A8_RESULTS, 'reverse', 'user-stories.md'),
    read(A8_RESULTS, 'reverse', 'parity-report.md'),
  ].join('\n');
  const traditional = ['requirements.md', 'user-stories.md', 'product-spec.md']
    .map((file) => read(TRADITIONAL, file))
    .join('\n');

  const reverseOne = await score(reverse, 1);
  const reverseTwo = await score(reverse, 2);
  const traditionalOne = await score(traditional, 1);
  const traditionalTwo = await score(traditional, 2);

  assert.equal(reverseOne.score, 5);
  assert.equal(reverseTwo.score, 5);
  assert.equal(traditionalOne.score, 4.5);
  assert.equal(traditionalTwo.score, 4.2);
  assert.equal(traditionalOne.criteriaResults.find((c) => c.id === 'PRD-5').passed, false);
  assert.equal(traditionalOne.criteriaResults.find((c) => c.id === 'PRD-6').passed, true);

  const rubric = JSON.parse(read(ROOT, 'evals', 'rubrics', RUBRIC_FILE));
  assert.equal(rubric.criteria.find((c) => c.id === 'PRD-5').weight, 1);
  assert.equal(rubric.criteria.find((c) => c.id === 'PRD-6').weight, 1);

  const report = read(A8_RESULTS, 'reverse', 'parity-report.md');
  assert.match(report, /Owner (?:disposition|verdict).*(?:CONFIRMED|ACCEPTED|pending|\[OPEN\])/i);
});
