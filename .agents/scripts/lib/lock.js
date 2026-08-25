const fs = require('fs');
const path = require('path');

/**
 * Cross-process mutual exclusion for orchestrator state mutations.
 *
 * Mechanism: exclusive directory creation (fs.mkdirSync is atomic on POSIX
 * and Windows) + owner metadata (pid/timestamp) kept fresh by an in-hold
 * heartbeat.
 *
 * Takeover rules (hardened twice):
 *   v1 -> v2: acquire-grace for missing/corrupt owner.json (holder may be
 *        mid-acquire), PID-liveness check, ownership-checked release.
 *   v2 -> v3: heartbeat freshness — a LIVE pid whose heartbeat is stale is
 *        evictable (covers zombie/unreaped holders, Vera residual R2); and
 *        release compares directory mtime against the value captured at
 *        acquire so an externally-tampered or successor-replaced lock is
 *        never deleted by a stale holder (Vera residual R1).
 *
 * Scope: per-project (lock lives under <cwd>/.agents/state/).
 */
const ACQUIRE_GRACE_MS = 2000;      // mkdir done, owner.json maybe pending
const DEFAULT_STALE_MS = 15000;     // heartbeat older than this => evictable
const DEFAULT_TIMEOUT_MS = 30000;
const RETRY_DELAY_MS = 50;
const HEARTBEAT_MS = 5000;

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

function writeOwner(lockPath, pid) {
  fs.writeFileSync(
    path.join(lockPath, 'owner.json'),
    JSON.stringify({ pid, ts: Date.now() })
  );
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

/**
 * Takeover decision:
 *  - no/corrupt owner  => stolen only after ACQUIRE_GRACE_MS (mid-acquire)
 *  - dead pid          => always stolen
 *  - live pid          => stolen only if heartbeat is stale (zombie class);
 *                         a fresh heartbeat is never executed against —
 *                         waiters time out fail-closed instead.
 */
function takeStale(lockPath) {
  const owner = readOwner(lockPath);
  let stale;
  if (!owner) {
    stale = dirAgeMs(lockPath) > ACQUIRE_GRACE_MS;
  } else if (!pidAlive(owner.pid)) {
    stale = true;
  } else {
    stale = Date.now() - owner.ts > DEFAULT_STALE_MS;
  }
  if (stale) {
    fs.rmSync(lockPath, { recursive: true, force: true });
    return true;
  }
  return false;
}

/**
 * Runs fn() while holding an exclusive lock. Throws LOCK_TIMEOUT on timeout
 * (fail-closed: callers abort rather than run unserialized).
 * @param {string} lockPath lock directory path (resolved against cwd)
 * @param {() => any} fn critical section
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

  // Heartbeat: prove liveness to concurrent waiters. unref'd so it never
  // keeps the process alive past the critical section.
  const heartbeat = setInterval(() => {
    try {
      const o = readOwner(lockPath);
      if (o && o.pid === process.pid) writeOwner(lockPath, process.pid);
    } catch {}
  }, HEARTBEAT_MS);
  if (typeof heartbeat.unref === 'function') heartbeat.unref();

  try {
    return fn();
  } finally {
    clearInterval(heartbeat);
    // Ownership-checked, tamper-aware release: delete only if the lock is
    // still ours by BOTH pid and the mtime we captured at acquire.
    const owner = readOwner(lockPath);
    let mtimeNow = null;
    try { mtimeNow = fs.statSync(lockPath).mtimeMs; } catch {}
    const oursByPid = owner !== null && owner.pid === process.pid;
    const oursByMtime = owner === null && mtimeNow === acquiredMtime;
    if ((oursByPid || oursByMtime) && mtimeNow === acquiredMtime) {
      try { fs.rmSync(lockPath, { recursive: true, force: true }); } catch {}
    }
  }
}

module.exports = { withLock };
