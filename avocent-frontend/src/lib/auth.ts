import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/api/auth";
import type { AuthEnvelope, SessionUser } from "@/lib/types";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function persistAuthSession(auth: AuthEnvelope) {
  const cookieStore = await cookies();

  cookieStore.set(env.accessCookieName, auth.access, {
    ...cookieOptions,
    maxAge: 60 * 15,
  });

  cookieStore.set(env.refreshCookieName, auth.refresh, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 7,
  });

  cookieStore.set(env.sessionCookieName, JSON.stringify(auth.user), {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 7,
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

