# Threat Model — {Feature / System}

> **Owner:** `@security-engineer` (Victor). **Mode:** design-time (STRIDE when `@architect` proposes the design) or audit-time.
> **Artifact:** `artifacts/output/05-execution/quality/threat-model.md`

## 1. Scope & trust boundaries

| Boundary | What crosses it | Trust level in → out |
|---|---|---|
| {e.g. browser → API} | {data} | untrusted → trusted |

- Assets in scope: {data, credentials, money, PII, model/weights}
- Out of scope (with reason): {...}

## 2. STRIDE findings

| # | Category | Threat | Asset / entry point | Existing control | Gap | Severity (CVSS v3.1) | Mitigation | Owner |
|---|---|---|---|---|---|---|---|---|
| 1 | Spoofing | | | | | | | |
| 2 | Tampering | | | | | | | |
| 3 | Repudiation | | | | | | | |
| 4 | Information disclosure | | | | | | | |
| 5 | Denial of service | | | | | | | |
| 6 | Elevation of privilege | | | | | | | |

## 3. Abuse cases (business-logic, scanner-invisible)

- Race conditions / TOCTOU: {...}
- Mass assignment / over-posting: {...}
- Workflow-state bypass: {...}
- Parameter / price tampering: {...}

## 4. AI-specific surface (if the feature is AI-native)

- Prompt injection (direct + indirect via retrieved content/tool output): {...}
- Tool-call / data exfiltration: {...}
- RAG poisoning & ingestion trust: {...}
- Agent autonomy limits (human-in-the-loop, step caps): {...}

## 5. Disposition

- Blocking findings (Critical/High) → fix spec handed to `@developer`; closure requires `@security-engineer` re-audit.
- Accepted risks → `@product-manager` sign-off with date and rationale.
