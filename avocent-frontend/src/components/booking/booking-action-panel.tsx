"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ErrorList } from "@/components/shared/error-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BrowserApiError, browserRequest, extractApiErrors } from "@/lib/api/browser";

const actions = [
  { path: "arrive", label: "Mark arrived" },
  { path: "check-in", label: "Check in" },
  { path: "start-triage", label: "Start triage" },
  { path: "complete-triage", label: "Complete triage" },
  { path: "start-consultation", label: "Start consultation" },
  { path: "complete-consultation", label: "Complete consultation" },
  { path: "route-to-lab", label: "Route to lab" },
  { path: "start-lab", label: "Start lab" },
  { path: "complete-lab", label: "Complete lab" },
  { path: "route-to-pharmacy", label: "Route to pharmacy" },
  { path: "start-pharmacy", label: "Start pharmacy" },
  { path: "complete-pharmacy", label: "Complete pharmacy" },
  { path: "route-to-billing", label: "Route to billing" },
  { path: "sync-billing", label: "Sync billing" },
  { path: "generate-invoice", label: "Generate invoice" },
  { path: "checkout", label: "Checkout" },
  { path: "cancel", label: "Cancel" },
  { path: "no-show", label: "Mark no-show" },
];

type SelectOption = { value: string; label: string };

export function BookingActionPanel({
  bookingId,
  practitionerOptions,
  userOptions,
}: {
  bookingId: string;
  practitionerOptions: SelectOption[];
  userOptions: SelectOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);

  function runAction(path: string, formData: FormData) {
    setErrors([]);

    const payload = {
      notes: String(formData.get("notes") ?? "").trim(),
      ...(String(formData.get("position") ?? "").trim() ? { position: Number(formData.get("position")) } : {}),
      ...(String(formData.get("assigned_practitioner") ?? "").trim()
        ? { assigned_practitioner: String(formData.get("assigned_practitioner")) }
        : {}),
      ...(String(formData.get("assigned_user") ?? "").trim() ? { assigned_user: String(formData.get("assigned_user")) } : {}),
      ...(path === "generate-invoice" ? { refresh: true } : {}),
    };

    startTransition(async () => {
      try {
        await browserRequest(`/api/proxy/api/booking/bookings/${bookingId}/${path}/`, {
          method: "POST",
          body: payload,
        });
        router.refresh();
      } catch (error) {
        if (error instanceof BrowserApiError) {
          setErrors(extractApiErrors(error));
          return;
        }

        setErrors([error instanceof Error ? error.message : "Unable to update booking workflow."]);
      }
    });
  }

  return (
    <Card className="border-slate-200/70">
      <CardHeader>
        <CardTitle>Workflow actions</CardTitle>
        <CardDescription>
          Use the backend booking actions to move the patient through arrival, triage, consultation, queues, billing, and checkout.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <ErrorList errors={errors} />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-800">Notes</label>
              <Textarea name="notes" rows={3} placeholder="Optional workflow note" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">Queue position</label>
              <Input name="position" type="number" min="1" placeholder="Optional position" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">Assigned practitioner</label>
              <select
                name="assigned_practitioner"
                defaultValue=""
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
              >
                <option value="">Unassigned</option>
                {practitionerOptions.map((practitioner) => (
                  <option key={practitioner.value} value={practitioner.value}>
                    {practitioner.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-800">Assigned user</label>
              <select
                name="assigned_user"
                defaultValue=""
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
              >
                <option value="">Unassigned</option>
                {userOptions.map((staffUser) => (
                  <option key={staffUser.value} value={staffUser.value}>
                    {staffUser.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {actions.map((action) => (
              <Button
                key={action.path}
                type="button"
                variant={action.path === "cancel" || action.path === "no-show" ? "destructive" : "outline"}
                disabled={isPending}
                onClick={(event) => runAction(action.path, new FormData(event.currentTarget.form ?? undefined))}
              >
                {isPending ? "Working..." : action.label}
              </Button>
            ))}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
