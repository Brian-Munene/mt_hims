import { expect, type Page } from "@playwright/test";

import { E2E_USER } from "./fixtures";

export async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_USER.email);
  await page.getByLabel("Password").fill(E2E_USER.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Clinic Dashboard" })).toBeVisible();
}

// Matches the UUID primary keys core.CoreModel gives every clinic-scoped
// record (patients, bookings, etc).
export const UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
