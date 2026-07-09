"use client";

import { useState, useTransition } from "react";
import { z } from "zod";

import { AutosaveIndicator } from "@/components/shared/autosave-indicator";
import { ErrorList } from "@/components/shared/error-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BrowserApiError, flattenValidationErrors } from "@/lib/api/browser";
import { updateEncounter } from "@/lib/api/encounters-browser";
import type { Encounter } from "@/lib/types";

const triageSchema = z.object({
  triage_score: z.coerce.number().min(0).max(10).optional().nullable(),
  triage_level: z.enum(["green", "yellow", "orange", "red"]),
  physical_escalation_required: z.boolean(),
});

type TriageFormData = z.infer<typeof triageSchema>;

interface TriageFormProps {
  encounterId: string;
  initialData: Pick<Encounter, "triage_score" | "triage_level" | "physical_escalation_required">;
}

const triageLevelColors: Record<string, string> = {
  green: "border-l-emerald-400",
  yellow: "border-l-yellow-400",
  orange: "border-l-orange-400",
  red: "border-l-rose-500",
};

export function TriageForm({ encounterId, initialData }: TriageFormProps) {
  const [formData, setFormData] = useState<TriageFormData>({
    triage_score: initialData.triage_score ?? null,
    triage_level: initialData.triage_level ?? "green",
    physical_escalation_required: initialData.physical_escalation_required ?? false,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = triageSchema.safeParse(formData);
    if (!result.success) {
      setErrors(result.error.issues.map((i) => i.message));
      return;
    }
    setErrors([]);
    setSaveStatus("saving");
    startTransition(async () => {
      try {
        await updateEncounter(encounterId, result.data);
        setSaveStatus("saved");
      } catch (error) {
        setSaveStatus("error");
        if (error instanceof BrowserApiError) {
          setErrors(flattenValidationErrors(error.details));
        } else {
          setErrors(["Failed to save triage data."]);
        }
      }
    });
  };

  return (
    <Card
      className={`border-l-4 border-slate-200/70 ${triageLevelColors[formData.triage_level] ?? "border-l-slate-300"}`}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Triage</CardTitle>
          <AutosaveIndicator status={saveStatus} />
        </div>
      </CardHeader>
      <CardContent>
        <ErrorList errors={errors} />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="triage_level">
                Triage level
              </label>
              <select
                id="triage_level"
                value={formData.triage_level}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    triage_level: e.target.value as TriageFormData["triage_level"],
                  }))
                }
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
              >
                <option value="green">Green</option>
                <option value="yellow">Yellow</option>
                <option value="orange">Orange</option>
                <option value="red">Red</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="triage_score">
                Triage score (0–10)
              </label>
              <Input
                id="triage_score"
                type="number"
                min="0"
                max="10"
                value={formData.triage_score ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    triage_score: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder="0–10"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="physical_escalation_required"
              type="checkbox"
              checked={formData.physical_escalation_required}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  physical_escalation_required: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-input"
            />
            <label className="text-sm text-slate-800" htmlFor="physical_escalation_required">
              Physical escalation required
            </label>
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save triage"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
