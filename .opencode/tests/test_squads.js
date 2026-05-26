#!/usr/bin/env node
/**
 * Automated tests for Vespyr squads.js
 */

const assert = require('assert');
const squads = require('../scripts/squads');

console.log('Running Squad tests...');

// Test listing squads
const all = squads.listSquads();
assert(Array.isArray(all), 'listSquads should return an array');
assert(all.length >= 7, `Expected at least 7 squads, got ${all.length}`);

// Test loading individual squads
const startup = squads.loadSquad('startup');
assert.strictEqual(startup.name, 'startup');
assert(startup.agents.includes('founder'), 'Startup squad should include founder');
assert(startup.agents.includes('developer'), 'Startup squad should include developer');
assert(!startup.agents.includes('security-engineer'), 'Startup squad should not include security-engineer');

const build = squads.loadSquad('build');
assert.strictEqual(build.name, 'build');
assert(build.agents.includes('developer'), 'Build squad should include developer');
assert(!build.agents.includes('founder'), 'Build squad should not include founder');

console.log('✓ All squad tests passed!');
process.exit(0);
