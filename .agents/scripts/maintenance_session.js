#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { getMaintenanceArtifactRoot, startMaintenanceSession } = require('./maintenance_state');

const FLAGS = new Set([
  '--scope', '--agent', '--repo-root', '--state-root', '--run-id', '--session-id',
]);
const REQUIRED = ['--scope', '--agent', '--repo-root', '--state-root'];

function parseArgs(argv) {
  const args = Object.create(null);
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (!FLAGS.has(flag)) throw new Error(`Unknown argument: ${flag}`);
    if (Object.hasOwn(args, flag)) throw new Error(`Duplicate argument: ${flag}`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    args[flag] = value;
    i += 1;
  }

  for (const flag of REQUIRED) {
    if (!Object.hasOwn(args, flag)) throw new Error(`Missing required argument: ${flag}`);
  }
  return args;
}

function realDirectory(value, flag) {
  if (!path.isAbsolute(value)) throw new Error(`${flag} must be absolute`);
  let entry;
  let canonical;
  try {
    entry = fs.lstatSync(value);
    canonical = fs.realpathSync(value);
  } catch {
    throw new Error(`${flag} must exist and resolve to a directory`);
  }
  if (entry.isSymbolicLink()) {
    throw new Error(`${flag} must resolve to a non-symlink directory`);
  }
  if (!fs.statSync(canonical).isDirectory()) throw new Error(`${flag} must resolve to a directory`);
  return canonical;
}

function contains(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function validate(argv) {
  const args = parseArgs(argv);
  if (args['--scope'] !== 'maintenance') throw new Error('Unsupported scope; expected maintenance');
  if (!args['--agent'].trim() || /[\0-\x1f\x7f]/.test(args['--agent'])) {
    throw new Error('--agent must be a non-empty name without control characters');
  }
  if (args['--run-id'] !== undefined && !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(args['--run-id'])) {
    throw new Error('--run-id must be 1-128 letters, numbers, underscores, or hyphens, starting with a letter or number');
  }
  if (args['--session-id'] !== undefined && !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(args['--session-id'])) {
    throw new Error('--session-id must be 1-128 letters, numbers, underscores, or hyphens, starting with a letter or number');
  }
  const runId = args['--run-id'] === undefined ? crypto.randomUUID() : args['--run-id'];
  const sessionId = args['--session-id'] === undefined ? crypto.randomUUID() : args['--session-id'];
  if (runId === sessionId) throw new Error('--run-id and --session-id must be different');

  const scriptPath = fs.realpathSync(__filename);
  const repoRoot = fs.realpathSync(path.resolve(path.dirname(scriptPath), '..', '..'));
  if (realDirectory(args['--repo-root'], '--repo-root') !== repoRoot) {
    throw new Error('--repo-root must resolve to this repository');
  }

  const stateRoot = realDirectory(args['--state-root'], '--state-root');
  if (contains(repoRoot, stateRoot) || contains(stateRoot, repoRoot)) {
    throw new Error('--state-root must be disjoint from the repository root');
  }

  return {
    scope: 'maintenance',
    agent: args['--agent'],
    repoRoot,
    stateRoot,
    runId,
    sessionId,
  };
}

try {
  const session = validate(process.argv.slice(2));
  const sessionRecordPath = startMaintenanceSession(session);
  const artifactRoot = getMaintenanceArtifactRoot(session);
  console.log(JSON.stringify({ ...session, sessionRecordPath, artifactRoot }, null, 2));
} catch (error) {
  console.error(`maintenance_session: ${error.message}`);
  process.exitCode = 2;
}
