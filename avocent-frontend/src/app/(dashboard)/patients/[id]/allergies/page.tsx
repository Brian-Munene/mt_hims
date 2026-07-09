import { PatientAllergiesManager } from "@/components/patients/patient-allergies-manager";
import { PageHeader } from "@/components/shared/page-header";
import { listPatientAllergies } from "@/lib/api/patients";
import { requireUser } from "@/lib/auth";
import { canWritePatients } from "@/lib/rbac";

export default async function PatientAllergiesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, allergies] = await Promise.all([requireUser(), listPatientAllergies({ patient: id })]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Patient allergies"
        title="Allergy records"
        description="Track allergens, reactions, and severity using the clinic-scoped allergy endpoints."
      />
      <PatientAllergiesManager patientId={id} allergies={allergies.results} canWrite={canWritePatients(user)} />
    </div>
  );
}

