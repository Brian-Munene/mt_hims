import { NextResponse } from "next/server";
import { z } from "zod";

import { persistAuthSession } from "@/lib/auth";
import { verifyTwoFactorLogin } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/http";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  challenge_token: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app."),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const auth = await verifyTwoFactorLogin(body.challenge_token, body.code);
    await persistAuthSession(auth);

    void logger.info("User completed 2FA login", { email: auth.user.email });
    return NextResponse.json({ ok: true, user: auth.user });
  } catch (error) {
    if (error instanceof ApiError) {
      void logger.warn("2FA verification failed", { status: error.status });
      return NextResponse.json({ error: error.message, details: error.payload }, { status: error.status });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid 2FA verification request.", details: z.treeifyError(error) }, { status: 400 });
    }

    void logger.error("2FA verification unexpected error", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Unable to verify your code." }, { status: 500 });
  }
}
