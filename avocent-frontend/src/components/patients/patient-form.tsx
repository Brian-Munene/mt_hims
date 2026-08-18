"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { z } from "zod";

import { ErrorList } from "@/components/shared/error-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BrowserApiError, browserRequest, extractApiErrors } from "@/lib/api/browser";
import { parseJsonMetadata } from "@/lib/utils";
import type { Patient } from "@/lib/types";

const patientSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required."),
  last_name: z.string().trim().min(1, "Last name is required."),
  date_of_birth: z.string().optional(),
  gender: z.enum(["male", "female", "other", "unknown"]),
  phone: z.string().optional(),
  email: z.union([z.literal(""), z.email()]).optional(),
  national_id: z.string().optional(),
  sha_number: z.string().optional(),
  address: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  metadataText: z.string().optional(),
});

function normalizeDateOfBirth(value?: string) {
  if (!value) {
    return undefined;
  }

  const today = new Date();
  const parsed = new Date(value);
  if (parsed > today) {
    throw new Error("date_of_birth: Date of birth cannot be in the future.");
  }

  return value;
}

export function PatientForm({
  patient,
  mode,
}: {
  patient?: Patient;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);

  const title = useMemo(
    () => (mode === "create" ? "Register patient" : "Update patient"),
    [mode],
  );

  function handleSubmit(formData: FormData) {
    setErrors([]);

    startTransition(async () => {
      try {
        const parsed = patientSchema.parse({
          first_name: String(formData.get("first_name") ?? ""),
          last_name: String(formData.get("last_name") ?? ""),
          date_of_birth: String(formData.get("date_of_birth") ?? "").trim() || undefined,
          gender: String(formData.get("gender") ?? patient?.gender ?? "unknown"),
          phone: String(formData.get("phone") ?? "").trim(),
          email: String(formData.get("email") ?? "").trim(),
          national_id: String(formData.get("national_id") ?? "").trim(),
          sha_number: String(formData.get("sha_number") ?? "").trim(),
          address: String(formData.get("address") ?? "").trim(),
          emergency_contact_name: String(formData.get("emergency_contact_name") ?? "").trim(),
          emergency_contact_phone: String(formData.get("emergency_contact_phone") ?? "").trim(),
          metadataText: String(formData.get("metadata") ?? "").trim(),
        });

        // clinic is intentionally omitted: the backend fills in the
        // registering user's clinic on create.
        const payload = {
          first_name: parsed.first_name,
          last_name: parsed.last_name,
          ...(normalizeDateOfBirth(parsed.date_of_birth) ? { date_of_birth: parsed.date_of_birth } : {}),
          gender: parsed.gender,
          phone: parsed.phone || "",
          email: parsed.email || "",
          national_id: parsed.national_id || "",
          sha_number: parsed.sha_number || "",
          address: parsed.address || "",
          emergency_contact_name: parsed.emergency_contact_name || "",
          emergency_contact_phone: parsed.emergency_contact_phone || "",
          metadata: parseJsonMetadata(parsed.metadataText),
        };

        const response = await browserRequest<Patient>(
          mode === "create"
            ? "/api/proxy/api/patients/patients/"
            : `/api/proxy/api/patients/patients/${patient?.id}/`,
          {
            method: mode === "create" ? "POST" : "PATCH",
            body: payload,
          },
        );

        if (mode === "create") {
          router.push(`/patients/${response.id}`);
        } else {
          router.refresh();
        }
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

        if (error instanceof Error) {
          setErrors([error.message]);
          return;
        }

        setErrors(["Unable to save patient record."]);
      }
    });
  }

  return (
    <Card className="border-slate-200/70">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {mode === "create"
            ? "Capture patient demographics, identifiers, and emergency contact details."
            : "Patch patient details without leaving the master patient record."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit(new FormData(event.currentTarget));
          }}
        >
          <ErrorList errors={errors} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor={`${mode}-first-name`}>
                First name
              </label>
              <Input id={`${mode}-first-name`} name="first_name" defaultValue={patient?.first_name ?? ""} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor={`${mode}-last-name`}>
                Last name
              </label>
              <Input id={`${mode}-last-name`} name="last_name" defaultValue={patient?.last_name ?? ""} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor={`${mode}-dob`}>
                Date of birth
              </label>
              <Input id={`${mode}-dob`} name="date_of_birth" type="date" defaultValue={patient?.date_of_birth ?? ""} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor={`${mode}-gender`}>
                Gender
              </label>
              <select
                id={`${mode}-gender`}
                name="gender"
                defaultValue={patient?.gender ?? "unknown"}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor={`${mode}-phone`}>
                Phone
              </label>
              <Input id={`${mode}-phone`} name="phone" defaultValue={patient?.phone ?? ""} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor={`${mode}-email`}>
                Email
              </label>
              <Input id={`${mode}-email`} name="email" type="email" defaultValue={patient?.email ?? ""} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor={`${mode}-nid`}>
                National ID
              </label>
              <Input id={`${mode}-nid`} name="national_id" defaultValue={patient?.national_id ?? ""} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor={`${mode}-sha`}>
                SHA number
              </label>
              <Input id={`${mode}-sha`} name="sha_number" defaultValue={patient?.sha_number ?? ""} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-800" htmlFor={`${mode}-address`}>
                Address
              </label>
              <Textarea id={`${mode}-address`} name="address" defaultValue={patient?.address ?? ""} rows={3} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor={`${mode}-emergency-name`}>
                Emergency contact name
              </label>
              <Input
                id={`${mode}-emergency-name`}
                name="emergency_contact_name"
                defaultValue={patient?.emergency_contact_name ?? ""}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor={`${mode}-emergency-phone`}>
                Emergency contact phone
              </label>
              <Input
                id={`${mode}-emergency-phone`}
                name="emergency_contact_phone"
                defaultValue={patient?.emergency_contact_phone ?? ""}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-800" htmlFor={`${mode}-metadata`}>
                Metadata JSON
              </label>
              <Textarea
                id={`${mode}-metadata`}
                name="metadata"
                defaultValue={patient ? JSON.stringify(patient.metadata, null, 2) : "{}"}
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : mode === "create" ? "Create patient" : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
