import { test, expect } from "@playwright/test";

import { ACCESS_COOKIE_NAME, E2E_USER, REFRESH_COOKIE_NAME } from "./fixtures";
import { login } from "./helpers";

test.describe("authentication", () => {
  test("logs in and reaches the dashboard", async ({ page }) => {
    await login(page);
  });

  test("rejects an invalid password", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_USER.email);
    await page.getByLabel("Password").fill("definitely-wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/login\/?$/);
    // Message comes from simplejwt's TokenObtainPairView by default.
    await expect(page.getByText(/no active account found/i)).toBeVisible();
  });

  test("navigating between protected pages does not bounce back to login", async ({ page }) => {
    await login(page);

    // This is the exact class of bug this suite exists to catch: earlier
    // proxy.ts revisions redirected authenticated users back to /login on
    // ordinary navigation. Visit several protected routes in one session.
    for (const path of ["/patients/", "/booking/", "/admin/view/users/"]) {
      await page.goto(path);
      await expect(page).toHaveURL(path);
      await expect(page).not.toHaveURL(/\/login/);
    }
  });

  test("logout clears the session and protected pages redirect to login", async ({ page }) => {
    await login(page);

    await page.goto("/logout");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/patients/");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("mid-session token refresh", () => {
  test("an expired access cookie with a live refresh cookie does not log the user out", async ({ page, context }) => {
    await login(page);

    const cookiesBefore = await context.cookies();
    const refreshCookie = cookiesBefore.find((cookie) => cookie.name === REFRESH_COOKIE_NAME);
    expect(refreshCookie, `expected a ${REFRESH_COOKIE_NAME} cookie after login`).toBeTruthy();

    // Simulate the access token expiring (it has a 15-minute lifetime) while
    // the 7-day refresh token is still valid — this was the exact state that
    // used to log users out on every navigation until proxy.ts started
    // transparently refreshing instead of redirecting.
    await context.clearCookies({ name: ACCESS_COOKIE_NAME });

    await page.goto("/patients/");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Patient registry" })).toBeVisible();

    const cookiesAfter = await context.cookies();
    const reissuedAccessCookie = cookiesAfter.find((cookie) => cookie.name === ACCESS_COOKIE_NAME);
    expect(reissuedAccessCookie, "proxy should have silently reissued the access cookie").toBeTruthy();
  });

  test("a dead refresh cookie logs the user out cleanly instead of looping", async ({ page, context }) => {
    await login(page);

    await context.clearCookies({ name: ACCESS_COOKIE_NAME });
    await context.addCookies([
      {
        name: REFRESH_COOKIE_NAME,
        value: "not-a-real-refresh-token",
        url: page.url(),
      },
    ]);

    await page.goto("/patients/");
    await expect(page).toHaveURL(/\/login/);

    const cookiesAfter = await context.cookies();
    expect(cookiesAfter.some((cookie) => cookie.name === ACCESS_COOKIE_NAME)).toBe(false);
    expect(cookiesAfter.some((cookie) => cookie.name === REFRESH_COOKIE_NAME)).toBe(false);
  });
});
