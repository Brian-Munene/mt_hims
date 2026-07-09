import Link from "next/link";

import { PatientAlertBanner } from "@/components/patients/patient-alert-banner";
import { PatientDeleteButton } from "@/components/patients/patient-delete-button";
import { PatientForm } from "@/components/patients/patient-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatName } from "@/lib/format";
import {
  getPatient,
  listPatientAlerts,
  listPatientAllergies,
  listPatientChronicConditions,
  listPatientIdentifiers,
} from "@/lib/api/patients";
import { requireUser } from "@/lib/auth";
import { canWritePatients } from "@/lib/rbac";

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, patient, identifiers, allergies, conditions, alerts] = await Promise.all([
    requireUser(),
    getPatient(id),
    listPatientIdentifiers({ patient: id }),
    listPatientAllergies({ patient: id }),
    listPatientChronicConditions({ patient: id }),
    listPatientAlerts(id),
  ]);
  const canWrite = canWritePatients(user);

  return (
    <div className="space-y-8">
      <PatientAlertBanner alerts={alerts.results} />
      <PageHeader
        eyebrow="Patient detail"
        title={formatName(patient.first_name, patient.last_name)}
        description="This page is designed as the patient master view, with quick links into encounters and longitudinal notes."
      />

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="space-y-6">
          <Card className="border-slate-200/70">
            <CardHeader>
              <CardTitle>Demographics</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Date of birth</p>
                <p className="mt-1 font-medium text-slate-900">{formatDate(patient.date_of_birth)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Gender</p>
                <p className="mt-1 font-medium capitalize text-slate-900">{patient.gender}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Phone</p>
                <p className="mt-1 font-medium text-slate-900">{patient.phone || "No phone recorded"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Email</p>
                <p className="mt-1 font-medium text-slate-900">{patient.email || "No email recorded"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Emergency contact</p>
                <p className="mt-1 font-medium text-slate-900">{patient.emergency_contact_name || "Not recorded"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Emergency phone</p>
                <p className="mt-1 font-medium text-slate-900">{patient.emergency_contact_phone || "Not recorded"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/70 bg-slate-950 text-white">
            <CardHeader>
              <CardTitle className="text-white">Patient context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-slate-300">
              <p>Encounter-driven workflows hang off this patient record.</p>
              <p>Identifiers, allergy history, and chronic disease tracking are available below.</p>
              <div className="grid gap-3 md:grid-cols-2">
                <Link href={`/patients/${patient.id}/encounters`} className="rounded-2xl bg-white/10 px-4 py-3">
                  Encounter history
                </Link>
                <Link href={`/patients/${patient.id}/notes`} className="rounded-2xl bg-white/10 px-4 py-3">
                  Clinical notes
                </Link>
                <Link href={`/patients/${patient.id}/identifiers`} className="rounded-2xl bg-white/10 px-4 py-3">
                  Identifiers ({identifiers.count})
                </Link>
                <Link href={`/patients/${patient.id}/allergies`} className="rounded-2xl bg-white/10 px-4 py-3">
                  Allergies ({allergies.count})
                </Link>
                <Link href={`/patients/${patient.id}/chronic-conditions`} className="rounded-2xl bg-white/10 px-4 py-3">
                  Chronic conditions ({conditions.count})
                </Link>
                <Link href={`/patients/${patient.id}/documents`} className="rounded-2xl bg-white/10 px-4 py-3">
                  Documents
                </Link>
                <Link href={`/patients/${patient.id}/alerts`} className="rounded-2xl bg-white/10 px-4 py-3">
                  Alerts ({alerts.count})
                </Link>
              </div>
            </CardContent>
          </Card>

          {canWrite && <PatientForm mode="edit" patient={patient} />}
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200/70">
            <CardHeader>
              <CardTitle>Quick counts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Identifiers</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{identifiers.count}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Allergies</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{allergies.count}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Chronic conditions</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{conditions.count}</p>
              </div>
            </CardContent>
          </Card>

          {canWrite && (
            <Card className="border-rose-200 bg-rose-50/70">
              <CardHeader>
                <CardTitle>Danger zone</CardTitle>
              </CardHeader>
              <CardContent>
                <PatientDeleteButton patientId={patient.id} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
