---
feature: Workspace Member Management (Orbit)
mode: reverse
generated: "2026-09-22"
source_kernel: evals/fixtures/prototypes/reverse-prd/SPEC.md
source_inventory: evals/fixtures/prototypes/reverse-prd/dry-run/prototype-inventory.md
synthesis: step-3d complete (2026-09-22) — 9 stories / 27 ACs in user-stories.md
---

# Requirements — Workspace Member Management (Orbit)

> Reverse-mode dry-run artifact (02n.3 / 02n.4). Sections 1–13 are synthesized at step-3d; the Evidence Ledger below is the fixed input. Every statement traces to a prototype anchor (frozen A11 grammar) — no anchor, no fact.

## 1. Executive Summary

Workspace admins at small companies currently change membership through support — slow and unauditable. Orbit adds self-serve member management: browse members, invite teammates, and manage roles under explicit permission rules. Success: 75% of new workspaces invite within 48 hours and invite-related support tickets drop below 2/week.

## 2. Research Foundation

Prototype-first cycle (reverse mode): the evidence source is the frozen prototype + Evidence Ledger (§14), not upstream research artifacts. Market/competitive research is N/A for this cycle — rationale: the interaction contract was proven by the prototype walk-through and no market claims are made here.

## 3. Problem Statement

Admins cannot self-serve membership changes; every change becomes a support ticket — slow onboarding, no audit trail, access drift when people leave. Cost: ~15 minutes per change, weekly during hiring, plus trust cost when the wrong people keep access.

## 4. Hypothesis of Solution

We believe self-serve member management will reduce invite-related support tickets below 2/week and get 75% of new workspaces to invite within 48 hours, as evidenced by `invite_sent` telemetry and ticket volume within 8 weeks.

## 5. Goals & Success Metrics

- **Primary:** 75% of new workspaces invite ≥1 teammate within 48h (`invite_sent` ÷ workspace creations).
- **Guardrail:** invite error rate < 2% (validation failures excluded); zero PII in telemetry (L-37).
- **Secondary:** search used in >40% of sessions with >10 members.

## 6. Target Audience

- **P1 Maya — owner/admin, 12-person startup on Free, near the 25-member cap.** Goals: add teammates fast, control access. Pains: support round-trips, lost invites, no visibility into pending state.
- **P2 Dev — workspace member (read-only).** Needs visibility into who is in the workspace; makes no changes.
- **Out of target:** SSO/SCIM enterprise admins (manual invites disabled, L-22); workspaces above the Free cap (upgrade path is out of scope).

## 7. Feature Overview

Capabilities: (1) browse members and pending invites; (2) invite teammates with a role; (3) manage roles and removal under the permission matrix.

| Requirement ID | Category | Description | Priority |
|---|---|---|---|
| FR-001 | Members list | Show members + invites with role/status/last active; states empty/loading/error/populated (L-01..L-05, L-13, L-15, L-16) | Must-have |
| FR-002 | Search & pagination | Search by name/email (300ms debounce, request cancel); 25 rows/page (L-28, L-38, L-39, L-26) | Must-have |
| FR-003 | Invite | Email + role + message; inline validation (format, duplicate, self, cap); success toast (L-06..L-09, L-24, L-30, L-32) | Must-have |
| FR-004 | Invite lifecycle | 7-day expiry; Expired status + Resend; revoke (L-10, L-14, L-17) | Should-have |
| FR-005 | Role management | Inline role change, optimistic with rollback (L-27, L-40) | Must-have |
| FR-006 | Removal | Destructive confirmation; suspended banner (L-25, L-33, L-34) | Should-have |
| FR-007 | Permission matrix | Owner/admin/member allowed+denied per L-18..L-22 | Must-have |
| FR-008 | Telemetry | Events + props per L-35, L-36; emails hashed (L-37) | Must-have |

## 8. Non-Functional Requirements

| Requirement ID | Category | Description | Priority |
|---|---|---|---|
| NFR-001 | Accessibility | WCAG 2.1 AA: focus trap, keyboard path, aria-live, contrast (L-41..L-45) | Must-have |
| NFR-002 | Performance | Debounce + cancel; virtualize >100 members (≤50 DOM rows) (L-38, L-39) | Should-have |
| NFR-003 | Platform | Evergreen browsers; mobile bottom-sheet + safe-area; offline disables mutations (L-46..L-49) | Must-have |
| NFR-004 | Security & privacy | Emails hashed before export; session expiry redirect preserves draft (L-21, L-37) | Must-have |

