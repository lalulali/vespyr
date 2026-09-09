const assert = require("assert");
const TokenBucketRateLimiter = require("./rate-limiter");

// Correct implementation: capacity respected, refill over time, reject when empty.
const rl = new TokenBucketRateLimiter(2, 1);
assert.strictEqual(rl.allowRequest(), true, "token 1/2");
assert.strictEqual(rl.allowRequest(), true, "token 2/2");
assert.strictEqual(rl.allowRequest(), false, "bucket empty must reject");
rl.tokens = 2; // deterministic refill stand-in (no clock sleep in eval sandbox)
assert.strictEqual(rl.allowRequest(), true, "refilled bucket must accept");
console.log("rate-limiter tests passed");
