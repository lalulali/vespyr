# Seeded Behaviors — workspace-members.html (02n.F ground truth)

Ground truth for the 02n reverse-PRD dry-run and `spec_parity.js`. Every row below is a behavior the fixture prototype encodes; the 01d inventory must list it with the exact `path#id` anchor (A11 grammar), and the 02d Evidence Ledger must trace a statement to it.

- Prototype: `evals/fixtures/prototypes/reverse-prd/workspace-members.html`
- Kernel: `evals/fixtures/prototypes/reverse-prd/SPEC.md`
- Detail classes: 10 — screen states · edge cases & validation · data fields & types · permissions & auth · navigation & flows · copy & tone · telemetry · performance notes · accessibility · platform constraints
- Total seeded: **49**

| # | Anchor (`path#id`) | Class | Behavior |
|---|---|---|---|
| 1 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#state-switcher` | Screen states | Prototype-only control toggling Day 0 / Day 30 / Loading / Error (State Switcher, Review 10 §4) |
| 2 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#state-empty` | Screen states | Day 0 empty state: "No teammates yet" + invite CTA |
| 3 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#state-loading` | Screen states | Loading skeleton rows with `aria-busy` |
| 4 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#state-error` | Screen states | Load-failure panel with Retry action |
| 5 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#state-populated` | Screen states | Day 30 populated table with members, invites, and pagination |
| 6 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#validation-email-format` | Edge cases & validation | Inline invalid-email-format error |
| 7 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#validation-duplicate-email` | Edge cases & validation | Duplicate invite error naming the email |
| 8 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#validation-max-members` | Edge cases & validation | Free plan cap 25/25 — invite disabled with upgrade hint |
| 9 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#validation-self-invite` | Edge cases & validation | Self-invite blocked |
| 10 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#edge-invite-expiry` | Edge cases & validation | Pending invites expire after 7 days; Expired status + Resend |
| 11 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#edge-long-names` | Edge cases & validation | Long names/emails truncate with tooltip |
| 12 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#edge-unicode-names` | Edge cases & validation | Unicode names (Amélie 陳大文) render correctly |
| 13 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#data-member-schema` | Data fields & types | Member entity field list and types |
| 14 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#data-invite-schema` | Data fields & types | Invite entity field list and types |
| 15 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#data-role-enum` | Data fields & types | Role enum owner/admin/member; single owner |
| 16 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#data-status-enum` | Data fields & types | Status enum active/invited/suspended/expired and display mapping |
| 17 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#data-dates` | Data fields & types | ISO-8601 UTC storage; relative display < 7 days; null lastActive renders "Never" |
| 18 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perm-owner-actions` | Permissions & auth | Owner can invite, revoke, change roles, remove, transfer ownership |
| 19 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perm-admin-restricted` | Permissions & auth | Admin can invite/revoke only; admin/owner rows locked for role change and removal |
| 20 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perm-member-readonly` | Permissions & auth | Member sees view-only banner; no invite control |
| 21 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perm-session-expired` | Permissions & auth | Expired session redirects to sign-in with `?next=/settings/members`, draft preserved |
| 22 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perm-sso-scim-note` | Permissions & auth | SSO/SCIM-managed workspace disables manual invites with explanation |
| 23 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#nav-settings-tabs` | Navigation & flows | Settings tabs General/Members/Billing/Integrations; Members active |
| 24 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#nav-invite-modal` | Navigation & flows | Invite modal: email + role + optional message; Esc/Cancel closes |
| 25 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#nav-remove-confirm` | Navigation & flows | Remove-member confirmation dialog with destructive styling |
| 26 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#nav-pagination` | Navigation & flows | 25 rows per page with prev/next and page count |
| 27 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#nav-role-change` | Navigation & flows | Inline role dropdown on pending invite; optimistic update with rollback |
| 28 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#member-search` | Navigation & flows | Search members by name/email; empty-search results state |
| 29 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#copy-empty-title` | Copy & tone | Empty-state headline "No teammates yet" + supporting line |
| 30 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#copy-invite-cta` | Copy & tone | Primary CTA label "Invite teammate" / modal submit "Send invite" |
| 31 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#copy-error-load` | Copy & tone | Load-error copy "We couldn't load your team." + Retry |
| 32 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#copy-toast-success` | Copy & tone | Success toast "Invite sent to jane@acme.com" |
| 33 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#copy-confirm-remove` | Copy & tone | Remove confirmation "Remove Jane? They'll lose access immediately." |
| 34 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#copy-suspended-banner` | Copy & tone | Suspended-member banner with reason ("billing hold") |
| 35 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#telemetry-events` | Telemetry | Events: members_viewed, invite_sent, invite_revoked, invite_resent, role_changed, member_removed, search_performed |
| 36 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#telemetry-props` | Telemetry | Common props: workspace_id, actor_role, member_count, source_surface |
| 37 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#telemetry-pii-rule` | Telemetry | Emails hashed before export; no names or message bodies in events |
| 38 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perf-list-virtualization` | Performance notes | Virtualize beyond 100 members; ≤ 50 rendered rows |
| 39 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perf-search-debounce` | Performance notes | Search debounced 300ms; in-flight request cancelled on new keystroke |
| 40 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perf-optimistic-updates` | Performance notes | Role change/remove optimistic with rollback + error toast |
| 41 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#a11y-live-region` | Accessibility | Invite outcomes announced via `aria-live="polite"` |
| 42 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#a11y-focus-trap` | Accessibility | Modal focus trap; Esc closes; focus returns to trigger |
| 43 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#a11y-keyboard` | Accessibility | Full keyboard path: Enter submits, arrows navigate menu, Esc closes |
| 44 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#a11y-contrast` | Accessibility | Destructive red ≥ 4.5:1; focus ring visible on light/dark |
| 45 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#a11y-labels` | Accessibility | Icon-only buttons carry aria-label including member name |
| 46 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#platform-responsive` | Platform constraints | Desktop dialog ≥ 768px; mobile bottom-sheet < 768px |
| 47 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#platform-safe-area` | Platform constraints | Bottom-sheet respects `env(safe-area-inset-bottom)` |
| 48 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#platform-browsers` | Platform constraints | Evergreen Chrome/Safari/Firefox/Edge; IE11 unsupported |
| 49 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#platform-offline` | Platform constraints | Offline banner; mutation actions disabled with queued copy |

## Deliberately unseeded (negative controls for the parity gate)

- No anchor for a "bulk import members" flow — absent by design; an inventory row claiming it is an orphan/ghost test seed.
- No anchor for "audit log export" — absent by design (explicit non-goal in SPEC.md).
