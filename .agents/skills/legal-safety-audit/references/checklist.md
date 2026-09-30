# Legal Safety Checklist — 20 checks, two phases

The 20 checks split by what the AI *does*: **Phase A generates documents**; **Phase B inspects and remediates the existing app**. Every check first runs its applicability test (`applicability-map.md`, Guardrail G5) and either runs or skips-with-disclosure (G6).

Owning agents (Decision D3 — the skill delegates, it does not re-implement domain expertise):
`@technical-writer` (Clara) · `@security-engineer` (Victor) · `@product-designer` (Ivy) · `@ux-researcher` (Zara) · `@code-reviewer` (Scout)

---

## Phase A — Generate (7 documents)

Every document is produced as a **DRAFT with a `DRAFT — requires human/lawyer review` header** (Guardrail G1). The skill never marks a legal document "done."

| # | Document | Owning agent | Input needed | Output shape |
|---|---|---|---|---|
| A1 | Privacy policy | @technical-writer + @security-engineer | data-inventory from Phase B (#B2, #B3), region | `DRAFT` policy: what data, purpose, legal basis, retention, sharing, user rights, contact |
| A2 | Terms of service | @technical-writer | business model, liability posture, region | `DRAFT` ToS: service description, acceptable use, liability limits, dispute/venue |
| A3 | Refund policy | @technical-writer | who processes payment, region | `DRAFT` refund/withdrawal terms; EU 14-day withdrawal clause when applicable |
| A4 | Cookie policy | @technical-writer + @security-engineer | SDK/cookie inventory from #B3 | `DRAFT` cookie/SDK table: name, purpose, category, duration |
| A5 | Cookie consent banner copy | @product-designer + @technical-writer | cookie inventory, region | `DRAFT` banner copy + accept/reject parity spec (no dark pattern, see #B6) |
| A6 | Business details block | @technical-writer | legal entity name, address, contact | `DRAFT` imprint/legal-footer block |
| A7 | Unsubscribe + email footer copy | @technical-writer | marketing-email confirmation, postal address | `DRAFT` one-click unsubscribe copy + physical-address footer (CAN-SPAM) |

**Phase A rule:** if the input from Phase B is missing (e.g. no data inventory yet), run the relevant Phase-B check first. A1/A4 depend on B2/B3.

---

## Phase B — Audit & Remediate (13 checks)

Findings are **flagged with evidence**. For subjective/ground-truth items (fake reviews, hidden fees, unsupported claims) the skill **flags suspects only — it never deletes or asserts falsity** (Guardrail G2). It proposes fixes; the owner confirms.

| # | Check | Owning agent | What it inspects | Output shape |
|---|---|---|---|---|
| B1 | Form consent | @security-engineer + @product-designer | Consent on data-collecting forms | Findings: bundled/forced/pre-ticked consent → proposed fix |
| B2 | No unnecessary data (minimization) | @security-engineer | Collected fields vs stated purpose | Data inventory + over-collection flags → proposed removals |
| B3 | Third-party SDK audit | @security-engineer | Dependency manifests + SDK init | SDK inventory: what each sends, **data category**, **transfer destination (third-country / Schrems II)**, disclosed y/n → flags |
| B4 | Data deletion request flow | @security-engineer | Presence + reach of erasure mechanism | Gap flag + proposed delete-account/erasure endpoint. Must cover **propagation to backups/logs/processors**, **requester identity verification** (guard against IDOR), and the **GDPR Art. 17 statutory window** |
| B5 | Age / kids-data consent | @security-engineer + @product-designer | Age-gate + minor-data handling | Flag: missing gate / parental-consent path → proposed fix |
| B6 | Remove dark patterns | @product-designer + @ux-researcher | Consent/purchase/cancel flows **incl. consent-banner accept-vs-reject parity** | Flags: confirm-shaming, forced continuity, sneak-into-basket, reject-harder-than-accept, pre-selected opt-ins → proposed fix |
| B7 | Remove hidden fees | @product-designer + @code-reviewer | Checkout/pricing code | **Flag-only (G2):** late-added/undisclosed fees → proposed disclosure fix |
| B8 | Remove fake reviews | @ux-researcher | Review/testimonial content | **Flag-only (G2):** suspected fabricated/unverifiable — owner confirms; never auto-delete |
| B9 | Remove unsupported claims | @ux-researcher + @technical-writer | Marketing/UI copy | **Flag-only (G2):** claims lacking substantiation → owner provides proof or softens |
| B10 | Accessibility — alt text | @product-designer | Images/icons without text alternative | WCAG 1.1.1 findings → proposed alt text |
| B11 | Accessibility — color contrast | @product-designer | Text + UI-component contrast | Findings vs **WCAG 1.4.3** (<4.5:1 normal text, <3:1 large text ≥18pt/≥14pt-bold) **and WCAG 1.4.11** (<3:1 UI components + focus indicators) → proposed color fix |
| B12 | Accessibility — keyboard navigation | @product-designer | Keyboard operability | WCAG 2.1.1 findings → proposed focus/handler fix |
| B13 | Font / image / media licensing | @security-engineer + @technical-writer | Fonts, images, icons, media in the app + assets | **Flag-only (G2):** assets lacking a verifiable license (font EULA, stock/image license, icon attribution) → owner supplies proof or replaces. Cannot confirm a license is valid — surfaces suspects with evidence |

---

## Consolidated report shape (skill output)

The skill ends by producing one report, not scattered edits:

```
# Legal Safety Audit — DRAFT (requires human/lawyer review)
> This report is NOT legal advice. It is an automated risk sweep. Every generated
> document is a draft that a qualified lawyer must review before you rely on it.
> Personal data is referenced by field name only, never by captured value (G4).

Region(s): <resolved>    App profile: <summary>    Date: <date>

## Ran
<checks that applied, with findings + proposed fixes/drafts>

## Skipped (with reason + evidence)   ← Guardrail G6
| Check | Reason skipped | Evidence |
|---|---|---|
| A3 Refund | Free app, no direct payment | no payment SDK in manifest; owner confirmed free |
| ...

## Flagged for owner decision (not acted on)   ← Guardrail G2
<suspected fake reviews / hidden fees / unsupported claims / unlicensed assets — evidence only>

## Legal review required
<every generated document is a DRAFT; list them>
```

## Non-negotiable semantics

- **G1** — generated legal docs carry the DRAFT/human-review header. Always.
- **G2** — fake reviews / hidden fees / unsupported claims are flagged with evidence, never deleted or asserted as fact by the skill.
- **G3/G5** — region resolved and applicability tested before any check runs.
- **G4** — reference form fields by name; never echo captured PII values. Enforced by a redaction pass before the report is written (see SKILL.md Step 2/Step 3).
- **G6** — every skipped check is disclosed with reason + evidence.
