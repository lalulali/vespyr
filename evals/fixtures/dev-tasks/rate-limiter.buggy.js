// BUGGY VARIANT (failing): never refills and never rejects — the exact
// off-by-one/race failure DEV-01 describes. rate-limiter.test.js FAILS on
// this file (accepts when empty), PASSES on rate-limiter.js.
class TokenBucketRateLimiter {
  constructor(capacity, refillRatePerSec) {
    this.capacity = capacity;
    this.refillRate = refillRatePerSec;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }
  allowRequest(cost = 1) {
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    return true; // BUG: admits when empty; no refill path
  }
}
module.exports = TokenBucketRateLimiter;
