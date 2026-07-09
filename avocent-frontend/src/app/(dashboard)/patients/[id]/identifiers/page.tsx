import { PatientIdentifiersManager } from "@/components/patients/patient-identifiers-manager";
import { PageHeader } from "@/components/shared/page-header";
import { listPatientIdentifiers } from "@/lib/api/patients";
import { requireUser } from "@/lib/auth";
import { canWritePatients } from "@/lib/rbac";

export default async function PatientIdentifiersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, identifiers] = await Promise.all([requireUser(), listPatientIdentifiers({ patient: id })]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Patient identifiers"
        title="Identifier records"
        description="Manage SHA, passport, and national ID records through `/api/patients/identifiers/`."
      />
      <PatientIdentifiersManager patientId={id} identifiers={identifiers.results} canWrite={canWritePatients(user)} />
    </div>
  );
}

