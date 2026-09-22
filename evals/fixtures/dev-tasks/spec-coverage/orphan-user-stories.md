# User Stories — Email Verification (fixture excerpt, 02o.1 — RED PROBE)

Same as `user-stories.md`, plus one seeded orphan AC with no implementation reference anywhere (the 02o.2 sweep must exit 1 on it).

## US-114 — Rate-limit the verification endpoint

As a platform engineer, I want the email-verification endpoint rate limited so a single email address cannot be brute-forced.

- **AC-H1:** requests are allowed while tokens remain — capacity is honored.
- **AC-U1:** once the bucket is empty, further requests are rejected until refill.
- **AC-E1:** tokens refill over time at the configured rate.
- **AC-E2:** unicode email normalization is applied before rate-limit keying. <!-- seeded orphan: no refs -->
