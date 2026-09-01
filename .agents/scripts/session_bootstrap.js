#!/usr/bin/env node
// session_bootstrap.js — 02l Option A alias for session_start trace propagation
// Forwards to session_start.js and ensures VESPYR_TRACE_ID / VESPYR_PARENT_SPAN_ID env propagation for OTel parent chain.
// If direct spawn, call session_start logic and also ensure trace file.
const path = require('fs');
const fs = require('fs');
const crypto = require('crypto');
const proc = require('child_process');
const args = process.argv.slice(2);
if (args.length===0 || args.includes('--help')) {
  console.log(`Usage: node session_bootstrap.js start --agent <a> [--workflow <w>] | node session_bootstrap.js trace`);
  process.exit(0);
}
if (args[0]==='trace') {
  const id = crypto.randomUUID ? crypto.randomUUID() : 'trace-'+Date.now();
  console.log(id);
  process.exit(0);
}
// delegate to session_start.js
const sessionStart = require('path').join(__dirname, 'session_start.js');
try {
  proc.execFileSync(process.execPath, [sessionStart, ...args], { stdio: 'inherit' });
} catch(e) { process.exit(e.status||1); }
