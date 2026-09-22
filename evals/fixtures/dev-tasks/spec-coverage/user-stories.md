# User Stories — Email Verification (fixture excerpt, 02o.1)

## US-114 — Rate-limit the verification endpoint

As a platform engineer, I want the email-verification endpoint rate limited so a single email address cannot be brute-forced.

- **AC-H1:** requests are allowed while tokens remain — capacity is honored.
- **AC-U1:** once the bucket is empty, further requests are rejected until refill.
- **AC-E1:** tokens refill over time at the configured rate.

> Fixture note: the implementation evidence lives in `evals/fixtures/dev-tasks/spec-coverage/rate-limiter.js` and `rate-limiter.test.js` (annotated corpus copies). The coverage report maps each AC id to resolvable refs.
