# Workspace Member Management — Spec Kernel

> Fixture kernel for the 02n reverse-PRD dry-run (Review 10 §4: reverse mode requires a SPEC.md Spec Kernel anchor).

## 1. Why

Workspace admins at small companies need self-serve control over who is in their Orbit workspace. Today membership changes go through support, which is slow, unauditable, and blocks onboarding. The user is a workspace owner or admin managing 2–50 teammates on a Free or Team plan.

## 2. Capabilities

1. **CAP-1: Browse and find members**
   - intent: list every member and pending invite with role, status, and last-active context; search and paginate.
   - success: an admin can locate any member in under 10 seconds with search.
2. **CAP-2: Invite teammates with a role**
   - intent: send an email invite with a role, with inline validation and clear feedback.
   - success: invite reaches a valid email in under 5 seconds with a success confirmation.
3. **CAP-3: Manage roles and removal under permission rules**
   - intent: change roles, revoke invites, remove members — enforced against the viewer's role.
   - success: every mutation is allowed or denied exactly per the permission matrix with no silent failures.

## 3. Constraints

1. Free plan caps membership at 25 (including pending invites) — why: pricing boundary must be visible before the API rejects.
2. Pending invites expire after 7 days — why: stale invites create security ambiguity.
3. SSO/SCIM-managed workspaces disable manual invites — why: the identity provider is the source of truth.

## 4. Non-goals

- We are NOT building authentication, SSO, or SCIM itself.
- We are NOT building the billing/upgrade checkout flow (only the cap hint).
- We are NOT building an audit log in this cycle.

## 5. Success signal

75% of new workspaces invite at least one teammate within 48 hours of creation, and invite-related support tickets drop below 2/week, by 2026-12-01.
