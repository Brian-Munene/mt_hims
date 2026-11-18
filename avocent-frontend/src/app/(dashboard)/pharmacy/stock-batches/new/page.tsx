import { BackToPharmacy } from "@/components/pharmacy/back-to-pharmacy";
import { PageHeader } from "@/components/shared/page-header";
import { RecordForm } from "@/components/shared/record-form";
import { listMedications } from "@/lib/api/pharmacy";
import { requireUser } from "@/lib/auth";
import { buildMedicationOptions } from "@/lib/options";
import {
  clinicQuery,
  clinicSelectField,
  first,
  resolveClinicContext,
  stockBatchFields,
  type SearchValue,
} from "@/lib/pharmacy-pages";
import { assertModuleAccess } from "@/lib/rbac";

export default async function NewStockBatchPage({ searchParams }: { searchParams: Promise<Record<string, SearchValue>> }) {
  const [user, query] = await Promise.all([requireUser(), searchParams]);
  assertModuleAccess(user, "pharmacy");
  const clinic = await resolveClinicContext(user, first(query.clinic));
  const listHref = `/pharmacy/${clinicQuery(clinic)}`;
  const medications = await listMedications(clinic.clinicParam);

  return (
    <div className="space-y-6">
      <BackToPharmacy href={listHref} />
      <PageHeader eyebrow="Pharmacy" title="New stock batch" description="Record a received batch of medication." />
      <div className="max-w-3xl">
        <RecordForm
          title="Stock batch"
          description={
            clinic.clinicOptions.length
              ? "Medications listed are from the clinic you were viewing; the batch must be in the same clinic as its medication."
              : undefined
          }
          endpoint="/api/proxy/api/pharmacy/stock-batches/"
          fields={[...clinicSelectField(clinic), ...stockBatchFields(buildMedicationOptions(medications.results))]}
          redirectTo={listHref}
        />
      </div>
    </div>
  );
}
