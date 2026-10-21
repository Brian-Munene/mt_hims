import { test, expect } from "@playwright/test";

import { login, UUID_PATTERN } from "./helpers";

// A real clinic-desk flow: register a patient, book them in, and confirm
// both records surface through their own list/search pages — the same
// create-then-read path a receptionist actually uses, exercised against the
// real API and database rather than mocked.
test.describe("register a patient and book them in", () => {
  let createdPatientId: string | null = null;
  let createdBookingId: string | null = null;

  test.afterEach(async ({ page }) => {
    // Best-effort cleanup so repeat runs don't pile up disposable records in
    // whatever database this suite is pointed at.
    if (createdBookingId) {
      await page.request.delete(`/api/proxy/api/booking/bookings/${createdBookingId}/`).catch(() => {});
      createdBookingId = null;
    }
    if (createdPatientId) {
      await page.request.delete(`/api/proxy/api/patients/patients/${createdPatientId}/`).catch(() => {});
      createdPatientId = null;
    }
  });

  test("end to end: patient registration -> booking creation -> both appear in their lists", async ({ page }) => {
    await login(page);

    const suffix = Date.now().toString(36);
    const firstName = "E2E";
    const lastName = `Patient${suffix}`;
    const fullName = `${firstName} ${lastName}`;
    const reasonForVisit = `E2E walk-in consultation ${suffix}`;

    // --- Register the patient ---
    await page.goto("/patients/new");
    await page.getByLabel("First name").fill(firstName);
    await page.getByLabel("Last name").fill(lastName);
    await page.getByLabel("Phone", { exact: true }).fill("+254700111222");
    await page.getByRole("button", { name: /create patient/i }).click();

    await expect(page).toHaveURL(new RegExp(`/patients/${UUID_PATTERN}/?$`));
    createdPatientId = page.url().match(new RegExp(UUID_PATTERN))?.[0] ?? null;
    expect(createdPatientId, "expected a patient id in the redirect URL").toBeTruthy();
    await expect(page.getByRole("heading", { name: fullName })).toBeVisible();

    // --- Confirm the patient surfaces in the registry's own search (a
    // different read path than the create-redirect we just followed) ---
    await page.goto("/patients/");
    await page.getByLabel("Search").fill(lastName);
    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page.getByRole("link", { name: fullName })).toBeVisible();

    // --- Book that patient in as a walk-in ---
    await page.goto("/booking/new");
    await page.locator('select[name="patient"]').selectOption({ label: fullName });
    await page.locator('textarea[name="reason_for_visit"]').fill(reasonForVisit);
    await page.getByRole("button", { name: /create booking/i }).click();

    await expect(page).toHaveURL(new RegExp(`/booking/${UUID_PATTERN}/?$`));
    createdBookingId = page.url().match(new RegExp(UUID_PATTERN))?.[0] ?? null;
    expect(createdBookingId, "expected a booking id in the redirect URL").toBeTruthy();
    await expect(page.getByText("Booking detail")).toBeVisible();

    // --- Confirm the booking surfaces in the bookings list search ---
    await page.goto("/booking/");
    await page.getByPlaceholder(/booking number, patient name, or visit reason/i).fill(reasonForVisit);
    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page.getByText(reasonForVisit)).toBeVisible();
  });
});
