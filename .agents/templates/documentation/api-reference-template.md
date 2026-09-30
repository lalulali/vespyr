# API Reference — {Service Name}

> **Diátaxis mode:** reference — facts only, no tutorials or narrative.
> **Owner:** `@technical-writer` (Clara). **Consumed by:** `@developer`, `@devops-engineer`, integrators.

## {METHOD} {/path}

**Auth:** {none | bearer | API key — where it is sent}
**Rate limit:** {requests/window or link to the limit policy}

### Path & query parameters

| Name | Type | Required | Description |
|---|---|---|---|
| | | | |

### Request body

| Field | Type | Required | Description |
|---|---|---|---|
| | | | |

```json
{ "example": "request" }
```

### Responses

| Status | Meaning | Body shape |
|---|---|---|
| 200 | Success | |
| 4xx | {validation/auth error} | |
| 5xx | {server error} | |

```json
{ "example": "response" }
```

### Errors

| Code | When it fires | Client action |
|---|---|---|
| | | |

### Example

```bash
curl -X {METHOD} {base_url}{/path} -H "Authorization: Bearer $TOKEN" -d '{...}'
```

---

> Repeat the block per endpoint. Keep examples runnable; keep prose out — that belongs in the how-to guide.
