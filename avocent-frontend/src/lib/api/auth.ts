import { djangoRequest } from "@/lib/api/http";
import type { AuthEnvelope, JwtTokenPair, SessionUser } from "@/lib/types";

export async function exchangeCredentials(email: string, password: string) {
  const tokens = await djangoRequest<JwtTokenPair>("/api/auth/jwt/token/", {
    method: "POST",
    body: { email, password },
    encrypted: true,
  });

  const user = await djangoRequest<SessionUser>("/api/auth/me/", {
    token: tokens.access,
  });

  return {
    ...tokens,
    user,
  } satisfies AuthEnvelope;
}

export async function getCurrentUser() {
  try {
    return await djangoRequest<SessionUser>("/api/auth/me/");
  } catch {
    return null;
  }
}

export async function refreshTokens(refresh: string) {
  return djangoRequest<{ access: string }>("/api/auth/jwt/refresh/", {
    method: "POST",
    body: { refresh },
    encrypted: true,
  });
}

export async function requestPasswordReset(email: string) {
  return djangoRequest<{ detail: string }>("/api/auth/password-reset/", {
    method: "POST",
    body: { email },
    token: null,
  });
}

export async function confirmPasswordReset(uid: string, token: string, newPassword: string) {
  return djangoRequest<{ detail: string }>("/api/auth/password-reset/confirm/", {
    method: "POST",
    body: { uid, token, new_password: newPassword },
    token: null,
  });
}

