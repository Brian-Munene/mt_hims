"use client";

import { Button } from "@/components/ui/button";

export default function PatientsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-start justify-center gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-600">Patients</p>
        <h2 className="mt-2 font-heading text-3xl font-semibold text-slate-950">Unable to load patient records</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{error.message}</p>
      </div>
      <Button onClick={reset}>Retry patient query</Button>
    </div>
  );
}
