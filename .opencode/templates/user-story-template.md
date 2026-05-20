# User Story Template

> **Used by:** @product-manager → **Feeds into:** @developer, @qa-engineer, @tech-lead, @data-analyst
> **Save to:** `artifacts/output/02-strategy/user-stories.md`

**Version:** 1
**Last changed:** YYYY-MM-DD
**Change log:**
- v1: Initial draft

Use this template when writing user stories.

This document is for **the dev team** — it must be exhaustive, precise, and testable. Every story must be independently implementable and verifiable.

---

## Story Metadata (apply to every story)

```
Story ID:     US-XXX
Title:        Brief, active-voice title
Priority:     Must-have / Should-have / Could-have / Won't-have
Effort:       Small / Medium / Large
Sprint:       ...
Dependencies: US-XXX, external system, etc.
Author:       @product-manager
Traces to PRD: Section X.Y: Feature Name from requirements.md
```

---

## Story Structure

### 1. Narrative

**As a** [type of user],
**I want** [goal],
**so that** [benefit / reason].

### 2. Business Requirement

Why does this story matter to the business?

- **Stakeholder impact:** Who benefits and how?
- **Value proposition:** What pain is relieved or gain created?
- **Revenue / cost implication:** Does this drive revenue, reduce cost, or reduce risk?
- **Success signal:** How will we know this story delivered value? (reference @data-analyst's measurement plan if available)
- **Priority rationale:** Why is this Must-have vs Should-have?

### 3. Technical Requirement

What must engineering account for?

- **Integration points:** What systems, APIs, or services does this touch?
- **Data requirements:** What data is needed? Where does it come from? Where does it go?
- **Performance constraints:** Latency, throughput, concurrency limits (reference @architect's ADRs)
- **Security constraints:** Auth, authorization, data handling, encryption (reference @security-engineer's findings)
- **State management:** What state is persisted? What is ephemeral?
- **Error handling strategy:** What happens when downstream services fail?
- **ML requirements (if applicable):** Which ML model/prediction does this depend on? What are the accuracy/latency requirements (AC-ML*)?

### 4. Acceptance Criteria

Acceptance criteria must be **testable** and **atomic**. Each criterion should be independently verifiable by QA.

Use **Given / When / Then** format for flow-based criteria.

#### 4.1 Happy Path — Normal Successful Flow

The primary scenario. The user does everything right and the system responds correctly.

- [ ] **AC-H1:** Given [precondition], when [user action], then [expected outcome]
- [ ] **AC-H2:** Given [precondition], when [user action], then [expected outcome]
- [ ] **AC-H3:** ...

Rules for happy path:
- Cover the full end-to-end flow from trigger to completion
- Include UI states: default → loading → success
- Include data persistence: what is saved, where, and in what state
- Include notifications: what does the user see/hear when done?

#### 4.2 Unhappy Path — Errors, Failures, and Rejections

Everything that can go wrong and how the system should handle it gracefully.

- [ ] **AC-U1:** Given [invalid input / failure condition], when [user action], then [error is shown, no data is corrupted, user can recover]
- [ ] **AC-U2:** Given [system is unavailable], when [user action], then [degraded experience with clear message]
- [ ] **AC-U3:** Given [unauthorized user], when [user attempts action], then [access is denied with appropriate HTTP status / message]
- [ ] **AC-U4:** Given [network timeout], when [user submits form], then [form state is preserved, retry is offered]
- [ ] **AC-U5:** ...

Rules for unhappy path:
- Every error must have a user-facing message (not just a code)
- No silent failures — the user must always know what happened
- Data must never be left in an inconsistent state
- Every failure path must be logged for observability

#### 4.3 Edge Cases — Boundaries, Extremes, and Unusual Conditions

The corners of the problem space. Things that are valid but rare.

- [ ] **AC-E1:** Given [boundary condition — e.g., max length input / empty list / single item], when [user action], then [system handles gracefully]
- [ ] **AC-E2:** Given [race condition — e.g., two users edit same record simultaneously], when [action occurs], then [last-write-wins / merge conflict / optimistic locking]
- [ ] **AC-E3:** Given [extreme scale — e.g., 10k items in list / 0 items / 1 item], when [user loads page], then [pagination / empty state / single-item view works correctly]
- [ ] **AC-E4:** Given [special characters / unicode / emojis in input], when [user submits], then [data is stored and rendered correctly]
- [ ] **AC-E5:** Given [browser back button / page refresh during async operation], when [user navigates], then [state is consistent, no duplicate operations]
- [ ] **AC-E6:** Given [concurrent sessions — same user logged in on two devices], when [action on device A], then [device B reflects change correctly]
- [ ] **AC-E7:** ...

Rules for edge cases:
- Think in extremes: 0, 1, max, max+1, null, empty string
- Think in time: what happens during async operations, refreshes, timeouts?
- Think in concurrency: what if two things happen at once?
- Think in input: special chars, injection attempts, very long inputs, malformed data
- Think in state: what if the user is in the middle of something and gets interrupted?

#### 4.4 ML Acceptance Criteria (AC-ML*) — if applicable

- [ ] **AC-ML-1:** Given [prediction request], when [model processes], then [prediction accuracy ≥ X% on test distribution]
- [ ] **AC-ML-2:** Given [prediction request], when [model serves], then [inference latency p95 ≤ Xms]
- [ ] **AC-ML-3:** Given [model service unavailable], when [user triggers prediction], then [fallback behavior activates gracefully]
- [ ] **AC-ML-4:** Given [prediction output], when [bias audit runs], then [disparate impact < threshold across segments]
- [ ] **AC-ML-5:** Given [data drift detected], when [monitoring system alerts], then [alert fires within X hours]
- [ ] **AC-ML-6:** Given [retraining trigger], when [pipeline runs], then [new model deploys within X hours with no manual intervention]

### 5. UI / UX Notes (if applicable)

- **Screens involved:** List each screen/view this story touches
- **States:** Default, loading, empty, error, success
- **Navigation:** Entry points and exit points
- **Accessibility:** Keyboard navigation, screen reader labels, focus management
- **Reference:** `artifacts/output/02-strategy/product-spec.md` §X.Y

### 6. Data Model Notes (if applicable)

- **Entities affected:** Which database tables / models change?
- **Fields:** What fields are read, written, or validated?
- **Validation rules:** Data types, lengths, required vs optional, uniqueness

### 7. Out of Scope for This Story

What is intentionally NOT covered in this story? Prevents scope creep.

1. ...
2. ...

### 8. Open Questions

| Question | Impact if unanswered | Owner | Status |
|----------|----------------------|-------|--------|
| ... | Blocks implementation / Can defer | ... | Open / Resolved |

---

## Example Story

```
Story ID:     US-001
Title:        User can reset password via email
Priority:     Must-have
Effort:       Medium
Sprint:       Sprint 3
Dependencies: US-000 (user auth system), Email service (external)
Traces to PRD: Section 5.2: Password Reset Capability
```

### Narrative
**As a** registered user who forgot their password,
**I want** to receive a password reset email,
**so that** I can regain access to my account without contacting support.

### Business Requirement
- **Stakeholder impact:** Reduces support ticket volume by ~15% (based on current ticket data)
- **Value proposition:** Self-service password recovery reduces friction and churn
- **Revenue / cost implication:** Saves ~$5k/quarter in support costs
- **Success signal:** >80% of reset emails are clicked within 24 hours
- **Priority rationale:** Must-have — password recovery is a standard security requirement

### Technical Requirement
- **Integration points:** Auth API (internal), SendGrid (external email service)
- **Data requirements:** User email, reset token (UUID, 1-hour expiry), token hash stored in DB
- **Performance constraints:** Email sent within 5 seconds of request; reset page loads in < 1s
- **Security constraints:** Token must be single-use, cryptographically random, stored hashed; rate limit to 3 requests per hour per email
- **State management:** Token state: pending → used | expired
- **Error handling strategy:** If SendGrid is down, queue email for retry with exponential backoff

### Acceptance Criteria

#### Happy Path
- [ ] **AC-H1:** Given the user is on the login page, when they click "Forgot password?" and enter a valid registered email, then a reset email is sent and a confirmation message is displayed
- [ ] **AC-H2:** Given the user receives the reset email, when they click the reset link within 1 hour, then they are taken to a password reset form
- [ ] **AC-H3:** Given the user enters a new password that meets complexity requirements and confirms it, when they submit, then the password is updated and they are logged in automatically
- [ ] **AC-H4:** Given the password is reset, when the user tries to log in with the old password, then access is denied

#### Unhappy Path
- [ ] **AC-U1:** Given the user enters an unregistered email, when they submit the forgot-password form, then the system displays the same confirmation message as for a valid email (to prevent email enumeration attacks)
- [ ] **AC-U2:** Given the user clicks an expired reset link (after 1 hour), when the page loads, then an error message is shown and a new link can be requested
- [ ] **AC-U3:** Given the user clicks an already-used reset link, when the page loads, then an error message is shown and a new link can be requested
- [ ] **AC-U4:** Given the user enters a new password that does not meet complexity requirements, when they submit, then inline validation errors are shown and the password is not changed
- [ ] **AC-U5:** Given the user enters mismatched password and confirmation, when they submit, then an error message is shown and the password is not changed
- [ ] **AC-U6:** Given the user requests a 4th reset email within 1 hour, when they submit, then a rate-limit error is shown and no email is sent
- [ ] **AC-U7:** Given SendGrid is down, when the user requests a reset, then the request is queued and the user sees a generic confirmation message

#### Edge Cases
- [ ] **AC-E1:** Given the user's email contains special characters or unicode, when the reset email is sent, then the email is delivered and the link works correctly
- [ ] **AC-E2:** Given the user opens the reset link in a different browser than the one they requested from, when they submit the new password, then the reset succeeds
- [ ] **AC-E3:** Given the user requests a reset, opens the link, but waits 61 minutes before submitting the new password, when they submit, then the form rejects with an expiration error
- [ ] **AC-E4:** Given two users share an email address (edge case in B2B), when one requests a reset, then only that user's password is affected
- [ ] **AC-E5:** Given the user bookmarks the reset page and revisits it after the token is used, when the page loads, then an appropriate error is shown

### UI / UX Notes
- **Screens:** Login → Forgot Password Form → Confirmation → Reset Form → Success
- **States:** Empty form → Validating → Success / Error
- **Navigation:** After success, redirect to dashboard

### Data Model Notes
- **Entities:** `password_reset_tokens` (id, user_id, token_hash, expires_at, used_at, created_at)
- **Validation:** Token must be 32-char hex, password must be 8+ chars with 1 uppercase, 1 lowercase, 1 number

### Out of Scope
1. Phone/SMS reset (future phase)
2. Password history enforcement (future)
3. Account lockout after failed resets (handled by auth system, not this story)

### Open Questions
| Question | Impact | Owner | Status |
|----------|--------|-------|--------|
| Should we invalidate all existing sessions on password change? | Security | Security lead | Open |
```

---

## Formatting Rules

1. **Every story must have a unique Story ID** (US-001, US-002, etc.)
2. **Every acceptance criterion must be independently testable** by QA
3. **Happy path must cover the complete flow** from trigger to completion
4. **Unhappy path must cover every error condition** that can occur
5. **Edge cases must cover boundaries, concurrency, and unusual inputs**
6. **No criterion should depend on another criterion** — they must be atomic
7. **Use precise language:** "the user sees a message" is bad; "a toast notification with text 'Password updated' appears for 3 seconds" is good
8. **Reference the PRD:** Every story must trace back to a feature in `artifacts/output/02-strategy/requirements.md`
9. **Cross-reference specs:** Where applicable, link UI behavior back to `artifacts/output/02-strategy/product-spec.md`
10. **ML stories use AC-ML* prefix** and follow the ML acceptance criteria format defined in §4.4

---

## Story Dependencies Diagram

For complex stories, show dependency chains:

```
US-001 (Auth Foundation) ──▶ US-005 (Login)
       │
       └──▶ US-006 (Password Reset)
       │
       └──▶ US-012 (Session Management)
```

This helps @tech-lead and @developer understand ordering requirements.

---

**Document info:**
- Version: 2.0
- Author: @product-manager
- Date: ...
- Input: `artifacts/output/02-strategy/requirements.md`
- Companion: `artifacts/output/02-strategy/requirements.md`
- Supersedes: v1.0 (added AC-ML* criteria §4.4, ML requirements in technical requirements §3, participant source, story dependency diagram)