---
purpose: End-to-end user journey map — trigger, action, response, outcome. Covers happy path, alternate flows, and error recovery.
audience: @product-designer, @developer, @qa-engineer
paired_with: SPEC.md (references capability IDs)
---

# User Journey

The end-to-end experience for the target user.

## Primary persona
{persona name} — {role/context}

## Journey map
1. **Trigger** — {what prompts the user to start}
2. **Action** — {what the user does}
3. **System response** — {what the system does in response}
4. **Outcome** — {what the user achieves}
5. **Next step** — {what happens after}

## Alternate paths
- {alternate flow 1}
- {alternate flow 2}

## Error flows
- {error 1} → {recovery}
- {error 2} → {recovery}

## Filled example (delete or replace with the real journey)

> A retail user checking out with an e-wallet.

1. **Trigger** — user taps "Pay" on the order-review screen (CAP-2)
2. **Action** — selects GoPay, confirms the Rp 150.000 charge
3. **System response** — creates the charge via `POST /api/v1/checkout/pay` with the session `Idempotency-Key`, returns Order #501
4. **Outcome** — user sees the receipt screen with order number and e-ticket
5. **Next step** — receipt links to order tracking; no further action required
