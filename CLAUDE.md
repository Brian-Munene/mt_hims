# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Layout

```
avocent-backend/   Django 5.2 REST API (Python 3.12)
avocent-frontend/  Next.js 16 App Router frontend (TypeScript)
deploy/helm/       Helm chart — application layer on Kubernetes
infra/terraform/   Terraform — Azure cloud infrastructure (AKS, networking, AD)
```

## Backend

```bash
# Setup (from avocent-backend/)
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.local.example .env.local
python manage.py generate_keys --path .env.local
set -a && source .env.local && set +a
python manage.py migrate && python manage.py runserver
# API at http://localhost:8000 · Swagger at /api/docs/swagger/

# Tests
pip install -r requirements-dev.txt
python manage.py test                               # full suite
python manage.py test users.tests.test_serializers  # single module
coverage run manage.py test && coverage report
```

**Stack:** Django 5.2 · PostgreSQL only · Redis + Celery (broker + Beat) · `drf-spectacular` · `simplejwt`

### Key patterns

**`CoreModel`** (`core/models.py`) — abstract base for every domain model: UUID pk, `clinic` FK, `created_at/updated_at/created_by`, `is_active`, `metadata`.

**`ClinicScopedModelViewSet`** (`core/api.py`) — standard ViewSet for all apps. Filters queryset to the user's clinic; forces `clinic=request.user.clinic` on create *and* update (overrides any client-supplied value — never skip this). Sets `created_by` automatically.

**Clinic scoping in serializers** (`core/serializers.py`) — use `resolve_effective_clinic` inside `validate_*` methods and `validate_clinic_match` to reject cross-clinic FK relationships before save. Serializer validation alone is not enough; must be paired with the ViewSet enforcement.

**Celery** — requires `REDIS_URL`; without it tasks are silently skipped. `CELERY_TASK_ALWAYS_EAGER=true` in tests.

**Encryption** — optional AES-256-GCM API payload encryption (`core/middleware.py`, enabled via `API_ENCRYPTION_ENABLED`). Field-level PHI encryption at rest (`core/fields.py`, keyed by `FIELD_ENCRYPTION_KEY`).

## Frontend

> **Read `node_modules/next/dist/docs/` before writing any Next.js code.** This is Next.js 16 with breaking changes from earlier versions.

```bash
# Setup (from avocent-frontend/)
cp .env.example .env.local   # set DJANGO_API_URL=http://localhost:8000
npm install && npm run dev   # http://localhost:3000

# Checks
npx tsc --noEmit   # typecheck
npx eslint .       # lint
npm run build      # production build
```

**Auth flow:** credentials → Next.js Route Handler → Django JWTs stored as httpOnly cookies. Server Components read cookies directly; browser mutations go through `src/app/api/*` route handlers.

**Structure:** `src/app/(auth)/` login/logout/password-reset · `src/app/(dashboard)/` all clinic modules · `src/app/api/` BFF proxy handlers · `src/lib/api/` typed Django fetch wrappers · `src/lib/rbac.ts` role checks.

### E2E tests (Playwright)

Playwright does not start the stack — bring it up first, then:

```bash
# Seed test user once (from avocent-backend, idempotent):
python manage.py seed_e2e_user   # test user: e2e@avocent.test — never run against real clinic DB

# Run (from avocent-frontend):
npm run test:e2e                              # headless, serial
CI=true npm run test:e2e                     # parallel (gunicorn/Compose/k8s only)
E2E_BASE_URL=http://staging:3000 npm run test:e2e
npm run test:e2e:ui                          # interactive
```

- `e2e/auth.spec.ts` — login/logout, protected-route navigation, token-refresh regression (expired access + live refresh must re-issue silently; dead refresh must log out cleanly)
- `e2e/clinical-flow.spec.ts` — register patient → walk-in booking → confirm both appear in list/search; cleans up its own records in `afterEach`

## Deployment

**Docker Compose** (from `avocent-backend/`):
```bash
docker compose --env-file .env.local -f docker/compose.yml -f docker/compose.local.yml up --build
# Replace compose.local.yml with compose.staging.yml or compose.prod.yml for other envs
```
Staging/prod add Caddy (automatic TLS). `ALLOWED_HOSTS` must include `web` (the internal service name).

**Helm** — one release = one clinic stack:
```bash
helm install avocent-local deploy/helm/avocent -n avocent --create-namespace -f deploy/helm/values-local.yaml
```
`beat` is pinned to 1 replica (Recreate). For production: external Postgres (`postgres.internal: false`) + ingress with cert-manager.

**Terraform** (`infra/terraform/`) — provisions AKS, networking, and Azure AD on top of which Helm runs. `bootstrap/` creates the tfstate backend first; `environments/staging|production/` hold the per-env configs.

## Spec & direction check

`spec/plan.md` is the authoritative project plan — synthesized from the HIMS blueprint, the Lead Health Informatics Engineer JD, and the development roadmap. Run `/direction` at any time to check whether the current implementation is on track with that plan.

## Custom agents

`.claude/agents/` has project-aware subagents:
- **`code-reviewer`** — read-only diff review; checks correctness, security, clinic scoping, N+1s
- **`test-runner`** — runs `python manage.py test`, diagnoses failures, iterates to green (Django runner, not pytest)
- **`critical-paths`** — runs the Playwright suite, then walks every critical flow without a spec (encounters, queue, pharmacy, lab, billing, compliance, admin) in Chrome; returns a per-path pass/fail + timing report. Needs the stack running and Claude in Chrome connected
