import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { env } from "@/lib/env";
import { ACCESS_TOKEN_MAX_AGE, AUTH_COOKIE_OPTIONS, REFRESH_TOKEN_MAX_AGE } from "@/lib/cookies";
import { getCurrentUser } from "@/lib/api/auth";
import type { AuthEnvelope, SessionUser } from "@/lib/types";

export async function persistAuthSession(auth: AuthEnvelope) {
  const cookieStore = await cookies();

  cookieStore.set(env.accessCookieName, auth.access, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  cookieStore.set(env.refreshCookieName, auth.refresh, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  cookieStore.set(env.sessionCookieName, JSON.stringify(auth.user), {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

export async function clearAuthSession() {
  const cookieStore = await cookies();
  cookieStore.delete(env.accessCookieName);
  cookieStore.delete(env.refreshCookieName);
  cookieStore.delete(env.sessionCookieName);
}

export async function getAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get(env.accessCookieName)?.value ?? null;
}

export async function getSessionCookie() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(env.sessionCookieName)?.value;

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function maybeUser() {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

