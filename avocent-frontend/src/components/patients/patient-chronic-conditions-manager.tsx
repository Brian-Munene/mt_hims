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
import type { ChronicCondition } from "@/lib/types";

const conditionSchema = z.object({
  clinic: z.string().optional(),
  diagnosis: z.string().trim().min(1, "Diagnosis is required."),
  icd10_code: z.string().optional(),
  diagnosed_date: z.string().optional(),
  metadataText: z.string().optional(),
});

function ConditionForm({ patientId, condition }: { patientId: string; condition?: ChronicCondition }) {
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
            const parsed = conditionSchema.parse({
              clinic: String(formData.get("clinic") ?? "").trim() || undefined,
              diagnosis: String(formData.get("diagnosis") ?? ""),
              icd10_code: String(formData.get("icd10_code") ?? "").trim(),
              diagnosed_date: String(formData.get("diagnosed_date") ?? "").trim() || undefined,
              metadataText: String(formData.get("metadata") ?? "").trim(),
            });

            await browserRequest(
              condition
                ? `/api/proxy/api/patients/chronic-conditions/${condition.id}/`
                : "/api/proxy/api/patients/chronic-conditions/",
              {
                method: condition ? "PATCH" : "POST",
                body: {
                  ...(parsed.clinic ? { clinic: parsed.clinic } : {}),
                  patient: patientId,
                  diagnosis: parsed.diagnosis,
                  icd10_code: parsed.icd10_code || "",
                  ...(parsed.diagnosed_date ? { diagnosed_date: parsed.diagnosed_date } : {}),
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

            setErrors([error instanceof Error ? error.message : "Unable to save chronic condition."]);
          }
        });
      }}
    >
      <ErrorList errors={errors} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">Diagnosis</label>
          <Input name="diagnosis" defaultValue={condition?.diagnosis ?? ""} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">ICD-10 code</label>
          <Input name="icd10_code" defaultValue={condition?.icd10_code ?? ""} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">Diagnosed date</label>
          <Input name="diagnosed_date" type="date" defaultValue={condition?.diagnosed_date ?? ""} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">Clinic override</label>
          <select
            name="clinic"
            defaultValue={condition?.clinic ?? ""}
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
          <Textarea name="metadata" rows={3} defaultValue={condition ? JSON.stringify(condition.metadata, null, 2) : "{}"} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : condition ? "Save condition" : "Add condition"}
        </Button>
      </div>
    </form>
  );
}

export function PatientChronicConditionsManager({
  patientId,
  conditions,
  canWrite = true,
}: {
  patientId: string;
  conditions: ChronicCondition[];
  canWrite?: boolean;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {canWrite && (
        <Card className="border-slate-200/70">
          <CardHeader>
            <CardTitle>Add chronic condition</CardTitle>
          </CardHeader>
          <CardContent>
            <ConditionForm patientId={patientId} />
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {conditions.map((condition) => (
          <Card key={condition.id} className="border-slate-200/70">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-lg">{condition.diagnosis}</CardTitle>
                {canWrite && (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deletingId === condition.id}
                    onClick={async () => {
                      if (!window.confirm("Delete this chronic condition?")) {
                        return;
                      }
                      setDeletingId(condition.id);
                      try {
                        await browserRequest(`/api/proxy/api/patients/chronic-conditions/${condition.id}/`, { method: "DELETE" });
                        router.refresh();
                      } finally {
                        setDeletingId(null);
                      }
                    }}
                  >
                    {deletingId === condition.id ? "Deleting..." : "Delete"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">{condition.icd10_code || "No ICD-10 code recorded."}</p>
              {canWrite ? <ConditionForm patientId={patientId} condition={condition} /> : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
