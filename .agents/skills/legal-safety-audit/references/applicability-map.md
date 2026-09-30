# Applicability Map — does this check apply, and how do we know?

**Purpose:** every check is conditional, not universal (Decision D5). Before running any check, test whether it applies to *this* app using **two evidence sources** (Decision D6):

1. **Interview signal** — what the owner tells you in the Step-0 app-profile intake.
2. **Code/config inspection signal** — what the skill can verify itself by reading the codebase.

If a check does not apply, **skip it with a disclosed reason and the evidence behind the decision** (Guardrail G6). Never skip silently. Never assume a check applies without a signal — but when interview and code disagree, trust code and flag the discrepancy.

> Skip-with-disclosure beats both false positives (running a cookie check on a cookieless app) and false negatives (missing a dynamically-loaded SDK). The owner sees every skip and can override.

## App-profile intake (Step 0)

Ask once, record the answers, use them for every applicability test:

- **Platform:** native mobile / web / desktop / hybrid — which surfaces exist?
- **Monetization:** free / ad-supported / in-app purchase via App Store or Play / direct sales (own checkout) / subscription?
- **Audience:** adults-only (enforced?) / general / includes minors?
- **Email:** none / transactional only / marketing + newsletters?
- **Third-party SDKs:** analytics, ads, crash reporting, attribution — which?
- **Reviews:** do you host user-facing ratings of third parties?
- **Company:** sector (e-commerce, banking, e-books, ticketing, health, other) + size (microenterprise <10 staff/<€2M, or larger)?
- **Region(s):** where are your users? (drives `jurisdiction-map.md`)

## Applicability tests

| # | Check | Applies WHEN | Skip WHEN (disclose reason) | Interview signal | Code/config inspection signal |
|---|---|---|---|---|---|
| 1 | Privacy policy | Any personal data processed | Genuinely zero personal data (rare) | "we collect email / analytics / accounts" | auth code, DB user tables, any network call sending user data |
| 2 | Terms of service | Almost always (any service with users) | Truly no user relationship | "users sign up / use the app" | account/session code, EULA acceptance flows |
| 3 | Refund policy | You process payment directly (own checkout/web) | Free app, OR all purchases via App Store/Play (platform T&Cs govern) — **but EU withdrawal right can still bind your own direct sales** | "we sell via our website / Stripe" vs "only in-app IAP" | Stripe/PayPal/Braintree SDK; a `/checkout` route; store-billing APIs only |
| 4 | Cookie policy | Web cookies OR tracking/ad/analytics SDK device-storage, OR companion website | Pure native app, technically-necessary data only, no 3rd-party SDKs | "we use GA / Firebase / Meta pixel" | `Set-Cookie`, `localStorage`, analytics/ad SDK imports, a web bundle |
| 5 | Cookie consent banner | Same as #4 AND region requires prior opt-in (GDPR/ePrivacy) | No non-essential storage, OR region has no opt-in duty | region = EU/UK + tracking present | tracking SDK present + no existing consent gate in code |
| 6 | Business details | You are a trader/seller, esp. EU | Pure hobby/no commercial activity (rare) | "we're a registered company selling X" | pricing pages, company/legal footer, imprint |
| 7 | Unsubscribe link (in-app/email settings) | You send marketing email | Only transactional mail (password reset, receipts) | "we send newsletters / promos" | mailer code with marketing templates vs transactional-only sends |
| 8 | Form consent | Any form collecting personal data | No data-collecting forms | signup/contact/newsletter forms exist | `<form>`, input fields capturing PII, consent checkboxes present/absent |
| 9 | No unnecessary data (minimization) | Any personal data collected | No personal data | "we collect DOB, location, contacts…" | schema/columns, permission requests (location, contacts) vs stated purpose |
| 10 | Third-party SDK audit | Any 3rd-party SDK that can send data | No third-party SDKs | listed SDKs in intake | dependency manifest (package.json, Podfile, build.gradle), SDK init calls |
| 11 | Remove dark patterns | App has consent/purchase/cancel flows | No such flows (rare) | "we have a paywall / cancel flow" | cancel flows, consent UI, pre-checked boxes, confirm-shaming copy |
| 12 | Remove hidden fees | Paid product / subscriptions | Fully free, OR transparent one-off / standard pricing | "we add service/processing fees" | pricing/checkout code adding fees late; fee fields not shown pre-purchase |
| 13 | Remove fake reviews | You host public third-party ratings OR bought reviews | Normal app, no user-facing ratings marketplace | "we have a review/rating system" | review/rating models, testimonial components with unverifiable sources |
| 14 | Remove unsupported claims | You make health/finance/performance/marketing claims | No such claims | marketing copy with "best/guaranteed/cures" | landing-page copy, store listing strings, claim text in UI |
| 15 | Accessibility — alt text | Web/visual surface AND (EAA-covered sector+size OR ADA-exposed) | Private microenterprise in non-covered sector, OR no visual content | sector + size + "we have a web app" | `<img>`/`Image` without alt, icon-only buttons without labels |
| 16 | Accessibility — color contrast | Same as #15 | Same as #15 | same | CSS/theme colors; text contrast <4.5:1 normal / <3:1 large, UI-component/focus contrast <3:1 (WCAG 1.4.3 + 1.4.11) |
| 17 | Accessibility — keyboard navigation | Web or desktop surface, or external-keyboard support | Phone-only pure-touch app | "we have a web/desktop app" | web routes, focus management code, `tabindex`, custom controls without keyboard handlers |
| 18 | Business details in emails | You send commercial email | No commercial email | "we send promos" | mailer templates missing postal address / sender identity |
| 19 | Age/kids-data consent | App targets or attracts minors, OR processes children's data | Explicitly adult-only (enforced) AND no children's data | "our users include under-18s" / "adults only, age-gated" | age-gate code present/absent, data collection from likely-minor users |
| 20 | Data deletion request | Any personal data stored | No stored personal data | "users have accounts" | user records in DB, no existing delete-account/erasure endpoint |
| 21 | Font / image / media licensing | You bundle fonts, images, icons, or media | Only OS/system fonts + own original assets | "we use Google Fonts / stock images / an icon pack" | font files in assets, image/icon directories, third-party asset packages in manifest |

## When code and interview disagree

- **Code shows an SDK the owner didn't mention** → the check APPLIES. Flag: "You didn't list Firebase Analytics, but `google-services.json` and the SDK init are in the code — cookie/consent + SDK-audit checks apply."
- **Owner says "we use analytics" but code shows none** → note the discrepancy; the check may apply to a planned feature. Ask.
- **Dynamically-loaded / server-configured SDKs** are the main false-negative risk. When inspection is inconclusive, do NOT skip — surface it as "possibly applies, could not confirm from code; owner please verify."
