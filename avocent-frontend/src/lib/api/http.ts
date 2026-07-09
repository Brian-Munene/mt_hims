import { headers } from "next/headers";

import { getAccessToken } from "@/lib/auth";
import { decryptJson, encryptJson } from "@/lib/encryption";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

interface RequestOptions {
  method?: Method;
  body?: unknown;
  token?: string | null;
  query?: Record<string, string | number | boolean | undefined | null>;
  encrypted?: boolean;
  headers?: HeadersInit;
  next?: NextFetchRequestConfig;
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(path, env.djangoApiUrl);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

async function parseJson(response: Response, aad: string) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    const contentType = response.headers.get("Content-Type");
    const isHtml = contentType?.includes("text/html");
    const preview = text.substring(0, 100);
    throw new Error(
      `Failed to parse response as JSON${isHtml ? " (received HTML)" : ""}. Status: ${response.status}. Preview: ${preview}...`
    );
  }

  if (response.headers.get("X-Encrypted-Payload") === "1") {
    return decryptJson(data, aad === "response" ? "response" : aad);
  }

  return data;
}

export async function djangoRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.token ?? (await getAccessToken());
  const aad = path;
  const requestHeaders = new Headers(options.headers);
  requestHeaders.set("Content-Type", "application/json");
  requestHeaders.set("Accept", "application/json");

  const headerStore = await headers();
  const forwardedHost = headerStore.get("host");
  if (forwardedHost) {
    requestHeaders.set("X-Forwarded-Host", forwardedHost);
  }

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  let body: string | undefined;
  const shouldEncrypt = Boolean(options.encrypted && env.apiEncryptionEnabled && options.body);

  if (options.body !== undefined) {
    const payload = shouldEncrypt ? encryptJson(options.body, aad) : options.body;
    body = JSON.stringify(payload);
  }

  if (shouldEncrypt) {
    requestHeaders.set("X-Encrypted-Payload", "1");
  }

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers: requestHeaders,
    body,
    cache: "no-store",
    next: options.next,
  });

  const data = await parseJson(response, aad);
  if (!response.ok) {
    const message =
      typeof data === "object" && data && "detail" in (data as Record<string, unknown>)
        ? String((data as Record<string, unknown>).detail)
        : `Request failed with status ${response.status}`;

    if (response.status >= 500) {
      void logger.error("Django upstream error", {
        path,
        status: response.status,
        message,
      });
    }

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}
