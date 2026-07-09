import { assertModuleAccess } from "@/lib/rbac";
import { requireUser } from "@/lib/auth";
import { listClinicalNotes } from "@/lib/api/clinical";
import { listEncounters } from "@/lib/api/encounters";
import { CrudPanel } from "@/components/shared/crud-panel";
import { PageHeader } from "@/components/shared/page-header";
import { buildEncounterOptions } from "@/lib/options";

export default async function ClinicalPage() {
  const user = await requireUser();
  assertModuleAccess(user, "clinical");

  const [notes, encounters] = await Promise.all([
    listClinicalNotes(),
    listEncounters({ ordering: "-start_time" }),
  ]);
  const encounterOptions = buildEncounterOptions(encounters.results);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Clinical"
        title="Clinical notes"
        description="Cross-encounter SOAP note review for clinicians. Diagnoses and observations are managed from within each encounter."
      />
      <CrudPanel
        title="Clinical note"
        description="Create, update, and delete SOAP notes."
        endpoint="/api/proxy/api/clinical/notes/"
        initialItems={notes.results}
        fields={[
          { name: "encounter", label: "Encounter", type: "select", options: encounterOptions, required: true },
          { name: "subjective", label: "Subjective", type: "textarea", required: true },
          { name: "objective", label: "Objective", type: "textarea", required: true },
          { name: "assessment", label: "Assessment", type: "textarea", required: true },
          { name: "plan", label: "Plan", type: "textarea", required: true },
        ]}
      />
    </div>
  );
}
