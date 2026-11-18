import { CrudPanel, type CrudField } from "@/components/shared/crud-panel";
import { PageHeader } from "@/components/shared/page-header";
import { PrescriptionForm } from "@/components/pharmacy/prescription-form";
import { listClinics, listPractitioners, listUsers } from "@/lib/api/admin";
import { getEncounter } from "@/lib/api/encounters";
import { listMedications, listPrescriptions } from "@/lib/api/pharmacy";
import { requireUser } from "@/lib/auth";
import { buildPractitionerOptions } from "@/lib/options";
import { hasAnyRole } from "@/lib/rbac";

export default async function EncounterPrescriptionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const isAdmin = hasAnyRole(user, ["Admin"]);

  // A prescription belongs to its encounter's clinic. Superusers may open an
  // encounter from any clinic, so scope their option lists to that clinic and
  // send it explicitly; everyone else is pinned to their own clinic by the API.
  const [encounter, clinics] = user.is_superuser
    ? await Promise.all([getEncounter(id), listClinics()])
    : [null, null];
  const clinicParam = encounter?.clinic;
  const encounterClinic = clinics?.results.find((clinic) => clinic.id === clinicParam);
  const clinicOptions = encounterClinic
    ? [{ value: encounterClinic.id, label: `${encounterClinic.name} (${encounterClinic.code})` }]
    : [];

  const [prescriptions, practitioners, users, medications] = await Promise.all([
    listPrescriptions(id, clinicParam),
    listPractitioners(clinicParam),
    isAdmin ? listUsers() : Promise.resolve({ results: [], count: 0, next: null, previous: null }),
    listMedications(clinicParam),
  ]);
  const clinicField: CrudField[] = clinicParam
    ? [{ name: "clinic", label: "Clinic", required: true, hidden: true, defaultValue: clinicParam }]
    : [];
  const userById = new Map(users.results.map((staffUser) => [staffUser.id, staffUser]));
  const practitionerOptions = buildPractitionerOptions(practitioners.results, userById);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Pharmacy" title="Prescriptions" description="Encounter-generated prescriptions that later surface in the pharmacy queue." />
      <PrescriptionForm
        medications={medications.results}
        practitionerOptions={practitionerOptions}
        encounterId={id}
        clinicOptions={clinicOptions}
        defaultClinic={clinicParam}
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
          ...clinicField,
        ]}
      />
    </div>
  );
}
