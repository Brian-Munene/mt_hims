import { CrudPanel } from "@/components/shared/crud-panel";
import { PageHeader } from "@/components/shared/page-header";
import { PrescriptionForm } from "@/components/pharmacy/prescription-form";
import { listPractitioners, listUsers } from "@/lib/api/admin";
import { listEncounters } from "@/lib/api/encounters";
import { listMedications, listStockBatches } from "@/lib/api/pharmacy";
import { requireUser } from "@/lib/auth";
import { buildEncounterOptions, buildMedicationOptions, buildPractitionerOptions } from "@/lib/options";
import { assertModuleAccess, hasAnyRole } from "@/lib/rbac";

export default async function PharmacyPage() {
  const user = await requireUser();
  assertModuleAccess(user, "pharmacy");
  const isAdmin = hasAnyRole(user, ["Admin"]);

  const [medications, encounters, practitioners, users, stockBatches] = await Promise.all([
    listMedications(),
    listEncounters({ ordering: "-start_time" }),
    listPractitioners(),
    isAdmin ? listUsers() : Promise.resolve({ results: [], count: 0, next: null, previous: null }),
    listStockBatches(),
  ]);
  const userById = new Map(users.results.map((u) => [u.id, u]));
  const encounterOptions = buildEncounterOptions(encounters.results);
  const practitionerOptions = buildPractitionerOptions(practitioners.results, userById);
  const medicationOptions = buildMedicationOptions(medications.results);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Pharmacy"
        title="Dispense queue"
        description="Create prescriptions with medication items and review the controlled substance warning before dispensing."
      />

      <PrescriptionForm
        medications={medications.results}
        practitionerOptions={practitionerOptions}
        encounterOptions={encounterOptions}
      />

      <CrudPanel
        title="Medication catalogue"
        description="Maintain the clinic medication inventory."
        endpoint="/api/proxy/api/pharmacy/medications/"
        initialItems={medications.results}
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "generic_name", label: "Generic name", required: true },
          { name: "strength", label: "Strength", required: true },
          { name: "dosage_form", label: "Dosage form", required: true },
          { name: "manufacturer", label: "Manufacturer" },
          { name: "unit_price", label: "Unit price" },
          { name: "reorder_level", label: "Reorder level", type: "number", required: true },
          { name: "is_controlled", label: "Controlled substance", type: "checkbox" },
          { name: "is_available", label: "Available", type: "checkbox" },
        ]}
      />

      <CrudPanel
        title="Stock batches"
        description="Track received medication batches, expiry dates, and remaining quantity."
        endpoint="/api/proxy/api/pharmacy/stock-batches/"
        initialItems={stockBatches.results}
        fields={[
          { name: "medication", label: "Medication", type: "select", options: medicationOptions, required: true },
          { name: "batch_number", label: "Batch number", required: true },
          { name: "expiry_date", label: "Expiry date", type: "text", required: true },
          { name: "quantity_received", label: "Quantity received", type: "number", required: true },
          { name: "quantity_remaining", label: "Quantity remaining", type: "number", required: true },
        ]}
      />
    </div>
  );
}
