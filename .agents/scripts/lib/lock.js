const fs = require('fs');
const path = require('path');

/**
 * Cross-process mutual exclusion for orchestrator state mutations.
 *
 * Mechanism: exclusive directory creation (fs.mkdirSync is atomic on POSIX
 * and Windows) + owner metadata (pid/timestamp).
 *
 * Takeover rules (hardened after Vera's 16-way concurrency probe found the
 * v1 acquire-race):
 *   - A lock whose owner.json is missing/unreadable is stolen ONLY after an
 *     acquire-grace period — a holder may legitimately be mid-acquire
 *     (mkdir done, owner.json write pending).
 *   - A lock held by a DEAD pid is always stolen.
 *   - A lock held by a LIVE pid is NEVER stolen; waiters time out
 *     fail-closed instead (a slow holder must not be executed against).
 *   - Release verifies ownership so a stolen-from holder cannot delete its
 *     successor's lock.
 *
 * Scope: per-project (lock lives under <cwd>/.agents/state/).
 */
const ACQUIRE_GRACE_MS = 2000;
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

function tryAcquire(lockPath) {
  try {
    fs.mkdirSync(path.dirname(lockPath), { recursive: true });
    fs.mkdirSync(lockPath);
    fs.writeFileSync(
      path.join(lockPath, 'owner.json'),
      JSON.stringify({ pid: process.pid, ts: Date.now() })
    );
    return true;
  } catch (e) {
    if (e.code === 'EEXIST') return false;
    throw e;
  }
}

function takeStale(lockPath) {
  const owner = readOwner(lockPath);
  let stale;
  if (!owner) {
    // Missing/corrupt owner info: only steal once the acquire grace period
    // has passed, so mid-acquire holders are never executed against.
    stale = dirAgeMs(lockPath) > ACQUIRE_GRACE_MS;
  } else {
    stale = !pidAlive(owner.pid);
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
  while (!tryAcquire(lockPath)) {
    if (takeStale(lockPath)) continue;
    if (Date.now() >= deadline) {
      throw new Error(`LOCK_TIMEOUT: could not acquire ${lockPath} within ${timeoutMs}ms`);
    }
    sleep(RETRY_DELAY_MS + Math.floor(Math.random() * 25));
  }
  try {
    return fn();
  } finally {
    // Ownership-checked release: never delete a successor's lock after a
    // takeover (v1 cascade bug).
    const owner = readOwner(lockPath);
    if (!owner || owner.pid === process.pid) {
      try { fs.rmSync(lockPath, { recursive: true, force: true }); } catch {}
    }
  }
}

module.exports = { withLock };
