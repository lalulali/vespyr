#!/usr/bin/env node
// test_agent_socratic_coverage.test.js — 02k AD-2026-08-19 #4: "Update all 20 personas to reject
// underspecified briefs" + AGENTS.md identity claim "Every reasoning agent has a ## Socratic Stance".
// Demonstrated red: this test failed at HEAD before the 2026-09-01 persona sweep (7 files missing).
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(__dirname, '..', '.agents', 'agents');
const personas = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));

describe('all personas carry Socratic Stance + underspecified-briefs clause (02k #4)', () => {
  it('discovers the full roster (>=19 personas on disk)', () => {
    assert.ok(personas.length >= 19, `expected >=19 persona files, found ${personas.length}`);
  });

  it('every persona file contains a ## Socratic Stance section', () => {
    const missing = personas.filter(p => !/^## Socratic Stance$/m.test(fs.readFileSync(path.join(AGENTS_DIR, p), 'utf8')));
    assert.deepEqual(missing, [], `personas missing "## Socratic Stance": ${missing.join(', ')}`);
  });

  it('every persona file declares "On underspecified briefs" (02k #4)', () => {
    const missing = personas.filter(p => !/On underspecified briefs/.test(fs.readFileSync(path.join(AGENTS_DIR, p), 'utf8')));
    assert.deepEqual(missing, [], `personas missing underspecified-briefs clause: ${missing.join(', ')}`);
  });
});
