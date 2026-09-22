// Fixture copy of evals/fixtures/dev-tasks/rate-limiter.test.js with AC-id annotations (02o.1).
const assert = require("assert");
const TokenBucketRateLimiter = require("./rate-limiter");

// AC-H1: capacity honored — two allowed requests while tokens remain.
const rl = new TokenBucketRateLimiter(2, 1);
assert.strictEqual(rl.allowRequest(), true, "token 1/2");
assert.strictEqual(rl.allowRequest(), true, "token 2/2");

// AC-U1: empty bucket must reject.
assert.strictEqual(rl.allowRequest(), false, "bucket empty must reject");

// AC-E1: deterministic refill stand-in (no clock sleep in eval sandbox).
rl.tokens = 2;
assert.strictEqual(rl.allowRequest(), true, "refilled bucket must accept");
console.log("rate-limiter tests passed");
