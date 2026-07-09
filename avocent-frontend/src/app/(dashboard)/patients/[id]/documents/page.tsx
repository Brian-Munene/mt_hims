import { PatientDocumentsManager } from "@/components/patients/patient-documents-manager";
import { PageHeader } from "@/components/shared/page-header";
import { listPatientDocuments } from "@/lib/api/patients";
import { requireUser } from "@/lib/auth";
import { canWritePatients } from "@/lib/rbac";

export default async function PatientDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, documents] = await Promise.all([requireUser(), listPatientDocuments(id)]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Patient documents"
        title="Medical documents"
        description="Upload and manage medical files — reports, scans, referrals, consent forms, and other clinical documents."
      />
      <PatientDocumentsManager patientId={id} documents={documents.results} canWrite={canWritePatients(user)} />
    </div>
  );
}
