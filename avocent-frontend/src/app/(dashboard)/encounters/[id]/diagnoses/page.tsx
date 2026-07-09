import { CrudPanel } from "@/components/shared/crud-panel";
import { PageHeader } from "@/components/shared/page-header";
import { listDiagnoses } from "@/lib/api/clinical";

export default async function EncounterDiagnosesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const diagnoses = await listDiagnoses(id);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Clinical" title="Diagnoses" description="Doctor-only diagnosis records scoped to this encounter." />
      <CrudPanel
        title="Diagnosis"
        description="Create, edit, and remove diagnosis records for this encounter."
        endpoint="/api/proxy/api/clinical/diagnoses/"
        initialItems={diagnoses.results}
        fields={[
          { name: "encounter", label: "Encounter", required: true, hidden: true, defaultValue: id },
          { name: "icd10_code", label: "ICD-10 code", required: true },
          { name: "description", label: "Description", type: "textarea", required: true },
          { name: "is_primary", label: "Primary diagnosis", type: "checkbox" },
        ]}
      />
    </div>
  );
}

