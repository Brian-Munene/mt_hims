import { PatientChronicConditionsManager } from "@/components/patients/patient-chronic-conditions-manager";
import { PageHeader } from "@/components/shared/page-header";
import { listPatientChronicConditions } from "@/lib/api/patients";
import { requireUser } from "@/lib/auth";
import { canWritePatients } from "@/lib/rbac";

export default async function PatientChronicConditionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, conditions] = await Promise.all([requireUser(), listPatientChronicConditions({ patient: id })]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Patient chronic conditions"
        title="Chronic condition records"
        description="Maintain long-term diagnoses and ICD-10 metadata for the current patient."
      />
      <PatientChronicConditionsManager
        patientId={id}
        conditions={conditions.results}
        canWrite={canWritePatients(user)}
      />
    </div>
  );
}
