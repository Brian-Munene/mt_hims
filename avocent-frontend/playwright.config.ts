import { defineConfig, devices } from "@playwright/test";

// Points at whichever stack is already running — native dev, Docker Compose,
// or a Kubernetes port-forward. Playwright does not start the stack itself:
// this app is Next.js + Django + Postgres + Redis together, not a single
// process a `webServer` block could own. See README.md for how to bring the
// stack up and seed the test user before running these tests.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  // Serial by default: a native `manage.py runserver` + `next dev` pair (the
  // common local target) is effectively single-threaded, so parallel workers
  // queue up behind it and can trip navigation timeouts under no real bug.
  // Override to a real number in CI once pointed at a properly scaled stack
  // (gunicorn/Compose/k8s).
  fullyParallel: !!process.env.CI,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? undefined : 1,
  reporter: "html",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
