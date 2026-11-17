import { BackToPharmacy } from "@/components/pharmacy/back-to-pharmacy";
import { PageHeader } from "@/components/shared/page-header";
import { RecordForm } from "@/components/shared/record-form";
import { requireUser } from "@/lib/auth";
import {
  clinicQuery,
  clinicSelectField,
  first,
  medicationFields,
  resolveClinicContext,
  type SearchValue,
} from "@/lib/pharmacy-pages";
import { assertModuleAccess } from "@/lib/rbac";

export default async function NewMedicationPage({ searchParams }: { searchParams: Promise<Record<string, SearchValue>> }) {
  const [user, query] = await Promise.all([requireUser(), searchParams]);
  assertModuleAccess(user, "pharmacy");
  const clinic = await resolveClinicContext(user, first(query.clinic));
  const listHref = `/pharmacy/${clinicQuery(clinic)}`;

  return (
    <div className="space-y-6">
      <BackToPharmacy href={listHref} />
      <PageHeader eyebrow="Pharmacy" title="New medication" description="Add a medication to the clinic formulary." />
      <div className="max-w-3xl">
        <RecordForm
          title="Medication"
          endpoint="/api/proxy/api/pharmacy/medications/"
          fields={[...clinicSelectField(clinic), ...medicationFields()]}
          redirectTo={listHref}
        />
      </div>
    </div>
  );
}
