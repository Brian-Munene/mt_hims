export class BrowserApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "BrowserApiError";
    this.status = status;
    this.details = details;
  }
}

interface BrowserRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

export async function browserRequest<T>(path: string, options: BrowserRequestOptions = {}) {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; details?: unknown }
    | T
    | null;

  if (!response.ok) {
    throw new BrowserApiError(
      (payload as { error?: string } | null)?.error ?? `Request failed with status ${response.status}`,
      response.status,
      (payload as { details?: unknown } | null)?.details,
    );
  }

  return payload as T;
}

export function flattenValidationErrors(details: unknown) {
  if (!details || typeof details !== "object") {
    return [];
  }

  return Object.entries(details as Record<string, unknown>).flatMap(([field, value]) => {
    if (Array.isArray(value)) {
      return value.map((message) => `${field}: ${String(message)}`);
    }

    if (typeof value === "string") {
      return [`${field}: ${value}`];
    }

    if (value && typeof value === "object" && "errors" in value) {
      const messages = (value as { errors?: string[] }).errors ?? [];
      return messages.map((message) => `${field}: ${message}`);
    }

    return [`${field}: ${JSON.stringify(value)}`];
  });
}

export function extractApiErrors(error: BrowserApiError): string[] {
  const errors = flattenValidationErrors(error.details);
  return errors.length ? errors : [error.message];
}
