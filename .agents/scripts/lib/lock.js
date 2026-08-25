const fs = require('fs');
const path = require('path');

/**
 * Cross-process mutual exclusion for orchestrator state mutations.
 *
 * Mechanism: exclusive directory creation (fs.mkdirSync is atomic on POSIX
 * and Windows) + owner metadata (pid/timestamp).
 *
 * Takeover rules (v4, hardened across three audit rounds):
 *  - Missing/corrupt owner.json => stolen only after ACQUIRE_GRACE_MS
 *    (a holder may legitimately be mid-acquire).
 *  - Dead pid                   => always stolen.
 *  - Live pid, heartbeat frozen longer than LIVE_HEARTBEAT_STALE_MS (60s)
 *    => stolen (covers the SIGKILLed-unreaped zombie class, Vera R2).
 *      NOTE: setInterval heartbeats cannot fire while a holder executes a
 *      long SYNCHRONOUS critical section (Vera N3), so the live-pid stale
 *      threshold is deliberately 60s — generous above any legitimate
 *      orchestrator mutation, far below an indefinite wedge.
 *  - Release is ownership-checked AND tamper-aware: the directory mtime
 *      captured at acquire must match at release, so a stale holder can
 *      never delete a successor's replaced lock (Vera R1).
 *  - fn MUST be synchronous; a thenable return throws TypeError loudly
 *      (an async fn would unlock while still running — Vera N4).
 *
 * Scope: per-project (lock lives under <cwd>/.agents/state/).
 */
const ACQUIRE_GRACE_MS = 2000;
const LIVE_HEARTBEAT_STALE_MS = 60000;
const DEFAULT_TIMEOUT_MS = 30000;
const RETRY_DELAY_MS = 50;

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function readOwner(lockPath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(lockPath, 'owner.json'), 'utf8'));
  } catch {
    return null;
  }
}

/** Atomic owner write (tmp + rename) — torn reads cannot fabricate a
 *  missing/corrupt owner for takeStale (Vera N5). */
function writeOwner(lockPath, pid) {
  const tmp = path.join(lockPath, `owner.json.tmp.${process.pid}.${Date.now()}`);
  fs.writeFileSync(tmp, JSON.stringify({ pid, ts: Date.now() }));
  fs.renameSync(tmp, path.join(lockPath, 'owner.json'));
}

function dirAgeMs(lockPath) {
  try {
    return Date.now() - fs.statSync(lockPath).mtimeMs;
  } catch {
    return Infinity;
  }
}

function pidAlive(pid) {
  if (!Number.isInteger(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM'; // exists but owned by another user
  }
}

/** Acquire attempt. Returns directory mtimeMs on success, false on EEXIST. */
function tryAcquire(lockPath) {
  try {
    fs.mkdirSync(path.dirname(lockPath), { recursive: true });
    fs.mkdirSync(lockPath);
    writeOwner(lockPath, process.pid);
    return fs.statSync(lockPath).mtimeMs;
  } catch (e) {
    if (e.code === 'EEXIST') return false;
    throw e;
  }
}

function takeStale(lockPath) {
  const owner = readOwner(lockPath);
  let stale;
  if (!owner) {
    stale = dirAgeMs(lockPath) > ACQUIRE_GRACE_MS;
  } else if (!pidAlive(owner.pid)) {
    stale = true;
  } else {
    stale = Date.now() - owner.ts > LIVE_HEARTBEAT_STALE_MS;
  }
  if (stale) {
    fs.rmSync(lockPath, { recursive: true, force: true });
    return true;
  }
  return false;
}

/**
 * Runs fn() while holding an exclusive lock. Throws LOCK_TIMEOUT on timeout
 * (fail-closed) and TypeError if fn is asynchronous (contract: critical
 * sections are synchronous; an async fn would unlock while still running).
 * @param {string} lockPath lock directory path (resolved against cwd)
 * @param {() => any} fn synchronous critical section
 * @param {{timeoutMs?:number}} [opts]
 */
function withLock(lockPath, fn, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;

  let acquiredMtime = null;
  while (true) {
    const r = tryAcquire(lockPath);
    if (r !== false) {
      acquiredMtime = r;
      break;
    }
    if (takeStale(lockPath)) continue;
    if (Date.now() >= deadline) {
      throw new Error(`LOCK_TIMEOUT: could not acquire ${lockPath} within ${timeoutMs}ms`);
    }
    sleep(RETRY_DELAY_MS + Math.floor(Math.random() * 25));
  }

  let result;
  try {
    result = fn();
  } finally {
    const owner = readOwner(lockPath);
    let mtimeNow = null;
    try { mtimeNow = fs.statSync(lockPath).mtimeMs; } catch {}
    const oursByPid = owner !== null && owner.pid === process.pid;
    const oursByMtime = owner === null && mtimeNow === acquiredMtime;
    if ((oursByPid || oursByMtime) && mtimeNow === acquiredMtime) {
      try { fs.rmSync(lockPath, { recursive: true, force: true }); } catch {}
    }
  }

  if (result && typeof result.then === 'function') {
    throw new TypeError(
      'withLock: fn returned a thenable — critical sections must be synchronous ' +
      '(the lock is already released; refactor fn to complete synchronously).'
    );
  }
  return result;
}

module.exports = { withLock };
