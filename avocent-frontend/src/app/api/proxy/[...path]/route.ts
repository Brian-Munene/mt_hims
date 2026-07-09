import { NextResponse } from "next/server";

import { getAccessToken } from "@/lib/auth";
import { ApiError, djangoRequest } from "@/lib/api/http";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
) {
  const { path } = await context.params;
  const token = await getAccessToken();

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const apiPath = `/${path.join("/")}/${url.search || ""}`;
  const contentType = request.headers.get("content-type") ?? "";
  const isMultipart = contentType.startsWith("multipart/form-data");

  // Multipart file uploads must be forwarded as-is — djangoRequest always JSON.stringify's the body.
  if (isMultipart && method !== "GET" && method !== "DELETE") {
    try {
      const djangoUrl = new URL(apiPath, env.djangoApiUrl).toString();
      const upstream = await fetch(djangoUrl, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: request.body,
        // @ts-expect-error — Node fetch duplex option required for streaming body
        duplex: "half",
      });
      const data = await upstream.json().catch(() => null);
      if (!upstream.ok) {
        const message =
          typeof data === "object" && data && "detail" in data ? String(data.detail) : `Request failed with status ${upstream.status}`;
        return NextResponse.json({ error: message, details: data }, { status: upstream.status });
      }
      return NextResponse.json(data, { status: upstream.status });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Proxy multipart request failed.";
      void logger.error("Proxy multipart error", { method, path: apiPath, message });
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const body = method === "GET" || method === "DELETE" ? undefined : await request.json().catch(() => undefined);

  try {
    const data = await djangoRequest(apiPath, {
      method,
      body,
      token,
      encrypted: method !== "GET" && method !== "DELETE",
    });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status >= 500) {
        void logger.error("Proxy upstream error", { method, path: apiPath, status: error.status, message: error.message });
      }
      return NextResponse.json({ error: error.message, details: error.payload }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Proxy request failed.";
    void logger.error("Proxy unexpected error", { method, path: apiPath, message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return handle(request, context, "GET");
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return handle(request, context, "POST");
}

export async function PUT(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return handle(request, context, "PUT");
}

export async function PATCH(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return handle(request, context, "PATCH");
}

export async function DELETE(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return handle(request, context, "DELETE");
}
