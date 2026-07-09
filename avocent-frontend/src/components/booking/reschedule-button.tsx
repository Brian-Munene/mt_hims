"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ErrorList } from "@/components/shared/error-list";
import { Button } from "@/components/ui/button";

export function RescheduleButton({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="h-7 text-xs">
        Reschedule
      </Button>
    );
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setErrors([]);
        const formData = new FormData(e.currentTarget);
        const raw = String(formData.get("scheduled_time") ?? "");
        if (!raw) {
          setErrors(["Please select a new date and time."]);
          return;
        }
        startTransition(async () => {
          try {
            const response = await fetch(`/api/proxy/api/encounters/appointments/${appointmentId}/reschedule/`, {
              method: "PATCH",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ scheduled_time: new Date(raw).toISOString() }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
              const msg = (payload as { error?: string; scheduled_time?: string[] } | null);
              setErrors([msg?.error ?? msg?.scheduled_time?.[0] ?? `Reschedule failed (${response.status})`]);
              return;
            }
            setOpen(false);
            router.refresh();
          } catch {
            setErrors(["Network error — could not reschedule."]);
          }
        });
      }}
    >
      <ErrorList errors={errors} />
      <div className="flex items-center gap-2">
        <input
          name="scheduled_time"
          type="datetime-local"
          required
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
        />
        <Button type="submit" size="sm" disabled={isPending} className="h-8 text-xs">
          {isPending ? "Saving..." : "Confirm"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} className="h-8 text-xs">
          Cancel
        </Button>
      </div>
    </form>
  );
}
