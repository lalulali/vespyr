---
prototype: evals/fixtures/prototypes/reverse-prd/workspace-members.html
prototype_type: file
generated: "2026-09-22"
generator: "@product-designer"
dry_run: 02n.2 fixture — extraction-only walk-through of the seeded prototype
---

# Prototype Inventory — Workspace Member Management (reverse-PRD dry-run fixture)

Extraction-only record of what the prototype does. No requirements language, no interpretation.

## Rows

| ID | Kind | Name | Anchor (`path#id`) | Observable fact |
|---|---|---|---|---|
| INV-01 | interaction | State switcher | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#state-switcher` | Prototype-only control toggling Day 0 / Day 30 / Loading / Error (state switcher) |
| INV-02 | state | State empty | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#state-empty` | Day 0 empty state: "No teammates yet" + invite CTA |
| INV-03 | state | State loading | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#state-loading` | Loading skeleton rows with `aria-busy` |
| INV-04 | state | State error | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#state-error` | Load-failure panel with Retry action |
| INV-05 | state | State populated | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#state-populated` | Day 30 populated table with members, invites, and pagination |
| INV-06 | behavior | Validation email format | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#validation-email-format` | Inline invalid-email-format error |
| INV-07 | behavior | Validation duplicate email | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#validation-duplicate-email` | Duplicate invite error naming the email |
| INV-08 | behavior | Validation max members | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#validation-max-members` | Free plan cap 25/25 — invite disabled with upgrade hint |
| INV-09 | behavior | Validation self invite | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#validation-self-invite` | Self-invite blocked |
| INV-10 | behavior | Edge invite expiry | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#edge-invite-expiry` | Pending invites expire after 7 days; Expired status + Resend |
| INV-11 | behavior | Edge long names | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#edge-long-names` | Long names/emails truncate with tooltip |
| INV-12 | behavior | Edge unicode names | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#edge-unicode-names` | Unicode names (Amélie 陳大文) render correctly |
| INV-13 | behavior | Data member schema | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#data-member-schema` | Member entity field list and types |
| INV-14 | behavior | Data invite schema | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#data-invite-schema` | Invite entity field list and types |
| INV-15 | behavior | Data role enum | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#data-role-enum` | Role enum owner/admin/member; single owner |
| INV-16 | behavior | Data status enum | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#data-status-enum` | Status enum active/invited/suspended/expired and display mapping |
| INV-17 | behavior | Data dates | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#data-dates` | ISO-8601 UTC storage; relative display < 7 days; null lastActive renders "Never" |
| INV-18 | behavior | Perm owner actions | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perm-owner-actions` | Owner can invite, revoke, change roles, remove, transfer ownership |
| INV-19 | behavior | Perm admin restricted | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perm-admin-restricted` | Admin can invite/revoke only; admin/owner rows locked for role change and removal |
| INV-20 | behavior | Perm member readonly | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perm-member-readonly` | Member sees view-only banner; no invite control |
| INV-21 | behavior | Perm session expired | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perm-session-expired` | Expired session redirects to sign-in with `?next=/settings/members`, draft preserved |
| INV-22 | behavior | Perm sso scim note | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perm-sso-scim-note` | SSO/SCIM-managed workspace disables manual invites with explanation |
| INV-23 | flow | Nav settings tabs | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#nav-settings-tabs` | Settings tabs General/Members/Billing/Integrations; Members active |
| INV-24 | flow | Nav invite modal | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#nav-invite-modal` | Invite modal: email + role + optional message; Esc/Cancel closes |
| INV-25 | flow | Nav remove confirm | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#nav-remove-confirm` | Remove-member confirmation dialog with destructive styling |
| INV-26 | flow | Nav pagination | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#nav-pagination` | 25 rows per page with prev/next and page count |
| INV-27 | flow | Nav role change | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#nav-role-change` | Inline role dropdown on pending invite; optimistic update with rollback |
| INV-28 | flow | Member search | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#member-search` | Search members by name/email; empty-search results state |
| INV-29 | behavior | Copy empty title | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#copy-empty-title` | Empty-state headline "No teammates yet" + supporting line |
| INV-30 | behavior | Copy invite cta | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#copy-invite-cta` | Primary CTA label "Invite teammate" / modal submit "Send invite" |
| INV-31 | behavior | Copy error load | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#copy-error-load` | Load-error copy "We couldn't load your team." + Retry |
| INV-32 | behavior | Copy toast success | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#copy-toast-success` | Success toast "Invite sent to jane@acme.com" |
| INV-33 | behavior | Copy confirm remove | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#copy-confirm-remove` | Remove confirmation "Remove Jane? They'll lose access immediately." |
| INV-34 | behavior | Copy suspended banner | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#copy-suspended-banner` | Suspended-member banner with reason ("billing hold") |
| INV-35 | behavior | Telemetry events | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#telemetry-events` | Events: members_viewed, invite_sent, invite_revoked, invite_resent, role_changed, member_removed, search_performed |
| INV-36 | behavior | Telemetry props | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#telemetry-props` | Common props: workspace_id, actor_role, member_count, source_surface |
| INV-37 | behavior | Telemetry pii rule | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#telemetry-pii-rule` | Emails hashed before export; no names or message bodies in events |
| INV-38 | behavior | Perf list virtualization | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perf-list-virtualization` | Virtualize beyond 100 members; ≤ 50 rendered rows |
| INV-39 | behavior | Perf search debounce | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perf-search-debounce` | Search debounced 300ms; in-flight request cancelled on new keystroke |
| INV-40 | behavior | Perf optimistic updates | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perf-optimistic-updates` | Role change/remove optimistic with rollback + error toast |
| INV-41 | behavior | A11y live region | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#a11y-live-region` | Invite outcomes announced via `aria-live="polite"` |
| INV-42 | behavior | A11y focus trap | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#a11y-focus-trap` | Modal focus trap; Esc closes; focus returns to trigger |
| INV-43 | behavior | A11y keyboard | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#a11y-keyboard` | Full keyboard path: Enter submits, arrows navigate menu, Esc closes |
| INV-44 | behavior | A11y contrast | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#a11y-contrast` | Destructive red ≥ 4.5:1; focus ring visible on light/dark |
| INV-45 | behavior | A11y labels | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#a11y-labels` | Icon-only buttons carry aria-label including member name |
| INV-46 | behavior | Platform responsive | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#platform-responsive` | Desktop dialog ≥ 768px; mobile bottom-sheet < 768px |
| INV-47 | behavior | Platform safe area | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#platform-safe-area` | Bottom-sheet respects `env(safe-area-inset-bottom)` |
| INV-48 | behavior | Platform browsers | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#platform-browsers` | Evergreen Chrome/Safari/Firefox/Edge; IE11 unsupported |
| INV-49 | behavior | Platform offline | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#platform-offline` | Offline banner; mutation actions disabled with queued copy |

## Coverage self-check (10 detail classes)

| Detail class | Rows covering it |
|---|---|
| Screen states | INV-01, INV-02, INV-03, INV-04, INV-05 |
| Edge cases & validation | INV-06, INV-07, INV-08, INV-09, INV-10, INV-11, INV-12 |
| Data fields & types | INV-13, INV-14, INV-15, INV-16, INV-17 |
| Permissions & auth | INV-18, INV-19, INV-20, INV-21, INV-22 |
| Navigation & flows | INV-23, INV-24, INV-25, INV-26, INV-27, INV-28 |
| Copy & tone | INV-29, INV-30, INV-31, INV-32, INV-33, INV-34 |
| Telemetry | INV-35, INV-36, INV-37 |
| Performance notes | INV-38, INV-39, INV-40 |
| Accessibility | INV-41, INV-42, INV-43, INV-44, INV-45 |
| Platform constraints | INV-46, INV-47, INV-48, INV-49 |

## Unobserved questions (not inventory rows)

- Bulk member import could not be observed anywhere in the prototype (candidate for a question to the owner; not a row).
