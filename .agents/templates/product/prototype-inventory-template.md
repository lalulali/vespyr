---
prototype: "<repo-relative path or source pointer (Figma URL, live code)>"
prototype_type: file
prototype_track: "static-html | nextjs-component"
prototype_runtime: "<runtime>"
prototype_validation: "<track gate command and result>"
generated: "<YYYY-MM-DD>"
generator: "@product-designer"
---

# Prototype Inventory — {feature}

Extraction-only record of what the prototype does. No requirements language, no interpretation. Every row carries a `path#id` anchor (frozen A11 grammar: repo-relative POSIX path + one `#` + anchor token; HTML/SVG anchors are `id="<id>"` attributes, other files use a word-boundary symbol occurrence; non-file prototypes anchor to `prototype-inventory.md#INV-NN` rows).

## Rows

| ID | Kind | Name | Anchor (`path#id`) | Intent | Observable fact |
|---|---|---|---|---|---|
| INV-01 | screen | {screen name} | `{path}#{anchor}` | deliberate / accident / unknown | {what is observable — states, fields, copy, behaviors} |
| INV-02 | flow | {flow name} | `{path}#{anchor}` | unknown | {step-by-step what happens} |
| INV-03 | behavior | {behavior name} | `{path}#{anchor}` | unknown | {validation rule, permission, edge case — as observed} |
| INV-04 | state | {state name} | `{path}#{anchor}` | unknown | {empty / loading / error / populated — what shows} |
| INV-05 | interaction | {interaction name} | `{path}#{anchor}` | unknown | {focus, keyboard, micro-feedback as observed} |

### Intent — is this a decision or an accident?

**`unknown` is the honest default.** A prototype shows what happens; it cannot show whether
anybody chose it. Set the column and leave it at `unknown` unless something outside the
prototype tells you otherwise.

| Value | Set it when | Requires |
|---|---|---|
| `deliberate` | an owner statement, decision record, or `Type: owner` ledger row says so | **an anchor** — name who decided and where |
| `accident` | it contradicts another observed behaviour, or a named complaint/ticket describes it | **the evidence** — a support complaint, a contradictory row |
| `unknown` | default — nobody has said | nothing |

**Never infer `deliberate` from polish.** A polished detail is a detail somebody shipped, not a
detail somebody chose. Marking an accident `deliberate` is how a broken behaviour gets frozen
into a spec, which is the most expensive mistake this inventory can make.

A brief that asks "what is a deliberate decision rather than an accident" is asking this
question. Without the column, the answer has no home and the distinction is lost between
`prototype` rows and `owner` rows that were never designed to carry it.

**Kinds:** `screen` · `flow` · `behavior` · `state` · `interaction` — `behavior` carries observable rules and properties (validation, permissions, data shapes, telemetry, performance, accessibility, platform facts, copy). One kind per row; a row that needs two kinds is two rows.

## Coverage self-check (10 detail classes)

| Detail class | Rows covering it |
|---|---|
| Screen states (empty/loading/error) | {INV-NN, ...} |
| Edge cases & validation | {INV-NN, ...} |
| Data fields & types | {INV-NN, ...} |
| Permissions & auth | {INV-NN, ...} |
| Navigation & flows | {INV-NN, ...} |
| Copy & tone | {INV-NN, ...} |
| Telemetry | {INV-NN, ...} |
| Performance notes | {INV-NN, ...} |
| Accessibility | {INV-NN, ...} |
| Platform constraints | {INV-NN, ...} |

## Unobserved questions (not inventory rows)
- {suspected behavior that could not be observed — routed to the session summary, answered by the owner or the prototype}
