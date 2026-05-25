# Release Notes Template

> **Used by:** @technical-writer → **Feeds into:** stakeholders, users
> **Save to:** `artifacts/output/06-launch/release-notes.md`

Use this template for documenting what's new, changed, or fixed in a release.

---

## Release [Version] — [Feature Name]

**Release Date:** ...
**Release Manager:** @product-manager
**Deployment:** @devops-engineer

---

## Highlights

[2-3 sentences summarizing the most impactful changes for users.]

---

## New Features

### [Feature Title]
**Story IDs:** US-001, US-002

[Description of what's new and why it matters. Keep it user-facing, not technical.]

---

## Improvements

| Change | Impact |
|--------|--------|
| ... | [How does this improve the user experience?] |

---

## Bug Fixes

| Fix | Previous Behavior | New Behavior |
|-----|-------------------|--------------|
| ... | ... | ... |

---

## Breaking Changes

> ⚠️ **If there are no breaking changes, write: "No breaking changes in this release."**

| Change | Migration Required | Action Needed |
|--------|-------------------|---------------|
| ... | Yes/No | [What the user needs to do] |

---

## Known Issues

| Issue | Severity | Workaround | Fix Timeline |
|-------|----------|------------|--------------|
| ... | Medium/Low | ... | Next release |

---

## Deprecations

| Feature | Deprecated In | Removed In | Replacement |
|---------|--------------|------------|-------------|
| ... | ... | ... | ... |

---

## Technical Notes

### API Changes
- [List any API contract changes, new endpoints, removed endpoints]

### Database Changes
- [List any schema changes, migrations required]

### Configuration Changes
- [List any new environment variables, config changes]

### Dependencies
- [List any significant dependency version changes]

---

## Rollback Plan

If issues are discovered post-release:

1. **Trigger:** [What conditions trigger rollback?]
2. **Procedure:** [Step-by-step rollback instructions or reference to runbook]
3. **Data considerations:** [Any data migration rollback steps]
4. **Monitoring:** [What to watch after rollback]

---

## Credits

| Role | Agent |
|------|-------|
| Product | @product-manager |
| Design | @product-designer |
| Architecture | @architect |
| Development | @developer |
| QA | @qa-engineer |
| Security Review | @security-engineer |
| Performance Review | @performance-engineer |
| DevOps | @devops-engineer |

---

**Document info:**
- Version: 1.0
- Author: @technical-writer
- Date: ...
- Depends on: `artifacts/output/02-strategy/requirements.md`, `artifacts/output/02-strategy/user-stories.md`