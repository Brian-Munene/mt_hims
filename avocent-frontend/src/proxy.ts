import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { ACCESS_TOKEN_MAX_AGE, AUTH_COOKIE_OPTIONS, REFRESH_TOKEN_MAX_AGE } from "@/lib/cookies";

const protectedPrefixes = [
  "/booking",
  "/patients",
  "/encounters",
  "/clinical",
  "/billing",
  "/pharmacy",
  "/laboratory",
  "/telemedicine",
  "/admin",
];

// Client components fetch this path with the browser's own cookies; it needs
// a live access token even though it isn't a page route and returns 401 JSON
// (not a redirect) when unauthenticated.
const API_PROXY_PREFIX = "/api/proxy";

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

interface RefreshedTokens {
  access: string;
  refresh?: string;
}

async function refreshAccessToken(refresh: string): Promise<RefreshedTokens | null> {
  try {
    const response = await fetch(new URL("/api/auth/jwt/refresh/", env.djangoApiUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!response.ok) {
      console.warn(`[proxy] token refresh rejected: HTTP ${response.status}`);
      return null;
    }
    const data = (await response.json()) as { access?: string; refresh?: string };
    // ROTATE_REFRESH_TOKENS is on server-side, so a new refresh token may
    // accompany the new access token.
    return data.access ? { access: data.access, refresh: data.refresh } : null;
  } catch (error) {
    console.warn(`[proxy] token refresh failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let hasSession = Boolean(request.cookies.get(env.accessCookieName)?.value);
  const refreshCookie = request.cookies.get(env.refreshCookieName)?.value;

  const requiresAuth = pathname === "/" || matchesPrefix(pathname, protectedPrefixes);
  // Only routes that actually consume the access token attempt a refresh —
  // public pages (login, forgot/reset-password) and static assets skip it
  // entirely, so a stale refresh cookie doesn't cost a Django round trip (and
  // a token-rotation write) on every request that never needed one.
  const needsFreshToken = requiresAuth || matchesPrefix(pathname, [API_PROXY_PREFIX]);

  // The access cookie outlives itself in Django terms (15 min cookie vs 30 min
  // token), so an expired/missing access cookie with a live refresh cookie is
  // the normal mid-session state on routes that need a token — mint a new
  // access token instead of logging the user out.
  let refreshed: RefreshedTokens | null = null;
  let refreshFailed = false;
  if (needsFreshToken && !hasSession && refreshCookie) {
    refreshed = await refreshAccessToken(refreshCookie);
    if (refreshed) {
      hasSession = true;
      request.cookies.set(env.accessCookieName, refreshed.access);
    } else {
      refreshFailed = true;
    }
  }

  let response: NextResponse;
  if (requiresAuth && !hasSession) {
    console.warn(
      `[proxy] -> /login: path=${pathname} accessCookie=${request.cookies.has(env.accessCookieName)} ` +
        `refreshCookie=${Boolean(refreshCookie)} refreshOutcome=${refreshCookie ? (refreshed ? "ok" : "failed") : "none"} ` +
        `cookieNames=[${request.cookies.getAll().map((c) => c.name).join(",")}]`,
    );
    response = NextResponse.redirect(new URL("/login", request.url));
  } else if (pathname === "/login" && hasSession) {
    response = NextResponse.redirect(new URL("/", request.url));
  } else {
    response = NextResponse.next({ request });
  }

  if (refreshFailed) {
    // The refresh token is dead: clear both cookies wherever we tried to use
    // it (page loads and /api/proxy fetches alike), not just on the redirect
    // branch — otherwise a background poll (e.g. the notification bell) keeps
    // retrying a doomed refresh on every request until the cookie expires.
    response.cookies.delete(env.accessCookieName);
    response.cookies.delete(env.refreshCookieName);
  }

  if (refreshed) {
    response.cookies.set(env.accessCookieName, refreshed.access, {
      ...AUTH_COOKIE_OPTIONS,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });
    if (refreshed.refresh) {
      response.cookies.set(env.refreshCookieName, refreshed.refresh, {
        ...AUTH_COOKIE_OPTIONS,
        maxAge: REFRESH_TOKEN_MAX_AGE,
      });
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
