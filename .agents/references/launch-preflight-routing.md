# Pre-launch item routing

**What this file is for.** A pre-launch list arrived as nineteen undifferentiated tasks. Most of
them are not launch work, and putting them in `/launch` converts *we built it* into *someone
hopefully checked it at the end* — the weakest possible guarantee for a security item.

This routes each item to the phase that owns it, and names the four that have **no owner today**.

## The three classes

| Class | Test | Consequence of skipping |
|---|---|---|
| **Gate** | Pass/fail. Blocks launch. Has an exit code. | Cannot launch |
| **Build task** | Finished upstream. Absence at launch *is* the defect. | Launch is late, or the defect ships |
| **Upstream concern** | Never launch's job. Belongs to an earlier phase. | Wrong phase is doing launch's work |

The distinction decides everything. **A hardcoded secret at launch time is not a red checkbox —
it is an incident.** A launch checklist naming it as an item implies it might be acceptable to
leave until then.

## Routing

| # | Item | Class | Owner | Phase | Home today |
|---|---|---|---|---|---|
| 1 | Find every hardcoded secret | **Gate** | `@security-engineer` | 5 → 6 | `security-scan.js` + `audit-spec.json` exist; **wired in this change** |
| 2 | Check every route for missing auth | Gate | `@security-engineer` | 5 | `security-engineer.md` §API security; blocked by routes-tests |
| 3 | Write tests for the payment flow | Build task | `@qa-engineer` | 5 | `develop/step-07` |
| 4 | Find N+1 queries | Hygiene sweep | `@performance-engineer` | 5 | `performance-engineer.md` |
| 5 | List every unhandled error | Build task | `@developer` | 5 | `develop/step-06` |
| 6 | Make this page mobile friendly | **Upstream** | `@product-designer` | 2 | `design/step-04a` (mobile is now a mandatory accessibility axis) |
| 7 | Add loading + empty states | **Upstream** | `@product-designer` | 2 | `design/step-04a` |
| 8 | Check RLS on every table | Gate | `@security-engineer` | 5 | `security-engineer.md`; DB-specific, needs a Supabase/Postgres rule |
| 9 | Find dead code and remove it | Hygiene sweep | `@code-reviewer` | 5 | **NO OWNER — named in this change** |
| 10 | Add rate limit to the API | Build task | `@security-engineer` | 5 | `security-engineer.md` §API security |
| 11 | Write the privacy policy from the code | Build task | `legal-safety-audit` **skill** | pre-6 | **separate skill — do not duplicate** |
| 12 | Add meta tags + share images | Build task | `@developer` | 5 | **NO OWNER — named in this change** |
| 13 | Generate a sitemap | Build task | `@developer` | 5 | **NO OWNER — named in this change** |
| 14 | Make every form accessible | **Upstream** | `@product-designer` | 2 | `design/step-04a` accessibility states |
| 15 | Set up error tracking | Build task | `@devops-engineer` | 5 | **NO OWNER — named in this change** |
| 16 | Add analytics event to signup | Build task | `@data-analyst` | 5 | `data-analyst.md` telemetry; needs an event contract |
| 17 | Write the onboarding emails | Build task | `@product-manager` | 5 | **NO OWNER — named in this change** |
| 18 | Review the diff like a senior dev | Hygiene sweep | `@code-reviewer` | 5 | `/review` skill |
| 19 | Find slow pages and fix them | Hygiene sweep | `@performance-engineer` | 5 | `performance-engineer.md` |
| 20 | Write a README a new dev can follow | Build task | `@technical-writer` | 5 / 8 | `technical-writer.md`; `develop/step-09` |

## The four that had no owner

Grepped across `.agents/skills/` and `.agents/agents/`. These had no home anywhere in the
engine, which is why they were sitting in an undifferentiated list — an unowned task reaches
nobody, and "nobody" does not report itself.

| Item | Named owner | What "done" means |
|---|---|---|
| Find dead code | `@code-reviewer`, in `develop/step-06` | Unreferenced exports/functions enumerated with evidence, and removed or explicitly kept with a reason |
| Meta tags + share images | `@developer`, in `develop/step-06` | Every public route has `<title>`, description, canonical, OG and Twitter tags; one share image renders at 1200×630 |
| Sitemap | `@developer`, in `develop/step-06` | `sitemap.xml` generated from the route table, and reachable at `/sitemap.xml` |
| Error tracking | `@devops-engineer`, in `launch/step-02` | Errors reach a backend, alerts route somewhere, and the alert path has been exercised once |
| Onboarding emails | `@product-manager`, in `develop/step-09` | Each lifecycle email has a trigger, a template, and an owner; unsubscribes work |

## Why `/launch` does not own these

`/launch` step-01 carries **gates**, not tasks. A gate asks *has this been verified*; a task asks
*has this been done*. Both look like checkboxes, and the difference is the entire value of the
checklist.

The correct place for a security gate is **phase 5, where the code exists and a finding is still
cheap to fix** — and phase 6, where it is a blocker on the evidence rather than on a fresh scan.
Scanning only at launch means the scan happens after the code was written, reviewed, and merged.

## What this file is not

It is not a checklist. Nothing here is ticked at launch. It is a routing table so that when
someone asks *"have we checked every route for auth?"* the answer names a phase and an agent,
rather than shrugging.