## 9. Timeline & Phases

- **MVP:** FR-001, FR-002, FR-003, FR-005, FR-007, NFR-001.
- **V1.1:** FR-004, FR-006, NFR-002, NFR-003, NFR-004.
- No dates in this fixture cycle.

## 10. Out of Scope

1. Authentication, SSO, and SCIM implementation (kernel non-goal).
2. Billing/upgrade checkout — only the cap hint ships.
3. Audit log export (kernel non-goal).
4. Bulk member import — `[OPEN]` L-51, owner confirmation pending.

## 11. Dependencies & Risks

Dependencies: email delivery service (invite send); identity provider for SSO/SCIM-managed workspaces. Risks: Free-cap friction at 25/25 (mitigate: upgrade hint, L-08); invite deliverability (mitigate: resend + visible status, L-10).

## 12. Open Questions & Decisions

| Question | Owner | Deadline | Status |
|---|---|---|---|
| L-51: is bulk member import in or out of scope? | owner | before `/plan` handoff | Open |
| A7: sampling disposition (3 of 51 ledger statements) | owner | at R4 gate | Open |
| A8: parity-delta disposition | owner | at R4 gate | Open |

## 13. Optional Components

### 13.1 ML/AI Requirements
None.

### 13.2 Accessibility Requirements
WCAG 2.1 AA per NFR-001 (L-41..L-45).

## 14. Evidence Ledger (reverse mode only)

