---
purpose: Canonical decision log for this spec. Records what was decided, why, and what alternatives were rejected. Never delete — mark superseded.
audience: All agents, product-manager
paired_with: SPEC.md, prd-template.md
---

# Decision Log

Canonical memory for this spec. Decisions made, alternatives rejected, rationale.

## Decisions

### [SPEC] {decision summary} [date: YYYY-MM-DD]
**What:** {what was decided}
**Why:** {rationale}
**Alternatives considered:** {what was rejected and why}
**Impact:** {CAP-N affected}

---

Append new decisions above. Never delete or modify prior entries. Mark superseded with `[SUPERSEDED]` and reference the replacement.

## Filled example (delete or replace with the real first entry)

### [SPEC] Hide Kasbon from retail users server-side [date: 2026-09-05]
**What:** `getPaymentMethods` filters by `user_type` before responding; frontend renders as-is.
**Why:** retail users cannot use Kasbon — showing it grayed out caused support tickets and confusion.
**Alternatives considered:** client-side filtering (rejected — bypassable, duplicated logic); grayed-out entry (rejected — tested poorly in concept review).
**Impact:** CAP-2 affected.
