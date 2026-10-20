---
description: Check whether the current implementation is aligned with the project plan in spec/
---

Perform a direction check against `spec/plan.md`. Always operate from the repo root.

```bash
ROOT=$(git rev-parse --show-toplevel)
```

**Guard:** If `$ROOT/spec/` is missing or has no `.md` files, stop and say:
> `spec/` is missing or empty — create `spec/plan.md` before running `/direction`.

---

## Inspect the codebase

Run all of these from `$ROOT` in parallel:

```bash
# 1. Recent commits and open branches
git log --oneline -10
git branch -a

# 2. Backend — apps present
ls $ROOT/avocent-backend/

# 3. Frontend — dashboard routes present
ls "$ROOT/avocent-frontend/src/app/(dashboard)/"

# 4. Integrations — what's stubbed vs missing
grep -rl "WhatsApp\|FHIR\|LOINC\|ICD.10\|HIE\|whereby" $ROOT/avocent-backend --include="*.py" 2>/dev/null

# 5. RBAC — roles and permission matrix
grep -n "ROLE_\|PERMISSION_MATRIX" $ROOT/avocent-backend/users/permissions.py | head -20

# 6. Multi-tenancy / RLS state
grep -rl "Row.Level\|RLS\|multi.tenant" $ROOT/avocent-backend --include="*.py" 2>/dev/null
```

Read `$ROOT/spec/plan.md` — this is the authoritative plan. Do not rely on memory.

---

## Report

Output exactly these four sections. Be specific; cite paths where relevant. Do not pad.

**Verdict:** `On Track` / `Minor Drift` / `Significant Drift` / `Off Course` — one sentence.

**Aligned** — bullet list of spec requirements the implementation satisfies.

**Gaps** — what the spec requires but isn't built yet. Mark each as *deferred* (intentionally parked per spec) or *missing* (unaddressed).

**Drift** — anything implemented in a way that conflicts with or materially deviates from spec intent.

**Next action** — one concrete step to close the most important non-deferred gap, ordered by spec roadmap phase.
