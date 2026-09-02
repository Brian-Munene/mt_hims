import { NextResponse } from "next/server";
import { z } from "zod";

import { persistAuthSession } from "@/lib/auth";
import { exchangeCredentials } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/http";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  let email: string | undefined;
  try {
    const body = bodySchema.parse(await request.json());
    email = body.email;
    const result = await exchangeCredentials(body.email, body.password);

    if ("two_factor_required" in result) {
      void logger.info("User password verified, awaiting 2FA code", { email });
      return NextResponse.json({ ok: false, two_factor_required: true, challenge_token: result.challenge_token });
    }

    await persistAuthSession(result);

    void logger.info("User signed in", { email });
    return NextResponse.json({ ok: true, user: result.user });
  } catch (error) {
    if (error instanceof ApiError) {
      void logger.warn("Login failed", { email, status: error.status });
      return NextResponse.json({ error: error.message, details: error.payload }, { status: error.status });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid login request.", details: z.treeifyError(error) }, { status: 400 });
    }

    void logger.error("Login unexpected error", { email, message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Unable to sign in." }, { status: 500 });
  }
}
