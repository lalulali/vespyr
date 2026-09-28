# Seeded Behaviors — workspace-members.html (02n.F ground truth)

Ground truth for the 02n reverse-PRD dry-run and `spec_parity.js`. Every row below is a behavior the fixture prototype encodes; the 01d inventory must list it with the exact `path#id` anchor (A11 grammar), and the 02d Evidence Ledger must trace a statement to it.

- Prototype: `evals/fixtures/prototypes/reverse-prd/workspace-members.html`
- Kernel: `evals/fixtures/prototypes/reverse-prd/SPEC.md`
- Detail classes: 10 — screen states · edge cases & validation · data fields & types · permissions & auth · navigation & flows · copy & tone · telemetry · performance notes · accessibility · platform constraints
- Total seeded: **82**

| # | Anchor (`path#id`) | Class | Behavior |
|---|---|---|---|
| 1 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#state-switcher` | Screen states | Prototype-only control toggling Day 0 / Day 30 / Loading / Error (State Switcher, Review 10 §4) |
| 2 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#state-empty` | Screen states | Day 0 empty state: "No teammates yet" + invite CTA |
| 3 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#state-loading` | Screen states | Loading skeleton rows with `aria-busy` |
| 4 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#state-error` | Screen states | Load-failure panel with Retry action |
| 5 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#state-populated` | Screen states | Day 30 populated table with members, invites, a reachable sample view, and a non-interactive pagination shell |
| 6 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#validation-email-format` | Edge cases & validation | Inline invalid-email-format error |
| 7 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#validation-duplicate-email` | Edge cases & validation | Duplicate invite error naming the email |
| 8 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#validation-max-members` | Edge cases & validation | Free plan cap 25/25 is reachable; invite is disabled before submission and the plan-specific upgrade hint is visible |
| 9 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#validation-self-invite` | Edge cases & validation | Self-invite blocked |
| 10 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#edge-invite-expiry` | Edge cases & validation | **executable-local:** a seeded pending invite shows its seven-day state; the seeded expired invite can be resent to the same ID. Automatic server expiry is not claimed |
| 11 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#edge-long-names` | Edge cases & validation | Long Latin names and emails remain fully readable through wrapping/overflow treatment; mobile does not rely on hover recovery |
| 12 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#edge-unicode-names` | Edge cases & validation | Unicode names (Amélie 陳大文) render correctly |
| 13 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#data-member-schema` | Data fields & types | **annotation-only:** member field list is reverse-spec evidence, not a production schema or persisted model |
| 14 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#data-invite-schema` | Data fields & types | **annotation-only:** invite field list is reverse-spec evidence, not a production schema or service contract |
| 15 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#data-role-enum` | Data fields & types | Role enum owner/admin/member; single owner |
| 16 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#data-status-enum` | Data fields & types | Status enum active/invited/suspended/expired and display mapping |
| 17 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#data-dates` | Data fields & types | **annotation-only:** ISO-8601 storage and relative date rules remain design evidence; fixture labels do not prove production date handling |
| 18 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perm-owner-actions` | Permissions & auth | Owner can perform the approved local actions: invite (Member/Admin), revoke/resend, role change, remove, reactivate, and ownership transfer, subject to the one-owner guard |
| 19 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perm-admin-restricted` | Permissions & auth | Row-scoped Admin policy: invite as Member, revoke/resend invites, and remove a regular Member; role changes, Admin/Owner mutations, reactivation, transfer, and ineligible bulk actions are denied with reasons |
| 20 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perm-member-readonly` | Permissions & auth | Member sees the view-only banner; local mutation controls, including invite, are disabled with a reason while list/details remain available |
| 21 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perm-session-expired` | Permissions & auth | **deferred-production annotation:** session redirect and draft preservation are recorded as future decisions; no redirect, session, or persistence is implemented |
| 22 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perm-sso-scim-note` | Permissions & auth | SSO/SCIM-managed membership is read-only: list/details remain visible while invite, role, ownership, invite-lifecycle, reactivation, and bulk mutations are disabled with the managed-workspace reason |
| 23 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#nav-settings-tabs` | Navigation & flows | Settings tabs General/Members/Billing/Integrations; Members active |
| 24 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#nav-invite-modal` | Navigation & flows | Invite modal: email + role + optional message; Esc/Cancel closes |
| 25 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#nav-remove-confirm` | Navigation & flows | Remove-member confirmation dialog with destructive styling |
| 26 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#nav-pagination` | Navigation & flows | **executable-local:** sample rows expose a disabled page-1-of-1 shell; full production pagination and request semantics remain deferred |
| 27 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#nav-role-change` | Navigation & flows | Inline invite role selection updates the entity and both projections; the local failure seam restores the prior snapshot |
| 28 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#member-search` | Navigation & flows | Search members by name/email; empty-search results state |
| 29 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#copy-empty-title` | Copy & tone | Empty-state headline "No teammates yet" + supporting line |
| 30 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#copy-invite-cta` | Copy & tone | Primary CTA label "Invite teammate" / modal submit "Send invite" |
| 31 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#copy-error-load` | Copy & tone | Load-error copy states that the prototype could not show local records, with Retry |
| 32 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#copy-toast-success` | Copy & tone | Success toast "Invite sent to jane@acme.com" |
| 33 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#copy-confirm-remove` | Copy & tone | Remove confirmation "Remove Jane? They'll lose access immediately." |
| 34 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#copy-suspended-banner` | Copy & tone | Suspended-member banner with reason ("billing hold") |
| 35 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#telemetry-events` | Telemetry | **deferred-production annotation:** proposed event names only; no telemetry sink or collection is implemented |
| 36 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#telemetry-props` | Telemetry | **deferred-production annotation:** proposed properties only; no event export is implemented |
| 37 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#telemetry-pii-rule` | Telemetry | **deferred-production annotation:** proposed email-hashing rule only; no hashing, export, or privacy guarantee is implemented |
| 38 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perf-list-virtualization` | Performance notes | **deferred-production annotation:** virtualization beyond 100 members is proposed; the fixture renders a small local sample |
| 39 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perf-search-debounce` | Performance notes | **executable-local:** 300ms local filter debounce; request cancellation remains deferred because no request exists |
| 40 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#perf-optimistic-updates` | Performance notes | **executable-local:** mutation snapshot/apply/rollback and one visible error outcome; service retry and atomicity remain deferred |
| 41 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#a11y-live-region` | Accessibility | **executable-local:** the permanent live region is the single status announcer, using assertive text for field errors and polite text for ordinary outcomes |
| 42 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#a11y-focus-trap` | Accessibility | Modal focus trap; Esc closes; focus returns to trigger |
| 43 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#a11y-keyboard` | Accessibility | Full keyboard path: Enter submits, arrows navigate menu, Esc closes |
| 44 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#a11y-contrast` | Accessibility | **annotation-only:** contrast target is documented; token changes are safer defaults, not a measured WCAG result |
| 45 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#a11y-labels` | Accessibility | Icon-only buttons carry aria-label including member name |
| 46 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#platform-responsive` | Platform constraints | **executable-local:** desktop dialog and narrow bottom-sheet/card layout are implemented in the fixture CSS |
| 47 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#platform-safe-area` | Platform constraints | **executable-local:** bottom-sheet inner padding includes `env(safe-area-inset-bottom)`; device verification remains a separate gate |
| 48 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#platform-browsers` | Platform constraints | **deferred-production annotation:** browser support matrix is not established by this fixture |
| 49 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#platform-offline` | Platform constraints | **executable-local:** offline mode keeps reads visible and disables mutations; no queue or service behavior is claimed |
| 50 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#role-switcher` | Screen states | Prototype-only viewer switcher for Owner, Admin, and Member permission states |
| 51 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#workspace-mode-switcher` | Screen states | Prototype-only Normal, SSO/SCIM, and Offline workspace scenarios |
| 52 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#theme-toggle` | Screen states | Light/dark theme toggle changes the current prototype state only; no preference persistence is implemented |
| 53 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#seat-usage` | Data fields & types | **executable-local:** seat usage, pending invites, progress, and remaining-seat feedback are derived from the local entity state |
| 54 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#member-filters` | Navigation & flows | Role and status filters combine with search and clear independently |
| 55 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#bulk-actions` | Navigation & flows | Unique entity selection drives all-or-nothing local bulk revoke and Owner-only bulk role actions; mixed/ineligible selections are denied |
| 56 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#member-actions-menu` | Navigation & flows | Desktop and mobile per-entity menus cover details, role changes, invite lifecycle, removal, reactivation, and ownership transfer through one policy evaluator |
| 57 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#nav-member-details` | Navigation & flows | Member details dialog shows the local record's full identity, role, status, dates, and projection note |
| 58 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#nav-transfer-ownership` | Permissions & auth | Owner transfer selects a new owner and demotes the previous owner to Admin |
| 59 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#state-no-results` | Screen states | Empty search result with clear-filters recovery |
| 60 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#nav-invite-discard-confirm` | Edge cases & validation | Dirty invite close asks before discarding entered data |
| 61 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#invite-resend` | Navigation & flows | Resend restores the same invite ID to pending state, resets its local expiry, and never creates a duplicate |
| 62 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#toast-error` | Copy & tone | Failed local mutation restores the saved entity/selection snapshot and shows one visible error outcome |
| 63 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#mobile-member-cards` | Platform constraints | Members table becomes stacked cards below 768px with full identity, 44px targets, selection, and the same action policy |
| 64 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#column-visibility` | Navigation & flows | Column disclosure contains ordinary role, status, joined, and last-active checkboxes; it is not exposed as a menu |
| 65 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#selection-summary` | Copy & tone | **executable-local:** selection summary reports unique entity IDs, not desktop/mobile checkbox instances |
| 66 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#clear-filters` | Navigation & flows | Clear action resets query, role, and status filters together |
| 67 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#offline-banner` | Platform constraints | Offline state shows a visible read-only banner and disables mutations; no queue or service recovery is claimed |
| 68 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#prototype-state-authority` | Data fields & types | **executable-local:** one in-page prototype state authority drives entities, screen, viewer role, workspace mode, filters, page, unique selection, mutation snapshots, and derived counts; no API, persistence, authentication, or authorization service is implemented |
| 69 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#policy-evaluator` | Permissions & auth | **executable-local:** one action/target/viewer/mode policy evaluator drives desktop and mobile enablement and exposes denial reasons; it is a fixture simulation, not server authorization |
| 70 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#team-49-of-50` | Edge cases & validation | **executable-local:** reachable Team 49/50 scenario counts pending invites, shows one remaining seat, and allows one valid invite to reach 50/50 |
| 71 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#team-50-of-50` | Edge cases & validation | **executable-local:** reachable Team 50/50 scenario disables invite before submission and shows Team-specific cap feedback without creating an entity |
| 72 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#free-25-of-25` | Edge cases & validation | **executable-local:** Free 25/25 regression remains reachable with Free-specific cap feedback and upgrade context |
| 73 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#prototype-failure-seam` | Performance notes | **executable-local:** prototype-only fail-next-mutation control demonstrates snapshot rollback for a local mutation; it is not an API failure simulation |
| 74 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#mobile-navigation` | Platform constraints | **executable-local:** labelled mobile navigation drawer exposes the workspace destinations, supports Escape/backdrop close, and returns focus to its trigger |
| 75 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#mobile-action-parity` | Navigation & flows | **executable-local:** mobile cards expose the same details, role, removal, reactivation, invite lifecycle, and ownership actions as desktop with matching policy decisions |
| 76 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#mobile-selection` | Navigation & flows | **executable-local:** desktop and mobile checkboxes mirror one Set of unique entity IDs; select-all and bulk feedback do not double-count projections |
| 77 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#annotation-classification` | Data fields & types | **executable-local classification:** all 22 annotations visibly and machine-readably identify executable-local, annotation-only, or deferred-production evidence; non-executable claims are not reported as runtime proof |
| 78 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#error-association` | Accessibility | **executable-local:** invite errors use field association, focus the email input, and pass through the single live-region announcement path |
| 79 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#dialog-bottom-sheet` | Platform constraints | **executable-local:** dialogs bottom-anchor below 768px, include safe-area padding, route dirty Escape/Cancel/backdrop close through one decision path, and restore focus |
| 80 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#announcement-owner` | Accessibility | **executable-local:** the permanent live region is the sole status announcer; visible toasts do not carry competing live semantics |
| 81 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#focus-contrast-tokens` | Accessibility | **executable-local:** controls use a solid focus ring and readable semantic status/focus tokens; measured WCAG contrast remains an annotation-only production gate |
| 82 | `evals/fixtures/prototypes/reverse-prd/workspace-members.html#reduced-motion-safeguard` | Accessibility | **executable-local:** the existing prefers-reduced-motion rule reduces animation/transition/scroll motion while state changes and focus remain available |

- No anchor for a "bulk import members" flow — absent by design; an inventory row claiming it is an orphan/ghost test seed.
- No anchor for "audit log export" — absent by design (explicit non-goal in SPEC.md).
- **Focus boundary:** when a final-seat invite disables `#copy-invite-cta` at a plan cap, the local fixture returns focus to the stable enabled `#members` heading. This is an executable local fallback, not a production focus contract.
- **Transfer boundary:** when the active filter leaves no rendered eligible ownership target, the local fixture denies before opening the transfer dialog and exposes the reason in the policy explanation, toast, and live region.
