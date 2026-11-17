import { BackToPharmacy } from "@/components/pharmacy/back-to-pharmacy";
import { PrescriptionForm } from "@/components/pharmacy/prescription-form";
import { PageHeader } from "@/components/shared/page-header";
import { listPractitioners, listUsers } from "@/lib/api/admin";
import { listEncounters } from "@/lib/api/encounters";
import { listMedications } from "@/lib/api/pharmacy";
import { requireUser } from "@/lib/auth";
import { buildEncounterOptions, buildPractitionerOptions } from "@/lib/options";
import { clinicQuery, first, resolveClinicContext, type SearchValue } from "@/lib/pharmacy-pages";
import { assertModuleAccess, hasAnyRole } from "@/lib/rbac";

export default async function NewPrescriptionPage({ searchParams }: { searchParams: Promise<Record<string, SearchValue>> }) {
  const [user, query] = await Promise.all([requireUser(), searchParams]);
  assertModuleAccess(user, "pharmacy");
  const isAdmin = hasAnyRole(user, ["Admin"]);
  const clinic = await resolveClinicContext(user, first(query.clinic));
  const listHref = `/pharmacy/${clinicQuery(clinic)}`;

  const [medications, encounters, practitioners, users] = await Promise.all([
    listMedications(clinic.clinicParam),
    listEncounters({ ordering: "-start_time", clinic: clinic.clinicParam }),
    listPractitioners(clinic.clinicParam),
    isAdmin ? listUsers() : Promise.resolve({ results: [], count: 0, next: null, previous: null }),
  ]);
  const userById = new Map(users.results.map((u) => [u.id, u]));

  return (
    <div className="space-y-6">
      <BackToPharmacy href={listHref} />
      <PageHeader
        eyebrow="Pharmacy"
        title="New prescription"
        description="Create a prescription with medication items and review the controlled substance warning before dispensing."
      />
      <PrescriptionForm
        medications={medications.results}
        practitionerOptions={buildPractitionerOptions(practitioners.results, userById)}
        encounterOptions={buildEncounterOptions(encounters.results)}
        clinicOptions={clinic.clinicOptions}
        defaultClinic={clinic.clinicId}
        redirectTo={listHref}
      />
    </div>
  );
}
