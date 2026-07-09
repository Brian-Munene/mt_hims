import { CrudPanel } from "@/components/shared/crud-panel";
import { PageHeader } from "@/components/shared/page-header";
import { listObservations } from "@/lib/api/clinical";

export default async function EncounterObservationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const observations = await listObservations(id);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Clinical" title="Observations" description="Encounter-scoped vitals and clinical measurements." />
      <CrudPanel
        title="Observation"
        description="Create, update, and delete observation records for this encounter."
        endpoint="/api/proxy/api/clinical/observations/"
        initialItems={observations.results}
        fields={[
          { name: "encounter", label: "Encounter", required: true, hidden: true, defaultValue: id },
          { name: "name", label: "Name", required: true },
          { name: "value", label: "Value", required: true },
          { name: "unit", label: "Unit", required: true },
          { name: "loinc_code", label: "LOINC code" },
          { name: "reference_range", label: "Reference range" },
          { name: "abnormal_flag", label: "Abnormal flag" },
        ]}
      />
    </div>
  );
}

