// Must match core/management/commands/seed_e2e_user.py in avocent-backend —
// run that command against the target stack before this suite.
export const E2E_USER = {
  email: "e2e@avocent.test",
  password: "E2E-test-pass-123!",
};

// Cookie names default to the same values as avocent-frontend/src/lib/env.ts,
// overridable via the same env vars in case a target stack was configured
// with custom names.
export const ACCESS_COOKIE_NAME = process.env.JWT_ACCESS_COOKIE ?? "avocent_access_token";
export const REFRESH_COOKIE_NAME = process.env.JWT_REFRESH_COOKIE ?? "avocent_refresh_token";
