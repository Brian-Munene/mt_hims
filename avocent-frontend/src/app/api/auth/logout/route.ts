import { NextResponse } from "next/server";

import { endAuthSession } from "@/lib/auth";

export async function POST() {
  await endAuthSession();
  return NextResponse.json({ ok: true });
}
