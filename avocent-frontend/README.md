# Avocent Frontend

Next.js 16 App Router frontend for the Avocent Health Centre HIMS and telemedicine platform.

> This is Next.js 16, which has breaking changes from earlier versions. Read the relevant guide in
> `node_modules/next/dist/docs/` before writing Next.js code (see [`AGENTS.md`](AGENTS.md)).

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- React Hook Form + Zod
- Route Handlers as the browser-facing BFF layer

## Run locally

From `avocent-frontend/`:

1. Copy `.env.example` to `.env.local`.
2. Update the environment values as needed.
3. Make sure the Django API is available at `DJANGO_API_URL` (e.g. `http://localhost:8000`).
4. Install dependencies:

```bash
npm install
```

5. Start the development server:

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

Checks: `npx tsc --noEmit` (typecheck), `npx eslint .` (lint), `npm run build` (production build).

## End-to-end tests (frontend + backend together)

`e2e/` holds [Playwright](https://playwright.dev) tests that drive a real browser against a fully running stack — real Next.js, real Django, real Postgres — rather than mocking either side. This is the layer that catches bugs which only show up when the two actually talk to each other:

- `auth.spec.ts` — login, logout, protected-route navigation, and regression tests for the login/session-refresh bugs fixed in earlier sessions (an expired access cookie with a live refresh cookie must not log the user out; a genuinely dead refresh cookie must log out cleanly, not loop).
- `clinical-flow.spec.ts` — a real clinic-desk flow: register a patient, book them in as a walk-in, confirm both records surface through their own list/search pages. Writing this test surfaced and fixed a real backend bug: `PatientSerializer`/`BookingSerializer` required a client-supplied `clinic`, so every create from the current frontend (which never sends one) was failing with 400 — `clinic` is now read-only on both, always derived server-side from the requesting user (see `patients/serializers.py`, `booking/serializers.py`, `core/serializers.py::resolve_effective_clinic`). This test creates and then deletes its own records, so repeat runs don't accumulate data.

Playwright does **not** start the stack for you — bring up whichever environment you're already using, then seed a deterministic test user against it:

```bash
# 1. Start the stack — pick one:
#    Native:  (from avocent-backend) manage.py runserver   +   (from avocent-frontend) npm run dev
#    Compose: (from avocent-backend) docker compose --env-file .env.local -f docker/compose.yml -f docker/compose.local.yml up
#    k8s:     kubectl port-forward -n avocent svc/<release>-web 8000:8000 & kubectl port-forward -n avocent svc/<release>-frontend 3000:3000

# 2. Seed the E2E user (idempotent — safe to re-run). Run inside whichever
#    environment's backend process/container/pod is live, e.g.:
python manage.py seed_e2e_user                                   # native
docker compose ... exec web python manage.py seed_e2e_user        # Compose
kubectl exec -n avocent deploy/<release>-web -- python manage.py seed_e2e_user   # k8s

# 3. Run the tests (from avocent-frontend)
npm run test:e2e            # headless
npm run test:e2e:ui         # interactive UI mode
npm run test:e2e:report     # view the last HTML report
```

Never run `seed_e2e_user` against a real clinic database — it creates a fixed-password Admin account (`e2e@avocent.test`, see `core/management/commands/seed_e2e_user.py`) meant only for disposable test databases.

By default tests target `http://localhost:3000`; point them elsewhere with `E2E_BASE_URL` (e.g. the GKE staging URL `https://app.<ingress-ip>.nip.io`, or a different port-forward). Tests run **serially** (one worker) by default — a native `runserver`/`next dev` pair is effectively single-threaded, so parallel test sessions queue up behind it and can trip navigation timeouts that look like flakiness but aren't; set `CI=true` once pointed at a properly scaled target (Compose/k8s/gunicorn) to run in parallel instead.

## Build for production

From `avocent-frontend/`:

```bash
npm run build   # optimized production build
npm run start   # serve it
```

## Docker

From `avocent-frontend/`:

```bash
docker build -t avocent-frontend .
docker run --rm -p 3000:3000 --env-file .env.local avocent-frontend
```

### Run with Docker Compose

The backend's Docker setup already includes the frontend service. From `avocent-backend/`:

```bash
docker compose --env-file .env.local -f docker/compose.yml -f docker/compose.local.yml up --build
```

This starts Django on `http://localhost:8000` and the Next.js frontend on `http://localhost:3000`.

## Deployment (GKE)

Staging and production run on Google Kubernetes Engine (`africa-south1`) and are deployed with the
Helm chart at [`../deploy/helm/avocent`](../deploy/helm/avocent):

- **Images:** `.github/workflows/build-and-push.yml` builds this image on every push. It's tagged with
  the git SHA and stored in Artifact Registry.
- **Staging** deploys automatically after a successful build on `main`.
- **Production** deploys on a `v*` tag, after a reviewer approves.
- **Public API URL:** the browser-facing API URL is `frontend.publicApiUrl` in
  `values-staging.yaml` / `values-prod.yaml`. It's a `nip.io` hostname until the real domain is
  registered.

The infrastructure runbook is [`../infra/terraform/README.md`](../infra/terraform/README.md). For
the background on the move from Azure, see [`../infra/GCP_MIGRATION.md`](../infra/GCP_MIGRATION.md).

## Auth flow

- The browser submits credentials to `POST /api/auth/login`.
- Next.js exchanges them for Django JWTs.
- **Two-factor authentication:** if the user has TOTP 2FA enabled, login returns a challenge. The
  login form then asks for a 6-digit code, which `POST /api/auth/verify-2fa` exchanges for the
  JWTs. Users turn 2FA on or off on the **Security** page (`/security`).
- Tokens are stored in httpOnly cookies.
- Dashboard pages fetch data on the server using those cookies.
- Browser-side mutations should go through the `src/app/api/*` route handlers.
- **Self-service password reset:** `/forgot-password` requests a reset email, and
  `/reset-password` sets a new password (using the `uid`/`token` query params from that email).
  Both proxy to the unauthenticated Django password-reset endpoints.

## Module structure

- `src/app/(auth)` for login, logout, forgot-password, and reset-password
- `src/app/(dashboard)` for authenticated clinic modules (including `/security` for 2FA settings)
- `src/app/api` for BFF route handlers that proxy to Django
- `src/lib/api` for typed Django fetch wrappers
- `src/lib/rbac.ts` for role checks aligned to the backend
- `src/components` for UI primitives and domain components
