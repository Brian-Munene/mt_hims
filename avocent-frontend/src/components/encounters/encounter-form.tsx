"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { AutosaveIndicator } from "@/components/shared/autosave-indicator";
import { ErrorList } from "@/components/shared/error-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrowserApiError, flattenValidationErrors } from "@/lib/api/browser";
import { createEncounter, updateEncounter } from "@/lib/api/encounters-browser";
import { useAutosave } from "@/hooks/use-autosave";
import { toDatetimeLocal } from "@/lib/format";
import type { Encounter } from "@/lib/types";

const encounterSchema = z.object({
  patient: z.string().min(1, "Patient is required"),
  practitioner: z.string().min(1, "Practitioner is required"),
  appointment: z.string().optional(),
  encounter_type: z.enum(["in_person", "video", "audio"]).optional(),
  triage_score: z.coerce.number().min(0).max(10).optional().nullable(),
  triage_level: z.enum(["green", "yellow", "orange", "red"]).optional(),
  physical_escalation_required: z.boolean().optional(),
  status: z.enum(["active", "completed", "cancelled"]).optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type EncounterFormData = z.infer<typeof encounterSchema>;

interface EncounterFormProps {
  mode: "create" | "edit";
  initialData?: Encounter;
  clinicPatients?: { id: string; first_name: string; last_name: string }[];
  practitioners?: { id: string; first_name?: string; last_name?: string; email?: string }[];
  appointments?: { id: string; label: string }[];
}

export function EncounterForm({
  mode,
  initialData,
  clinicPatients = [],
  practitioners = [],
  appointments = [],
}: EncounterFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<EncounterFormData>({
    patient: initialData?.patient ?? "",
    practitioner: initialData?.practitioner ?? "",
    appointment: initialData?.appointment ?? "",
    encounter_type: initialData?.encounter_type ?? "in_person",
    triage_score: initialData?.triage_score ?? null,
    triage_level: initialData?.triage_level ?? "green",
    physical_escalation_required: initialData?.physical_escalation_required ?? false,
    status: initialData?.status ?? "active",
    start_time: toDatetimeLocal(initialData?.start_time),
    end_time: initialData?.end_time ?? null,
    metadata: initialData?.metadata ?? {},
  });

  const { status: autosaveStatus } = useAutosave(
    async (data) => {
      if (mode === "edit" && initialData?.id) {
        await updateEncounter(initialData.id, data);
        router.refresh();
      }
    },
    formData,
    800,
  );

  const handleChange = (
    field: keyof EncounterFormData,
    value: string | number | boolean | null | undefined
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const result = encounterSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0];
        if (typeof path === "string") {
          fieldErrors[path] = issue.message;
        }
      });
      setErrors(fieldErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      if (mode === "create") {
        const created = await createEncounter(result.data);
        router.push(`/encounters/${created.id}`);
      } else if (initialData?.id) {
        await updateEncounter(initialData.id, result.data);
        router.refresh();
      }
    } catch (error) {
      if (error instanceof BrowserApiError) {
        const flattened = flattenValidationErrors(error.details);
        setErrors({ _form: flattened[0] ?? error.message });
      } else {
        setErrors({ _form: "Failed to save encounter. Please try again." });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ErrorList errors={errors._form ? [errors._form] : []} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800" htmlFor="patient">
            Patient <span className="text-destructive">*</span>
          </label>
          <select
            id="patient"
            value={formData.patient}
            onChange={(e) => handleChange("patient", e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
            required
          >
            <option value="">Select patient</option>
            {clinicPatients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.first_name} {patient.last_name}
              </option>
            ))}
          </select>
          {errors.patient && <p className="text-xs text-destructive">{errors.patient}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800" htmlFor="practitioner">
            Practitioner <span className="text-destructive">*</span>
          </label>
          <select
            id="practitioner"
            value={formData.practitioner}
            onChange={(e) => handleChange("practitioner", e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
            required
          >
            <option value="">Select practitioner</option>
            {practitioners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.first_name || p.last_name ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : (p.email ?? p.id)}
              </option>
            ))}
          </select>
          {errors.practitioner && <p className="text-xs text-destructive">{errors.practitioner}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800" htmlFor="encounter_type">
            Encounter Type
          </label>
          <select
            id="encounter_type"
            value={formData.encounter_type ?? "in_person"}
            onChange={(e) => handleChange("encounter_type", e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
          >
            <option value="in_person">In Person</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800" htmlFor="appointment">
            Appointment
          </label>
          <select
            id="appointment"
            value={formData.appointment ?? ""}
            onChange={(e) => handleChange("appointment", e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
          >
            <option value="">No linked appointment</option>
            {appointments.map((appointment) => (
              <option key={appointment.id} value={appointment.id}>
                {appointment.label}
              </option>
            ))}
          </select>
          {errors.appointment && <p className="text-xs text-destructive">{errors.appointment}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            value={formData.status ?? "active"}
            onChange={(e) => handleChange("status", e.target.value as "active" | "completed" | "cancelled")}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800" htmlFor="triage_score">
            Triage Score (0-10)
          </label>
          <Input
            id="triage_score"
            type="number"
            min="0"
            max="10"
            value={formData.triage_score ?? ""}
            onChange={(e) => handleChange("triage_score", e.target.value ? Number(e.target.value) : null)}
            placeholder="0-10"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800" htmlFor="triage_level">
            Triage Level
          </label>
          <select
            id="triage_level"
            value={formData.triage_level ?? "green"}
            onChange={(e) => handleChange("triage_level", e.target.value as "green" | "yellow" | "orange" | "red")}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
          >
            <option value="green">Green</option>
            <option value="yellow">Yellow</option>
            <option value="orange">Orange</option>
            <option value="red">Red</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800" htmlFor="start_time">
            Start Time
          </label>
          <Input
            id="start_time"
            type="datetime-local"
            value={toDatetimeLocal(formData.start_time)}
            onChange={(e) => handleChange("start_time", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800" htmlFor="end_time">
            End Time
          </label>
          <Input
            id="end_time"
            type="datetime-local"
            value={toDatetimeLocal(formData.end_time)}
            onChange={(e) => handleChange("end_time", e.target.value || null)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="physical_escalation_required"
          type="checkbox"
          checked={formData.physical_escalation_required ?? false}
          onChange={(e) => handleChange("physical_escalation_required", e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        <label className="text-sm text-slate-800" htmlFor="physical_escalation_required">
          Physical Escalation Required
        </label>
      </div>

      <div className="flex items-center gap-3">
        {mode === "create" ? (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Create Encounter"}
          </Button>
        ) : (
          <>
            <AutosaveIndicator status={autosaveStatus} />
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/encounters")}
            >
              Back to encounters
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
