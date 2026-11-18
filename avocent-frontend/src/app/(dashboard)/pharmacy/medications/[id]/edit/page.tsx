import { BackToPharmacy } from "@/components/pharmacy/back-to-pharmacy";
import { PageHeader } from "@/components/shared/page-header";
import { RecordForm } from "@/components/shared/record-form";
import { getMedication } from "@/lib/api/pharmacy";
import { requireUser } from "@/lib/auth";
import { clinicQuery, medicationFields, orNotFound, recordClinicContext } from "@/lib/pharmacy-pages";
import { assertModuleAccess } from "@/lib/rbac";

export default async function EditMedicationPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([requireUser(), params]);
  assertModuleAccess(user, "pharmacy");
  const medication = await orNotFound(getMedication(id));
  const listHref = `/pharmacy/${clinicQuery(recordClinicContext(user, medication.clinic))}`;

  return (
    <div className="space-y-6">
      <BackToPharmacy href={listHref} />
      <PageHeader
        eyebrow="Pharmacy"
        title={`Edit ${medication.name}`}
        description={`${medication.strength} · ${medication.clinic_name}`}
      />
      <div className="max-w-3xl">
        <RecordForm
          title="Medication"
          endpoint="/api/proxy/api/pharmacy/medications/"
          fields={medicationFields()}
          record={{ ...medication }}
          redirectTo={listHref}
          allowDelete
        />
      </div>
    </div>
  );
}
