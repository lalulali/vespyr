// Fixture copy of evals/fixtures/dev-tasks/rate-limiter.js with AC-id annotations (02o.1).
// AC-H1: requests are allowed while tokens remain — capacity is honored.
// AC-U1: once the bucket is empty, further requests are rejected until refill.
// AC-E1: tokens refill over time at the configured rate.

class TokenBucketRateLimiter {
  constructor(capacity, refillRatePerSec) {
    this.capacity = capacity;
    this.refillRate = refillRatePerSec;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }
  allowRequest(cost = 1) {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    return false;
  }
}
module.exports = TokenBucketRateLimiter;
