# Jurisdiction Map — which regime drives each check

**Purpose:** the skill ships region-agnostic (Decision D7). At runtime, Step 0 resolves the user's region(s), then this map tells each check *which legal regime applies and why*. No regime is a build-time default.

> **This is not legal advice.** It is a routing aid so the audit is honest about *why* an item matters and *where*. Every generated document is a DRAFT for human/lawyer review (Guardrail G1).

## Regime legend

| Code | Regime | Primary trigger | Region |
|---|---|---|---|
| GDPR | General Data Protection Regulation + ePrivacy | Processing personal data of people in the EU/EEA | EU/EEA (extra-territorial) |
| UK-GDPR | UK GDPR + PECR | Personal data of people in the UK | UK |
| CCPA | CCPA / CPRA | Personal data of California residents (business thresholds apply) | US-California |
| COPPA | Children's Online Privacy Protection Act | Collecting data from children under 13 | US |
| ADA/WCAG | ADA + Section 508 (WCAG 2.1 AA reference) | Public accommodation / federal-adjacent digital services | US |
| EAA | European Accessibility Act (in force 28 Jun 2025) | Consumer products/services in covered sectors, above microenterprise size | EU |
| CAN-SPAM | CAN-SPAM Act | Commercial email to US recipients | US |
| PDP | Local data-protection law (e.g. Indonesia UU PDP, Brazil LGPD, etc.) | Personal data of local residents | Per-country |

> Local regimes (UU PDP, LGPD, PIPEDA, POPIA, etc.) mostly mirror GDPR's shape — consent, purpose limitation, deletion rights, breach duties. When the region resolves to one of these, apply the GDPR-shaped check and label it with the local regime name. Cite the local statute, not GDPR, in output.

## Check → regime matrix

| # | Check | Primary regime(s) | Why it matters |
|---|---|---|---|
| 1 | Privacy policy | GDPR, CCPA, PDP | Mandatory disclosure of what data you collect, why, and user rights. Missing/inaccurate policy is the most common enforcement trigger. |
| 2 | Terms of service | Contract law (all) | Defines the user-provider agreement; limits liability; sets dispute terms. Not privacy law, but core legal protection. |
| 3 | Refund policy | Consumer law (EU withdrawal right; local consumer acts) | Required where you sell directly. EU grants a 14-day withdrawal right on distance sales (digital-goods carve-out if consent given). |
| 4 | Cookie policy | ePrivacy (consent std via GDPR), UK-PECR | Required if you set non-essential cookies or SDK device-storage. Discloses each cookie/SDK, purpose, and duration. |
| 5 | Cookie consent banner | ePrivacy art. 5(3) (consent std via GDPR), UK-PECR | Prior opt-in consent for non-essential tracking. Trigger is ePrivacy; GDPR supplies the consent standard. Pre-ticked boxes and "reject" being harder than "accept" are violations. |
| 6 | Business details | Consumer/e-commerce law (EU e-Commerce Directive; local) | Legal entity name, address, contact must be discoverable. Required for EU traders. |
| 7 | Unsubscribe link | CAN-SPAM, GDPR | Every marketing email needs a working one-click unsubscribe + physical address (CAN-SPAM). Transactional mail is exempt. |
| 8 | Form consent | GDPR, CCPA | Consent must be freely given, specific, informed, unambiguous. No bundled/forced consent. |
| 9 | No unnecessary data (minimization) | GDPR art. 5(1)(c), PDP | Collect only what you need for the stated purpose. Over-collection is a standalone violation. |
| 10 | Third-party SDK audit | GDPR, CCPA | You are liable for what your analytics/ad/crash SDKs send. Undisclosed data-sharing = violation. |
| 11 | Remove dark patterns | GDPR (consent validity), FTC Act, EU consumer law | Manipulative UI that coerces consent or purchase. Invalidates consent; draws regulator action. |
| 12 | Remove hidden fees | FTC Act, EU consumer law (price transparency) | Undisclosed/late-added fees are deceptive practice. Total price must be clear before purchase. |
| 13 | Remove fake reviews | FTC Act, EU UCPD | Fabricated or paid-undisclosed reviews are illegal deceptive practice. |
| 14 | Remove unsupported claims | FTC Act, EU UCPD, sector rules | Health/finance/performance claims need substantiation. "Best", "guaranteed", "cures" without proof = risk. |
| 15 | Accessibility — alt text | ADA/WCAG, EAA | Non-text content needs text alternatives (WCAG 1.1.1). |
| 16 | Accessibility — color contrast | ADA/WCAG, EAA | Text contrast ≥ 4.5:1 normal / ≥ 3:1 large text (WCAG 1.4.3); UI components + focus indicators ≥ 3:1 (WCAG 1.4.11). |
| 17 | Accessibility — keyboard navigation | ADA/WCAG, EAA | All functionality operable by keyboard (WCAG 2.1.1). Relevant to web/desktop surfaces. |
| 18 | Business details in emails | CAN-SPAM | Commercial email must carry a valid physical postal address. |
| 19 | Age/kids-data consent | COPPA, GDPR art. 8, PDP | If minors use the app, parental consent + stricter handling apply. COPPA < 13; GDPR 13-16 per member state. |
| 20 | Data deletion request | GDPR art. 17, CCPA, PDP | Users can request erasure. You must provide a working mechanism and honor it within the statutory window. |
| 21 | Font / image / media licensing | Copyright law (all), font EULAs | Using fonts, images, icons, or media without a valid license is copyright infringement — a common and cheap-to-avoid claim source. |

## Runtime behavior

1. Step 0 resolves region(s). Multi-region apps load the **union** of applicable regimes.
2. Each check reads its regime row here to phrase findings ("required under GDPR art. 17 for your EU users") rather than vaguely ("you should probably…").
3. When region is unknown/unstated, the skill asks — it does **not** assume a default (G3).
