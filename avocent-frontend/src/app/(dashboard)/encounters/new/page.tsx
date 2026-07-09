import { EncounterForm } from "@/components/encounters/encounter-form";
import { PageHeader } from "@/components/shared/page-header";
import { listPractitioners, listUsers } from "@/lib/api/admin";
import { listAppointments } from "@/lib/api/encounters";
import { listPatients } from "@/lib/api/patients";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { hasAnyRole } from "@/lib/rbac";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewEncounterPage() {
  const user = await requireUser();
  const isAdmin = hasAnyRole(user, ["Admin"]);
  const [patientsResponse, practitionersResponse, usersResponse, appointmentsResponse] = await Promise.all([
    listPatients({ ordering: "first_name" }),
    listPractitioners(),
    isAdmin ? listUsers() : Promise.resolve({ results: [], count: 0, next: null, previous: null }),
    listAppointments({ ordering: "scheduled_time" }),
  ]);

  const clinicPatients = patientsResponse.results.map((patient) => ({
    id: patient.id,
    first_name: patient.first_name,
    last_name: patient.last_name,
  }));

  const userById = new Map(usersResponse.results.map((staffUser) => [staffUser.id, staffUser]));
  const practitioners = practitionersResponse.results.map((practitioner) => {
    const staffUser = userById.get(practitioner.user);

    return {
      id: practitioner.id,
      email: [staffUser?.email, practitioner.specialty, practitioner.license_number].filter(Boolean).join(" • "),
    };
  });
  const practitionerLabelById = new Map(practitioners.map((practitioner) => [practitioner.id, practitioner.email ?? practitioner.id]));
  const patientLabelById = new Map(clinicPatients.map((patient) => [patient.id, `${patient.first_name} ${patient.last_name}`]));
  const appointments = appointmentsResponse.results.map((appointment) => ({
    id: appointment.id,
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
          href="/encounters"
          className="inline-flex h-7 items-center justify-center gap-1.5 rounded-lg border border-transparent px-2.5 text-sm font-medium whitespace-nowrap text-slate-700 hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to encounters
        </Link>
      </div>

      <PageHeader
        eyebrow="Encounters"
        title="Create new encounter"
        description="Start a new patient encounter visit."
      />

      <div className="max-w-2xl">
        <EncounterForm
          mode="create"
          clinicPatients={clinicPatients}
          practitioners={practitioners}
          appointments={appointments}
        />
      </div>
    </div>
  );
}
