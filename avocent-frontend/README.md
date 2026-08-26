# Avocent Frontend

Next.js 16 App Router frontend for the Avocent Health Centre HIMS and telemedicine platform.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- React Hook Form + Zod
- Route Handlers as the browser-facing BFF layer

## Run locally

Run the commands in this section from:

`/Users/brianmunene/Desktop/Avocent Health Centre/avocent-frontend`

1. Copy `.env.example` to `.env.local`.
2. Update the environment values as needed.
3. Make sure the Django API is available at `DJANGO_API_URL`.
4. Install dependencies:

```bash
npm install
```

5. Start the development server:

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## End-to-end tests (frontend + backend together)

`e2e/` holds [Playwright](https://playwright.dev) tests that drive a real browser against a fully running stack — real Next.js, real Django, real Postgres — rather than mocking either side. This is the layer that catches bugs which only show up when the two actually talk to each other (auth cookies, token refresh, proxy redirects); the current suite specifically regression-tests the login/session-refresh bugs fixed in earlier sessions.

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

By default tests target `http://localhost:3000`; point them elsewhere with `E2E_BASE_URL` (e.g. a staging URL or a different port-forward). Tests run **serially** (one worker) by default — a native `runserver`/`next dev` pair is effectively single-threaded, so parallel test sessions queue up behind it and can trip navigation timeouts that look like flakiness but aren't; set `CI=true` once pointed at a properly scaled target (Compose/k8s/gunicorn) to run in parallel instead.

## Build for production

Run the commands in this section from:

`/Users/brianmunene/Desktop/Avocent Health Centre/avocent-frontend`

Create the optimized production build with:

```bash
npm run build
```

Start the production server with:

```bash
npm run start
```

## Docker

### Build the Docker image

Run this command from:

`/Users/brianmunene/Desktop/Avocent Health Centre/avocent-frontend`

```bash
docker build -t avocent-frontend .
```

### Run the Docker container

Run this command from:

`/Users/brianmunene/Desktop/Avocent Health Centre/avocent-frontend`

```bash
docker run --rm -p 3000:3000 --env-file .env.local avocent-frontend
```

### Run with Docker Compose

The backend Docker setup already includes the frontend service.

Run this command from:

`/Users/brianmunene/Desktop/Avocent Health Centre/avocent-backend/docker`

```bash
docker compose -f compose.yml -f compose.local.yml up --build
```

This starts Django on `http://localhost:8000` and the Next.js frontend on `http://localhost:3000`.

## Auth flow

- Browser submits credentials to `POST /api/auth/login`
- Next.js exchanges them for Django JWTs
- Tokens are stored in httpOnly cookies
- Dashboard pages fetch data on the server with those cookies
- Browser-side mutations should go through `src/app/api/*` route handlers
- Self-service password reset: `/forgot-password` requests a reset email, `/reset-password` (with `uid`/`token` query params from that email) sets a new password — both proxy to the unauthenticated Django password-reset endpoints

## Module structure

- `src/app/(auth)` for login, logout, forgot-password, and reset-password
- `src/app/(dashboard)` for authenticated clinic modules
- `src/lib/api` for typed Django fetch wrappers
- `src/lib/rbac.ts` for role checks aligned to the backend
- `src/components` for UI primitives and domain components
