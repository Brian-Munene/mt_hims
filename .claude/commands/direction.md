---
description: Check whether the current implementation is aligned with the project plan in spec/
---

You are performing a direction check — comparing the current state of the codebase against the project specification to identify alignment, drift, and gaps.

## Step 1 — Verify spec/ exists and has content

Check that `spec/` exists at the repo root and contains at least one `.md` file:

```bash
ls spec/*.md 2>/dev/null
```

If the folder is missing or empty, **stop immediately** and tell the user:

> `spec/` is missing or empty. Run `/init` to regenerate the plan, or create `spec/plan.md` manually before using `/direction`.

Do not proceed past this step if spec is absent.

## Step 2 — Load the spec

Read every `.md` file in `spec/`. This is the authoritative plan. Do not rely on memory or prior context — read the files now.

## Step 3 — Inspect the current implementation

Collect the following signals. Run these in parallel:

1. `git log --oneline -15` — recent work direction
2. `git branch -a` — open feature branches and what they imply
3. List Django apps: `ls avocent-backend/` — compare against spec module list
4. List frontend routes: `ls avocent-frontend/src/app/\(dashboard\)/` — compare against spec modules
5. Check integration stubs: `grep -r "WhatsApp\|FHIR\|LOINC\|ICD.10\|HIE\|SHA\|whereby\|Whereby" avocent-backend --include="*.py" -l 2>/dev/null`
6. Check RBAC roles: `grep -n "ROLE_\|PERMISSION_MATRIX" avocent-backend/users/permissions.py | head -20`
7. Check multi-tenancy state: `grep -rn "Row.Level\|RLS\|multi.tenant" avocent-backend --include="*.py" -l 2>/dev/null`
8. Check Celery broker guard: `grep -n "CELERY_BROKER_CONFIGURED\|REDIS_URL" avocent-backend/avocent_backend/settings.py | head -5`

## Step 4 — Produce the direction report

Write a structured verdict under these headings. Be specific — cite file paths and commit messages where relevant. Do not pad.

---

### Direction Report

**Overall verdict:** one of — `On Track` / `Minor Drift` / `Significant Drift` / `Off Course`

One sentence explaining the verdict.

---

#### Aligned

List spec requirements that the implementation correctly satisfies. Keep this brief — bullet points, no elaboration needed.

#### Gaps (spec requires it, not yet built)

For each gap: what the spec says should exist, what is actually there (if anything), and whether it is a known deferred item or an unaddressed gap. Distinguish between items that are *intentionally deferred* (listed as such in spec) and items that are simply *missing*.

#### Drift (implementation diverges from spec intent)

Things the codebase does that conflict with, contradict, or materially deviate from the spec — not just "not done yet" but "done differently than specified." Flag these clearly.

#### Recommended next action

One concrete next step to close the most important unaddressed gap, based on the spec's roadmap phase order. Skip deferred items.

---

Keep the report factual and tight. If the implementation is clean and on track, say so plainly — do not invent problems.
