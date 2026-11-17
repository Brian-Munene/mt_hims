import { notFound } from "next/navigation";

import type { CrudField } from "@/components/shared/crud-panel";
import { listClinics } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/http";
import type { FieldOption } from "@/lib/options";
import type { SessionUser } from "@/lib/types";

export type SearchValue = string | string[] | undefined;

export function first(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value;
}

export interface ClinicContext {
  /** Clinic whose data the page shows and new records default to. */
  clinicId: string;
  /** Sent as ?clinic= on list requests — superusers only (the API pins everyone else anyway). */
  clinicParam: string | undefined;
  /** All clinics, for superusers; empty for everyone else. */
  clinicOptions: FieldOption[];
}

/**
 * Superusers may work on any clinic's pharmacy data (chosen via ?clinic=, or
 * fixed by the record being edited); everyone else always gets their own
 * clinic, which the backend enforces regardless of what the client sends.
 */
export async function resolveClinicContext(user: SessionUser, requested?: string): Promise<ClinicContext> {
  if (!user.is_superuser) {
    return { clinicId: user.clinic, clinicParam: undefined, clinicOptions: [] };
  }
  const clinics = await listClinics();
  const clinicOptions = clinics.results.map((clinic) => ({
    value: clinic.id,
    label: `${clinic.name} (${clinic.code})`,
  }));
  const clinicId = requested && clinicOptions.some((option) => option.value === requested) ? requested : user.clinic;
  return { clinicId, clinicParam: clinicId, clinicOptions };
}

/** `?clinic=` suffix that keeps a superuser's selected clinic across pages. */
export function clinicQuery(context: ClinicContext) {
  return context.clinicParam ? `?clinic=${context.clinicParam}` : "";
}

/** Clinic dropdown for superusers on create forms; nothing for everyone else. */
export function clinicSelectField(context: ClinicContext): CrudField[] {
  return context.clinicOptions.length
    ? [
        {
          name: "clinic",
          label: "Clinic",
          type: "select",
          required: true,
          defaultValue: context.clinicId,
          options: context.clinicOptions,
        },
      ]
    : [];
}

export function medicationFields(): CrudField[] {
  return [
    { name: "name", label: "Name", required: true },
    { name: "generic_name", label: "Generic name", required: true },
    { name: "strength", label: "Strength", required: true },
    { name: "dosage_form", label: "Dosage form", required: true },
    { name: "manufacturer", label: "Manufacturer" },
    { name: "unit_price", label: "Unit price" },
    { name: "reorder_level", label: "Reorder level", type: "number", required: true },
    { name: "is_controlled", label: "Controlled substance", type: "checkbox" },
    { name: "is_available", label: "Available", type: "checkbox" },
  ];
}

export function stockBatchFields(medicationOptions: FieldOption[]): CrudField[] {
  return [
    { name: "medication", label: "Medication", type: "select", options: medicationOptions, required: true },
    { name: "batch_number", label: "Batch number", required: true },
    { name: "expiry_date", label: "Expiry date", type: "date", required: true },
    { name: "quantity_received", label: "Quantity received", type: "number", required: true },
    { name: "quantity_remaining", label: "Quantity remaining (max: received)", type: "number", required: true },
  ];
}

export const PRESCRIPTION_STATUS_OPTIONS: FieldOption[] = [
  { value: "active", label: "Active" },
  { value: "dispensed", label: "Dispensed" },
  { value: "cancelled", label: "Cancelled" },
];

export function prescriptionEditFields(practitionerOptions: FieldOption[]): CrudField[] {
  return [
    { name: "prescribed_by", label: "Prescribed by", type: "select", options: practitionerOptions, required: true },
    { name: "status", label: "Status", type: "select", options: PRESCRIPTION_STATUS_OPTIONS, required: true },
    { name: "hash_signature", label: "Signature hash", required: true },
  ];
}

/** Await a detail fetch, rendering the 404 page if the record doesn't exist (or isn't visible to this user). */
export async function orNotFound<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

/** Edit pages work in the record's own clinic; superusers return to the list filtered to it. */
export function recordClinicContext(user: SessionUser, recordClinic: string): ClinicContext {
  return user.is_superuser
    ? { clinicId: recordClinic, clinicParam: recordClinic, clinicOptions: [] }
    : { clinicId: user.clinic, clinicParam: undefined, clinicOptions: [] };
}
