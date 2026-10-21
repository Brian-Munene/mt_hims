import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { CreateBookingForm } from "@/components/booking/create-booking-form";
import { PageHeader } from "@/components/shared/page-header";
import { listPractitioners, listUsers } from "@/lib/api/admin";
import { requireUser } from "@/lib/auth";
import { listAppointments } from "@/lib/api/encounters";
import { listPatients } from "@/lib/api/patients";
import { formatDateTime } from "@/lib/format";
import { buildPractitionerOptions } from "@/lib/options";
import { assertModuleAccess, hasAnyRole } from "@/lib/rbac";

export default async function NewBookingPage() {
  const user = await requireUser();
  assertModuleAccess(user, "booking");

  const isAdmin = hasAnyRole(user, ["Admin"]);
  const [patients, appointments, practitioners, users] = await Promise.all([
    listPatients({ ordering: "first_name" }),
    listAppointments({ status: "scheduled", ordering: "scheduled_time" }),
    listPractitioners(),
    isAdmin ? listUsers() : Promise.resolve({ results: [], count: 0, next: null, previous: null }),
  ]);

  const patientLabelById = new Map(
    patients.results.map((patient) => [patient.id, `${patient.first_name} ${patient.last_name}`]),
  );
  const userById = new Map(users.results.map((staffUser) => [staffUser.id, staffUser]));
  const practitionerOptions = buildPractitionerOptions(practitioners.results, userById);
  const practitionerLabelById = new Map(practitionerOptions.map((o) => [o.value, o.label]));
  const appointmentOptions = appointments.results.map((appointment) => ({
    value: appointment.id,
    label: [
      patientLabelById.get(appointment.patient) ?? "Unknown patient",
      practitionerLabelById.get(appointment.practitioner) ?? `Practitioner ${appointment.practitioner.slice(0, 8)}`,
      formatDateTime(appointment.scheduled_time),
    ].join(" • "),
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/booking"
          className="inline-flex h-7 items-center justify-center gap-1.5 rounded-lg border border-transparent px-2.5 text-sm font-medium whitespace-nowrap text-slate-700 hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to bookings
        </Link>
      </div>

      <PageHeader
        eyebrow="Booking"
        title="Create new booking"
        description="Register a walk-in, scheduled, or telemedicine booking."
      />

      <div className="max-w-2xl">
        <CreateBookingForm
          patients={patients.results}
          appointments={appointmentOptions}
          practitioners={practitionerOptions}
        />
      </div>
    </div>
  );
}
