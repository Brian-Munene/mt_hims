"use client";

import Link from "next/link";
import { AlertTriangle, ShieldAlert } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Next.js only forwards `message`/`digest` across the Server->Client error boundary, not custom
  // ApiError fields like `status` — so 403s have to be recognized by Django's permission-denied wording.
  if (/permission to perform this action/i.test(error.message)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-amber-50 p-4 text-amber-600">
          <ShieldAlert className="size-7" />
        </div>
        <div className="space-y-2">
          <h2 className="font-heading text-3xl font-semibold text-slate-950">Access denied</h2>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            You don&apos;t have permission to view this page. Contact your clinic administrator if you think this is a mistake.
          </p>
        </div>
        <Link href="/" className={cn(buttonVariants({ variant: "default" }))}>
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full bg-rose-50 p-4 text-rose-600">
        <AlertTriangle className="size-7" />
      </div>
      <div className="space-y-2">
        <h2 className="font-heading text-3xl font-semibold text-slate-950">Dashboard failed to load</h2>
        <p className="max-w-xl text-sm leading-6 text-slate-600">
          {error.message || "The Django API or the BFF layer returned an unexpected response."}
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
