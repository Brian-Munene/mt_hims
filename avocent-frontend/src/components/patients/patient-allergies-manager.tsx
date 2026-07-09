"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { z } from "zod";

import { ErrorList } from "@/components/shared/error-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useClinicOptions } from "@/components/patients/use-clinic-options";
import { BrowserApiError, browserRequest, extractApiErrors } from "@/lib/api/browser";
import { parseJsonMetadata } from "@/lib/utils";
import type { Allergy } from "@/lib/types";

const allergySchema = z.object({
  clinic: z.string().optional(),
  substance: z.string().trim().min(1, "Substance is required."),
  reaction: z.string().optional(),
  severity: z.enum(["mild", "moderate", "severe"]),
  metadataText: z.string().optional(),
});

function AllergyForm({ patientId, allergy }: { patientId: string; allergy?: Allergy }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);
  const clinicOptions = useClinicOptions();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setErrors([]);
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          try {
            const parsed = allergySchema.parse({
              clinic: String(formData.get("clinic") ?? "").trim() || undefined,
              substance: String(formData.get("substance") ?? ""),
              reaction: String(formData.get("reaction") ?? "").trim(),
              severity: String(formData.get("severity") ?? allergy?.severity ?? "mild"),
              metadataText: String(formData.get("metadata") ?? "").trim(),
            });

            await browserRequest(
              allergy
                ? `/api/proxy/api/patients/allergies/${allergy.id}/`
                : "/api/proxy/api/patients/allergies/",
              {
                method: allergy ? "PATCH" : "POST",
                body: {
                  ...(parsed.clinic ? { clinic: parsed.clinic } : {}),
                  patient: patientId,
                  substance: parsed.substance,
                  reaction: parsed.reaction || "",
                  severity: parsed.severity,
                  metadata: parseJsonMetadata(parsed.metadataText),
                },
              },
            );
            router.refresh();
          } catch (error) {
            if (error instanceof z.ZodError) {
              const fieldErrors = z.flattenError(error).fieldErrors;
              setErrors(
                Object.values(fieldErrors).flatMap((messages) =>
                  Array.isArray(messages) ? messages.map((message) => String(message)) : [],
                ),
              );
              return;
            }

            if (error instanceof BrowserApiError) {
              setErrors(extractApiErrors(error));
              return;
            }

            setErrors([error instanceof Error ? error.message : "Unable to save allergy."]);
          }
        });
      }}
    >
      <ErrorList errors={errors} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">Substance</label>
          <Input name="substance" defaultValue={allergy?.substance ?? ""} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">Severity</label>
          <select
            name="severity"
            defaultValue={allergy?.severity ?? "mild"}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
          >
            <option value="mild">Mild</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-slate-800">Reaction</label>
          <Textarea name="reaction" rows={3} defaultValue={allergy?.reaction ?? ""} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-slate-800">Clinic override</label>
          <select
            name="clinic"
            defaultValue={allergy?.clinic ?? ""}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
          >
            <option value="">Use current clinic</option>
            {clinicOptions.map((clinic) => (
              <option key={clinic.value} value={clinic.value}>
                {clinic.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-slate-800">Metadata JSON</label>
          <Textarea name="metadata" rows={3} defaultValue={allergy ? JSON.stringify(allergy.metadata, null, 2) : "{}"} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : allergy ? "Save allergy" : "Add allergy"}
        </Button>
      </div>
    </form>
  );
}

export function PatientAllergiesManager({
  patientId,
  allergies,
  canWrite = true,
}: {
  patientId: string;
  allergies: Allergy[];
  canWrite?: boolean;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {canWrite && (
        <Card className="border-slate-200/70">
          <CardHeader>
            <CardTitle>Add allergy</CardTitle>
          </CardHeader>
          <CardContent>
            <AllergyForm patientId={patientId} />
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {allergies.map((allergy) => (
          <Card key={allergy.id} className="border-slate-200/70">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-lg">{allergy.substance}</CardTitle>
                {canWrite && (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deletingId === allergy.id}
                    onClick={async () => {
                      if (!window.confirm("Delete this allergy record?")) {
                        return;
                      }
                      setDeletingId(allergy.id);
                      try {
                        await browserRequest(`/api/proxy/api/patients/allergies/${allergy.id}/`, { method: "DELETE" });
                        router.refresh();
                      } finally {
                        setDeletingId(null);
                      }
                    }}
                  >
                    {deletingId === allergy.id ? "Deleting..." : "Delete"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">{allergy.reaction || "No reaction recorded."}</p>
              {canWrite ? <AllergyForm patientId={patientId} allergy={allergy} /> : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
