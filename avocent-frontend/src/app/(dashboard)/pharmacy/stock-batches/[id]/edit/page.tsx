import { BackToPharmacy } from "@/components/pharmacy/back-to-pharmacy";
import { PageHeader } from "@/components/shared/page-header";
import { RecordForm } from "@/components/shared/record-form";
import { getStockBatch, listMedications } from "@/lib/api/pharmacy";
import { requireUser } from "@/lib/auth";
import { buildMedicationOptions } from "@/lib/options";
import { clinicQuery, orNotFound, recordClinicContext, stockBatchFields } from "@/lib/pharmacy-pages";
import { assertModuleAccess } from "@/lib/rbac";

export default async function EditStockBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([requireUser(), params]);
  assertModuleAccess(user, "pharmacy");
  const batch = await orNotFound(getStockBatch(id));
  const clinic = recordClinicContext(user, batch.clinic);
  const listHref = `/pharmacy/${clinicQuery(clinic)}`;
  const medications = await listMedications(clinic.clinicParam);

  return (
    <div className="space-y-6">
      <BackToPharmacy href={listHref} />
      <PageHeader eyebrow="Pharmacy" title={`Edit batch ${batch.batch_number}`} description="Update a received medication batch." />
      <div className="max-w-3xl">
        <RecordForm
          title="Stock batch"
          endpoint="/api/proxy/api/pharmacy/stock-batches/"
          fields={stockBatchFields(buildMedicationOptions(medications.results))}
          record={{ ...batch }}
          redirectTo={listHref}
          allowDelete
        />
      </div>
    </div>
  );
}
