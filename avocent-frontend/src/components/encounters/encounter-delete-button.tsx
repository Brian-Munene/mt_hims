"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { BrowserApiError, browserRequest, flattenValidationErrors } from "@/lib/api/browser";

export function EncounterDeleteButton({ encounterId }: { encounterId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        variant="destructive"
        disabled={isPending}
        onClick={() => {
          if (!window.confirm("Delete this encounter? This action cannot be undone.")) {
            return;
          }
          setError(null);
          startTransition(async () => {
            try {
              await browserRequest(`/api/proxy/api/encounters/encounters/${encounterId}/`, {
                method: "DELETE",
              });
              router.push("/encounters");
              router.refresh();
            } catch (cause) {
              if (cause instanceof BrowserApiError) {
                setError(flattenValidationErrors(cause.details)[0] ?? cause.message);
                return;
              }
              setError(cause instanceof Error ? cause.message : "Unable to delete encounter.");
            }
          });
        }}
      >
        {isPending ? "Deleting..." : "Delete encounter"}
      </Button>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