| ID | Statement | Anchor (`path#id`) | Type | Status |
|---|---|---|---|---|
| L-01 | Prototype-only control toggling Day 0 / Day 30 / Loading / Error (state switcher) | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#state-switcher` | prototype | confirmed |
| L-02 | Day 0 empty state: "No teammates yet" + invite CTA | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#state-empty` | prototype | confirmed |
| L-03 | Loading skeleton rows with `aria-busy` | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#state-loading` | prototype | confirmed |
| L-04 | Load-failure panel with Retry action | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#state-error` | prototype | confirmed |
| L-05 | Day 30 populated table with members, invites, and pagination | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#state-populated` | prototype | confirmed |
| L-06 | Inline invalid-email-format error | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#validation-email-format` | prototype | confirmed |
| L-07 | Duplicate invite error naming the email | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#validation-duplicate-email` | prototype | confirmed |
| L-08 | Free plan cap 25/25 — invite disabled with upgrade hint | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#validation-max-members` | prototype | confirmed |
| L-09 | Self-invite blocked | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#validation-self-invite` | prototype | confirmed |
| L-10 | Pending invites expire after 7 days; Expired status + Resend | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#edge-invite-expiry` | prototype | confirmed |
| L-11 | Long names/emails truncate with tooltip | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#edge-long-names` | prototype | confirmed |
| L-12 | Unicode names (Amélie 陳大文) render correctly | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#edge-unicode-names` | prototype | confirmed |
| L-13 | Member entity field list and types | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#data-member-schema` | prototype | confirmed |
| L-14 | Invite entity field list and types | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#data-invite-schema` | prototype | confirmed |
| L-15 | Role enum owner/admin/member; single owner | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#data-role-enum` | prototype | confirmed |
| L-16 | Status enum active/invited/suspended/expired and display mapping | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#data-status-enum` | prototype | confirmed |
| L-17 | ISO-8601 UTC storage; relative display < 7 days; null lastActive renders "Never" | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#data-dates` | prototype | confirmed |
| L-18 | Owner can invite, revoke, change roles, remove, transfer ownership | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perm-owner-actions` | prototype | confirmed |
| L-19 | Admin can invite/revoke only; admin/owner rows locked for role change and removal | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perm-admin-restricted` | prototype | confirmed |
| L-20 | Member sees view-only banner; no invite control | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perm-member-readonly` | prototype | confirmed |
| L-21 | Expired session redirects to sign-in with `?next=/settings/members`, draft preserved | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perm-session-expired` | prototype | confirmed |
| L-22 | SSO/SCIM-managed workspace disables manual invites with explanation | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perm-sso-scim-note` | prototype | confirmed |
| L-23 | Settings tabs General/Members/Billing/Integrations; Members active | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#nav-settings-tabs` | prototype | confirmed |
| L-24 | Invite modal: email + role + optional message; Esc/Cancel closes | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#nav-invite-modal` | prototype | confirmed |
| L-25 | Remove-member confirmation dialog with destructive styling | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#nav-remove-confirm` | prototype | confirmed |
| L-26 | 25 rows per page with prev/next and page count | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#nav-pagination` | prototype | confirmed |
| L-27 | Inline role dropdown on pending invite; optimistic update with rollback | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#nav-role-change` | prototype | confirmed |
| L-28 | Search members by name/email; empty-search results state | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#member-search` | prototype | confirmed |
| L-29 | Empty-state headline "No teammates yet" + supporting line | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#copy-empty-title` | prototype | confirmed |
| L-30 | Primary CTA label "Invite teammate" / modal submit "Send invite" | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#copy-invite-cta` | prototype | confirmed |
| L-31 | Load-error copy "We couldn't load your team." + Retry | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#copy-error-load` | prototype | confirmed |
| L-32 | Success toast "Invite sent to jane@acme.com" | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#copy-toast-success` | prototype | confirmed |
| L-33 | Remove confirmation "Remove Jane? They'll lose access immediately." | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#copy-confirm-remove` | prototype | confirmed |
| L-34 | Suspended-member banner with reason ("billing hold") | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#copy-suspended-banner` | prototype | confirmed |
| L-35 | Events: members_viewed, invite_sent, invite_revoked, invite_resent, role_changed, member_removed, search_performed | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#telemetry-events` | prototype | confirmed |
| L-36 | Common props: workspace_id, actor_role, member_count, source_surface | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#telemetry-props` | prototype | confirmed |
| L-37 | Emails hashed before export; no names or message bodies in events | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#telemetry-pii-rule` | prototype | confirmed |
| L-38 | Virtualize beyond 100 members; ≤ 50 rendered rows | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perf-list-virtualization` | prototype | confirmed |
| L-39 | Search debounced 300ms; in-flight request cancelled on new keystroke | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perf-search-debounce` | prototype | confirmed |
| L-40 | Role change/remove optimistic with rollback + error toast | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perf-optimistic-updates` | prototype | confirmed |
| L-41 | Invite outcomes announced via `aria-live="polite"` | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#a11y-live-region` | prototype | confirmed |
| L-42 | Modal focus trap; Esc closes; focus returns to trigger | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#a11y-focus-trap` | prototype | confirmed |
| L-43 | Full keyboard path: Enter submits, arrows navigate menu, Esc closes | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#a11y-keyboard` | prototype | confirmed |
| L-44 | Destructive red ≥ 4.5:1; focus ring visible on light/dark | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#a11y-contrast` | prototype | confirmed |
| L-45 | Icon-only buttons carry aria-label including member name | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#a11y-labels` | prototype | confirmed |
| L-46 | Desktop dialog ≥ 768px; mobile bottom-sheet < 768px | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#platform-responsive` | prototype | confirmed |
| L-47 | Bottom-sheet respects `env(safe-area-inset-bottom)` | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#platform-safe-area` | prototype | confirmed |
| L-48 | Evergreen Chrome/Safari/Firefox/Edge; IE11 unsupported | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#platform-browsers` | prototype | confirmed |
| L-49 | Offline banner; mutation actions disabled with queued copy | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#platform-offline` | prototype | confirmed |
| L-50 | Invitations are delivered by email and persisted with the invite schema (fields, 7-day expiry) — prototype proves the contract; server implementation deferred to spec | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#data-invite-schema` | prototype | `[DEFERRED TO SPEC]` |
| L-51 | Bulk member import: no behavior observed in the prototype — owner to confirm in/out of scope | — | owner | `[OPEN]` |

- **Type:** prototype · user · owner. **Status:** confirmed · `[OPEN]` · `[DEFERRED TO SPEC]`.
- **Open questions:** L-51 (bulk import in/out of scope) mirrored to §12 — not blocking synthesis; listed in `parity-report.md`.
