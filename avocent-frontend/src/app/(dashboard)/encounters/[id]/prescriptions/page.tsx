import { CrudPanel } from "@/components/shared/crud-panel";
import { PageHeader } from "@/components/shared/page-header";
import { PrescriptionForm } from "@/components/pharmacy/prescription-form";
import { listPractitioners, listUsers } from "@/lib/api/admin";
import { listMedications, listPrescriptions } from "@/lib/api/pharmacy";
import { requireUser } from "@/lib/auth";
import { buildPractitionerOptions } from "@/lib/options";
import { hasAnyRole } from "@/lib/rbac";

export default async function EncounterPrescriptionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const isAdmin = hasAnyRole(user, ["Admin"]);
  const [prescriptions, practitioners, users, medications] = await Promise.all([
    listPrescriptions(id),
    listPractitioners(),
    isAdmin ? listUsers() : Promise.resolve({ results: [], count: 0, next: null, previous: null }),
    listMedications(),
  ]);
  const userById = new Map(users.results.map((staffUser) => [staffUser.id, staffUser]));
  const practitionerOptions = buildPractitionerOptions(practitioners.results, userById);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Pharmacy" title="Prescriptions" description="Encounter-generated prescriptions that later surface in the pharmacy queue." />
      <PrescriptionForm
        medications={medications.results}
        practitionerOptions={practitionerOptions}
        encounterId={id}
      />

      <CrudPanel
        title="Prescription"
        description="Create, update, and cancel encounter prescriptions."
        endpoint="/api/proxy/api/pharmacy/prescriptions/"
        initialItems={prescriptions.results}
        fields={[
          { name: "encounter", label: "Encounter", required: true, hidden: true, defaultValue: id },
          { name: "prescribed_by", label: "Prescribed by", type: "select", options: practitionerOptions, required: true },
          {
            name: "status",
            label: "Status",
            type: "select",
            required: true,
            options: [
              { value: "active", label: "Active" },
              { value: "dispensed", label: "Dispensed" },
              { value: "cancelled", label: "Cancelled" },
            ],
          },
          { name: "hash_signature", label: "Signature hash", required: true },
        ]}
      />
    </div>
  );
}
