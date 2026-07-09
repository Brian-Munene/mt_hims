const required = (value: string | undefined, fallback: string) => value ?? fallback;

export const env = {
  appName: required(process.env.NEXT_PUBLIC_APP_NAME, "Avocent Health Centre"),
  djangoApiUrl: required(process.env.DJANGO_API_URL, "http://127.0.0.1:8000"),
  browserDjangoBaseUrl: required(process.env.NEXT_PUBLIC_DJANGO_BASE_URL, "http://127.0.0.1:8000"),
  accessCookieName: required(process.env.JWT_ACCESS_COOKIE, "avocent_access_token"),
  refreshCookieName: required(process.env.JWT_REFRESH_COOKIE, "avocent_refresh_token"),
  sessionCookieName: required(process.env.SESSION_COOKIE, "avocent_session"),
  apiEncryptionEnabled: process.env.API_ENCRYPTION_ENABLED === "true",
  apiEncryptionKey: process.env.API_ENCRYPTION_KEY ?? "",
};

