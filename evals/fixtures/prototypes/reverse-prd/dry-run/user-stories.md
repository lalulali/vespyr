---
feature: Workspace Member Management (Orbit)
mode: reverse
generated: "2026-09-22"
source_ledger: evals/fixtures/prototypes/reverse-prd/dry-run/requirements.md#14
---

# User Stories — Workspace Member Management (Orbit)

Reverse-mode dry-run (02n.4). Every story and AC traces to Evidence Ledger rows (`L-NN`); no row, no story. AC-H = happy path, AC-U = unhappy/error path, AC-E = edge case.

## US-01 — Browse the member list
As a workspace admin, I want to see every member and pending invite so I can understand who has access.
- **AC-H1** (L-05, L-13, L-15, L-16): populated list shows name, email, role, status, last active; pending invites show expiry text. [ ] 
- **AC-U1** (L-04, L-31): when the list fails to load, an error panel shows "We couldn't load your team." with Retry. [ ]
- **AC-E1** (L-11, L-12): long names truncate with a tooltip; unicode names render without mojibake. [ ]

## US-02 — Empty-state onboarding
As a new workspace admin with no teammates, I want a clear first action so I can start collaborating.
- **AC-H1** (L-02, L-29, L-30): Day 0 shows "No teammates yet" with the invite CTA. [ ]
- **AC-U1** (L-28): a search that matches nothing shows an empty-results state. [ ]
- **AC-E1** (L-01): the Day 0 / Day 30 / Error states are toggleable in the prototype's state switcher. [ ]

## US-03 — Invite a teammate
As a workspace admin, I want to invite a teammate with a role so they can join quickly.
- **AC-H1** (L-24, L-30, L-32): valid email + role + optional message sends the invite and shows a success toast. [ ]
- **AC-U1** (L-06, L-07): invalid email and duplicate invite each show a specific inline error. [ ]
- **AC-E1** (L-08, L-09, L-22, L-21): Free-cap (25/25), self-invite, SSO/SCIM-managed, and expired-session paths are blocked or redirected with explanation. [ ]

## US-04 — Manage roles
As a workspace owner, I want to change a member's role so access stays correct as the team changes.
- **AC-H1** (L-27, L-15): inline role dropdown applies optimistically. [ ]
- **AC-U1** (L-40): API failure rolls the change back with an error toast. [ ]
- **AC-E1** (L-18, L-19): owner-only actions are hidden/disabled for admins; only one owner exists. [ ]

## US-05 — Remove a member or revoke an invite
As a workspace owner, I want to remove access deliberately so former teammates lose it immediately.
- **AC-H1** (L-25, L-33): destructive confirmation dialog precedes removal. [ ]
- **AC-U1** (L-19): admins cannot remove admins or the owner. [ ]
- **AC-E1** (L-34): a suspended member shows a banner with the reason. [ ]

## US-06 — Invite expiry and resend
As a workspace admin, I want stale invites to expire and be resendable so access never lingers.
- **AC-H1** (L-10, L-14): pending invites expire after 7 days; Expired rows offer Resend. [ ]
- **AC-U1** (L-35): resend failures emit telemetry for diagnosis. [ ]
- **AC-E1** (L-17): expiry display uses relative time under 7 days and absolute dates beyond. [ ]

## US-07 — Search and paginate
As a workspace admin with many members, I want to find anyone fast.
- **AC-H1** (L-28, L-39): search filters by name or email with a 300ms debounce and request cancellation. [ ]
- **AC-U1** (L-38): lists over 100 members virtualize (≤50 rendered rows). [ ]
- **AC-E1** (L-26): pagination shows 25 rows per page with page count. [ ]

## US-08 — Accessible and platform-safe interaction
As a keyboard or mobile user, I want the same capability without a mouse or a desktop.
- **AC-H1** (L-42, L-43, L-41): focus trap in dialogs, full keyboard path, polite announcements. [ ]
- **AC-U1** (L-49): offline mode disables mutations with an explanatory banner. [ ]
- **AC-E1** (L-46, L-47, L-45): mobile bottom-sheet respects safe-area insets; icon buttons carry aria-labels. [ ]

## US-09 — Telemetry with privacy
As a product team, we want usage signals without leaking PII.
- **AC-H1** (L-35, L-36): events and common props fire per the schema. [ ]
- **AC-U1** (L-37): emails are hashed before export; names/messages never leave the app. [ ]
- **AC-E1** (L-44): destructive color and focus ring meet contrast requirements in both themes. [ ]
