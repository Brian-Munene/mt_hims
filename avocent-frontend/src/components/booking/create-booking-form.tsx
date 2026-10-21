"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { z } from "zod";

import { ErrorList } from "@/components/shared/error-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BrowserApiError, browserRequest, extractApiErrors } from "@/lib/api/browser";
import { parseJsonMetadata } from "@/lib/utils";
import type { Booking, Patient } from "@/lib/types";

const bookingSchema = z
  .object({
    patient: z.string().min(1, "Patient is required."),
    appointment: z.string().optional(),
    assigned_practitioner: z.string().optional(),
    booking_type: z.enum(["walk_in", "scheduled", "telemedicine"]),
    source: z.enum(["reception", "public_portal", "call_center", "internal_referral"]),
    encounter_type: z.enum(["in_person", "video", "audio"]),
    priority: z.enum(["routine", "urgent", "emergency"]),
    triage_required: z.boolean(),
    reason_for_visit: z.string().optional(),
    notes: z.string().optional(),
    scheduled_time: z.string().optional(),
    metadataText: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.booking_type !== "walk_in" && !value.scheduled_time) {
      ctx.addIssue({
        code: "custom",
        path: ["scheduled_time"],
        message: "Scheduled and telemedicine bookings need a scheduled time.",
      });
    }
  });

type SelectOption = { value: string; label: string };

export function CreateBookingForm({
  patients,
  appointments,
  practitioners,
}: {
  patients: Patient[];
  appointments: SelectOption[];
  practitioners: SelectOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);

  return (
    <Card className="border-slate-200/70">
      <CardHeader>
        <CardTitle>Create booking</CardTitle>
        <CardDescription>
          Create walk-in, scheduled, or telemedicine bookings using the operational workflow model from the backend.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setErrors([]);
            const formData = new FormData(event.currentTarget);

            startTransition(async () => {
              try {
                const parsed = bookingSchema.parse({
                  patient: String(formData.get("patient") ?? ""),
                  appointment: String(formData.get("appointment") ?? "").trim() || undefined,
                  assigned_practitioner: String(formData.get("assigned_practitioner") ?? "").trim() || undefined,
                  booking_type: String(formData.get("booking_type") ?? "walk_in"),
                  source: String(formData.get("source") ?? "reception"),
                  encounter_type: String(formData.get("encounter_type") ?? "in_person"),
                  priority: String(formData.get("priority") ?? "routine"),
                  triage_required: String(formData.get("triage_required") ?? "true") === "true",
                  reason_for_visit: String(formData.get("reason_for_visit") ?? "").trim(),
                  notes: String(formData.get("notes") ?? "").trim(),
                  scheduled_time: String(formData.get("scheduled_time") ?? "").trim() || undefined,
                  metadataText: String(formData.get("metadata") ?? "").trim(),
                });

                const booking = await browserRequest<Booking>("/api/proxy/api/booking/bookings/", {
                  method: "POST",
                  body: {
                    patient: parsed.patient,
                    ...(parsed.appointment ? { appointment: parsed.appointment } : {}),
                    ...(parsed.assigned_practitioner ? { assigned_practitioner: parsed.assigned_practitioner } : {}),
                    booking_type: parsed.booking_type,
                    source: parsed.source,
                    encounter_type: parsed.encounter_type,
                    priority: parsed.priority,
                    triage_required: parsed.triage_required,
                    reason_for_visit: parsed.reason_for_visit || "",
                    notes: parsed.notes || "",
                    ...(parsed.scheduled_time ? { scheduled_time: parsed.scheduled_time } : {}),
                    metadata: parseJsonMetadata(parsed.metadataText),
                  },
                });

                router.push(`/booking/${booking.id}`);
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

                setErrors([error instanceof Error ? error.message : "Unable to create booking."]);
              }
            });
          }}
        >
          <ErrorList errors={errors} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-800">Patient</label>
              <select name="patient" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm" defaultValue="">
                <option value="" disabled>
                  Select patient
                </option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">Booking type</label>
              <select name="booking_type" defaultValue="walk_in" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm">
                <option value="walk_in">Walk in</option>
                <option value="scheduled">Scheduled</option>
                <option value="telemedicine">Telemedicine</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">Source</label>
              <select name="source" defaultValue="reception" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm">
                <option value="reception">Reception</option>
                <option value="public_portal">Public portal</option>
                <option value="call_center">Call center</option>
                <option value="internal_referral">Internal referral</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">Encounter type</label>
              <select name="encounter_type" defaultValue="in_person" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm">
                <option value="in_person">In person</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">Priority</label>
              <select name="priority" defaultValue="routine" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm">
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">Triage required</label>
              <select name="triage_required" defaultValue="true" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm">
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">Scheduled time</label>
              <Input name="scheduled_time" type="datetime-local" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">Linked appointment</label>
              <select name="appointment" defaultValue="" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm">
                <option value="">No linked appointment</option>
                {appointments.map((appointment) => (
                  <option key={appointment.value} value={appointment.value}>
                    {appointment.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-800">Assigned practitioner</label>
              <select
                name="assigned_practitioner"
                defaultValue=""
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
              >
                <option value="">Unassigned</option>
                {practitioners.map((practitioner) => (
                  <option key={practitioner.value} value={practitioner.value}>
                    {practitioner.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-800">Reason for visit</label>
              <Textarea name="reason_for_visit" rows={3} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-800">Notes</label>
              <Textarea name="notes" rows={3} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-800">Metadata JSON</label>
              <Textarea name="metadata" rows={4} defaultValue="{}" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create booking"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
