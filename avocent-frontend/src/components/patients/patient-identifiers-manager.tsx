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
import type { PatientIdentifier } from "@/lib/types";

const identifierSchema = z.object({
  clinic: z.string().optional(),
  patient: z.string().min(1),
  identifier_type: z.enum(["national_id", "sha", "passport"]),
  identifier_value: z.string().trim().min(1, "Identifier value is required."),
  metadataText: z.string().optional(),
});

function IdentifierForm({
  patientId,
  identifier,
  onSaved,
}: {
  patientId: string;
  identifier?: PatientIdentifier;
  onSaved?: () => void;
}) {
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
            const parsed = identifierSchema.parse({
              clinic: String(formData.get("clinic") ?? "").trim() || undefined,
              patient: patientId,
              identifier_type: String(formData.get("identifier_type") ?? identifier?.identifier_type ?? "sha"),
              identifier_value: String(formData.get("identifier_value") ?? ""),
              metadataText: String(formData.get("metadata") ?? "").trim(),
            });

            await browserRequest(
              identifier
                ? `/api/proxy/api/patients/identifiers/${identifier.id}/`
                : "/api/proxy/api/patients/identifiers/",
              {
                method: identifier ? "PATCH" : "POST",
                body: {
                  ...(parsed.clinic ? { clinic: parsed.clinic } : {}),
                  patient: parsed.patient,
                  identifier_type: parsed.identifier_type,
                  identifier_value: parsed.identifier_value,
                  metadata: parseJsonMetadata(parsed.metadataText),
                },
              },
            );

            onSaved?.();
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

            setErrors([error instanceof Error ? error.message : "Unable to save identifier."]);
          }
        });
      }}
    >
      <ErrorList errors={errors} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">Identifier type</label>
          <select
            name="identifier_type"
            defaultValue={identifier?.identifier_type ?? "sha"}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
          >
            <option value="sha">SHA</option>
            <option value="passport">Passport</option>
            <option value="national_id">National ID</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">Identifier value</label>
          <Input name="identifier_value" defaultValue={identifier?.identifier_value ?? ""} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-slate-800">Clinic override</label>
          <select
            name="clinic"
            defaultValue={identifier?.clinic ?? ""}
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
          <Textarea name="metadata" rows={3} defaultValue={identifier ? JSON.stringify(identifier.metadata, null, 2) : "{}"} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : identifier ? "Save identifier" : "Add identifier"}
        </Button>
      </div>
    </form>
  );
}

export function PatientIdentifiersManager({
  patientId,
  identifiers,
  canWrite = true,
}: {
  patientId: string;
  identifiers: PatientIdentifier[];
  canWrite?: boolean;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {canWrite && (
        <Card className="border-slate-200/70">
          <CardHeader>
            <CardTitle>Add identifier</CardTitle>
          </CardHeader>
          <CardContent>
            <IdentifierForm patientId={patientId} />
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {identifiers.map((identifier) => (
          <Card key={identifier.id} className="border-slate-200/70">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-lg capitalize">{identifier.identifier_type.replaceAll("_", " ")}</CardTitle>
                {canWrite && (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deletingId === identifier.id}
                    onClick={async () => {
                      if (!window.confirm("Delete this identifier?")) {
                        return;
                      }
                      setDeletingId(identifier.id);
                      try {
                        await browserRequest(`/api/proxy/api/patients/identifiers/${identifier.id}/`, { method: "DELETE" });
                        router.refresh();
                      } finally {
                        setDeletingId(null);
                      }
                    }}
                  >
                    {deletingId === identifier.id ? "Deleting..." : "Delete"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">{identifier.identifier_value}</p>
              {canWrite ? <IdentifierForm patientId={patientId} identifier={identifier} /> : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
