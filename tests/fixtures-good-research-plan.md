# Research Plan — checkout abandonment
**Date:** 2026-10-09
**Methodology:** qualitative interviews
**Hypothesis:** at least 40% of abandoning admins hit a silent field validation error (validation-brief.md).

## Research Goals
1. More than 30% of admins who abandon checkout hit a silent field validation error
2. At least half of those errors involve a non-US postcode

## Cohort
- **Segment:** Operations admins at 5-50 person SaaS companies who abandoned checkout in the last 30 days
- **Sample size:** 8
- **Recruitment:** In-app intercept plus a panel of trial admins from partner communities

## Method
Qualitative interviews, chosen because the failure is silent and self-report is the only way to see a
field the user believes succeeded.

## Interview Guide
### Part 1: Profile Questions
1. Tell me about your role and who else uses this tool.
2. What tools did you use before this for billing?

### Part 2: Behavioral Questions
1. "Tell me about the last time you abandoned a checkout."
2. "Walk me through what you saw at the address step."
3. "How have you tried to solve a rejected address before?"

### Mom Test Validation
- [x] Questions ask about past behavior, not future intent
- [x] No solution pitching in questions
- [x] Commitment signals are probed

## Sampling Bias
We are NOT asking admins who completed checkout successfully, nor anyone from the vendor's own
community forum. Both over-represent people the product already works for.