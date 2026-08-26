import { env } from "@/lib/env";

// Shared by lib/auth.ts (Server Actions/Route Handlers, via next/headers) and
// proxy.ts (Edge middleware, via NextRequest/NextResponse) so the two cookie
// writers can't silently diverge on flags like `secure` or `sameSite`.
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.secureCookies,
  path: "/",
};

export const ACCESS_TOKEN_MAX_AGE = 60 * 15; // 15 minutes — matches SIMPLE_JWT ACCESS_TOKEN_LIFETIME
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days — matches SIMPLE_JWT REFRESH_TOKEN_LIFETIME
