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
