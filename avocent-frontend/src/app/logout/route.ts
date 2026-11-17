import { NextResponse } from "next/server";

import { endAuthSession } from "@/lib/auth";

export async function GET(request: Request) {
  await endAuthSession();
  return NextResponse.redirect(new URL("/login", request.url));
}
