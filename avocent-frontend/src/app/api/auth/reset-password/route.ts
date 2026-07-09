import { NextResponse } from "next/server";
import { z } from "zod";

import { confirmPasswordReset } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/http";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  uid: z.string().min(1),
  token: z.string().min(1),
  newPassword: z.string().min(8, "Use at least 8 characters."),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    await confirmPasswordReset(body.uid, body.token, body.newPassword);

    void logger.info("Password reset completed");
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      void logger.warn("Password reset confirmation failed upstream", { status: error.status });
      return NextResponse.json({ error: error.message, details: error.payload }, { status: error.status });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid reset request.", details: z.treeifyError(error) }, { status: 400 });
    }

    void logger.error("Password reset confirmation unexpected error", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Unable to reset your password." }, { status: 500 });
  }
}
