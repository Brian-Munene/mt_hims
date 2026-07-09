"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";

import { InteractionWarning } from "@/components/pharmacy/interaction-warning";
import { MedicationCombobox } from "@/components/pharmacy/medication-combobox";
import { ErrorList } from "@/components/shared/error-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BrowserApiError, flattenValidationErrors } from "@/lib/api/browser";
import { createPrescription, createPrescriptionItem } from "@/lib/api/pharmacy-browser";
import type { FieldOption } from "@/lib/options";
import type { Medication } from "@/lib/types";

const headerSchema = z.object({
  encounter: z.string().min(1, "Encounter is required"),
  prescribed_by: z.string().min(1, "Prescriber is required"),
  status: z.enum(["active", "dispensed", "cancelled"]),
  hash_signature: z.string().min(1, "Signature hash is required"),
});

const itemSchema = z.object({
  medication: z.string().min(1, "Medication is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.string().min(1, "Frequency is required"),
  duration: z.string().min(1, "Duration is required"),
  quantity: z.coerce.number().int().positive("Quantity must be a positive integer"),
});

type HeaderData = z.infer<typeof headerSchema>;
type ItemDraft = z.infer<typeof itemSchema>;

interface PrescriptionFormProps {
  medications: Medication[];
  practitionerOptions: FieldOption[];
  encounterOptions?: FieldOption[];
  encounterId?: string;
  onSuccess?: () => void;
}

function blankItem(): ItemDraft {
  return { medication: "", dosage: "", frequency: "", duration: "", quantity: 1 };
}

export function PrescriptionForm({
  medications,
  practitionerOptions,
  encounterOptions = [],
  encounterId,
  onSuccess,
}: PrescriptionFormProps) {
  const [header, setHeader] = useState<HeaderData>({
    encounter: encounterId ?? "",
    prescribed_by: "",
    status: "active",
    hash_signature: "",
  });
  const [items, setItems] = useState<ItemDraft[]>([blankItem()]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const selectedMedications = items
    .map((item) => medications.find((m) => m.id === item.medication))
    .filter((m): m is Medication => m !== undefined);

  const addItem = () => setItems((prev) => [...prev, blankItem()]);

  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const updateItem = (index: number, field: keyof ItemDraft, value: string | number) =>
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const headerResult = headerSchema.safeParse(header);
    if (!headerResult.success) {
      setErrors(headerResult.error.issues.map((i) => i.message));
      return;
    }

    const itemResults = items.map((item) => itemSchema.safeParse(item));
    const itemErrors = itemResults.flatMap((r) =>
      r.success ? [] : r.error.issues.map((i) => i.message),
    );
    if (itemErrors.length) {
      setErrors(itemErrors);
      return;
    }

    startTransition(async () => {
      try {
        const prescription = await createPrescription(headerResult.data);
        await Promise.all(
          itemResults
            .filter((r): r is { success: true; data: ItemDraft } => r.success)
            .map((r) =>
              createPrescriptionItem({ ...r.data, prescription: prescription.id }),
            ),
        );
        setHeader({ encounter: encounterId ?? "", prescribed_by: "", status: "active", hash_signature: "" });
        setItems([blankItem()]);
        onSuccess?.();
      } catch (error) {
        if (error instanceof BrowserApiError) {
          const backendErrors = flattenValidationErrors(error.details);
          setErrors(backendErrors.length ? backendErrors : [error.message]);
        } else {
          setErrors(["Failed to create prescription. Please try again."]);
        }
      }
    });
  };

  return (
    <Card className="border-slate-200/70">
      <CardHeader>
        <CardTitle>New prescription</CardTitle>
        <p className="text-sm text-slate-600">
          Create a prescription with one or more medication items.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <ErrorList errors={errors} />

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {!encounterId && (
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-800" htmlFor="rx-encounter">
                  Encounter <span className="text-destructive">*</span>
                </label>
                <select
                  id="rx-encounter"
                  value={header.encounter}
                  onChange={(e) => setHeader((prev) => ({ ...prev, encounter: e.target.value }))}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                  required
                >
                  <option value="">Select encounter</option>
                  {encounterOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="rx-prescribed-by">
                Prescribed by <span className="text-destructive">*</span>
              </label>
              <select
                id="rx-prescribed-by"
                value={header.prescribed_by}
                onChange={(e) => setHeader((prev) => ({ ...prev, prescribed_by: e.target.value }))}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                required
              >
                <option value="">Select practitioner</option>
                {practitionerOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="rx-status">
                Status
              </label>
              <select
                id="rx-status"
                value={header.status}
                onChange={(e) =>
                  setHeader((prev) => ({
                    ...prev,
                    status: e.target.value as HeaderData["status"],
                  }))
                }
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
              >
                <option value="active">Active</option>
                <option value="dispensed">Dispensed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="rx-signature">
                Signature hash <span className="text-destructive">*</span>
              </label>
              <Input
                id="rx-signature"
                value={header.hash_signature}
                onChange={(e) => setHeader((prev) => ({ ...prev, hash_signature: e.target.value }))}
                placeholder="Cryptographic signature"
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-800">Medication items</p>
              <Button type="button" variant="outline" onClick={addItem} className="h-7 text-xs">
                <Plus className="mr-1 size-3" /> Add item
              </Button>
            </div>

            {items.map((item, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2"
              >
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-800">Medication</label>
                  <MedicationCombobox
                    medications={medications}
                    value={item.medication}
                    onChange={(id) => updateItem(index, "medication", id)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800">Dosage</label>
                  <Input
                    value={item.dosage}
                    onChange={(e) => updateItem(index, "dosage", e.target.value)}
                    placeholder="e.g. 500mg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800">Frequency</label>
                  <Input
                    value={item.frequency}
                    onChange={(e) => updateItem(index, "frequency", e.target.value)}
                    placeholder="e.g. Twice daily"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800">Duration</label>
                  <Input
                    value={item.duration}
                    onChange={(e) => updateItem(index, "duration", e.target.value)}
                    placeholder="e.g. 7 days"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800">Quantity</label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                  />
                </div>
                {items.length > 1 && (
                  <div className="flex items-end md:col-span-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeItem(index)}
                      className="h-7 text-xs text-rose-600 hover:text-rose-700"
                    >
                      <Trash2 className="mr-1 size-3" /> Remove
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <InteractionWarning selectedMedications={selectedMedications} />

          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating…" : "Create prescription"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
