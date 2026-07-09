import { NextResponse } from "next/server";
import { z } from "zod";

import { requestPasswordReset } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/http";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  email: z.email(),
});

export async function POST(request: Request) {
  let email: string | undefined;
  try {
    const body = bodySchema.parse(await request.json());
    email = body.email;
    await requestPasswordReset(body.email);

    void logger.info("Password reset requested", { email });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      void logger.warn("Password reset request failed upstream", { email, status: error.status });
      return NextResponse.json({ error: error.message, details: error.payload }, { status: error.status });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email address.", details: z.treeifyError(error) }, { status: 400 });
    }

    void logger.error("Password reset request unexpected error", {
      email,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Unable to process this request." }, { status: 500 });
  }
}
