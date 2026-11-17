import { BackToPharmacy } from "@/components/pharmacy/back-to-pharmacy";
import { PageHeader } from "@/components/shared/page-header";
import { RecordForm } from "@/components/shared/record-form";
import { listPractitioners, listUsers } from "@/lib/api/admin";
import { getPrescription } from "@/lib/api/pharmacy";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { buildPractitionerOptions } from "@/lib/options";
import { clinicQuery, orNotFound, prescriptionEditFields, recordClinicContext } from "@/lib/pharmacy-pages";
import { assertModuleAccess, hasAnyRole } from "@/lib/rbac";

export default async function EditPrescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([requireUser(), params]);
  assertModuleAccess(user, "pharmacy");
  const isAdmin = hasAnyRole(user, ["Admin"]);
  const prescription = await orNotFound(getPrescription(id));
  const clinic = recordClinicContext(user, prescription.clinic);
  const listHref = `/pharmacy/${clinicQuery(clinic)}`;

  const [practitioners, users] = await Promise.all([
    listPractitioners(clinic.clinicParam),
    isAdmin ? listUsers() : Promise.resolve({ results: [], count: 0, next: null, previous: null }),
  ]);
  const userById = new Map(users.results.map((u) => [u.id, u]));

  return (
    <div className="space-y-6">
      <BackToPharmacy href={listHref} />
      <PageHeader
        eyebrow="Pharmacy"
        title="Edit prescription"
        description={`Created ${formatDate(prescription.created_at)}. Update the prescriber, status or signature.`}
      />
      <div className="max-w-3xl">
        <RecordForm
          title="Prescription"
          endpoint="/api/proxy/api/pharmacy/prescriptions/"
          fields={prescriptionEditFields(buildPractitionerOptions(practitioners.results, userById))}
          record={{ ...prescription }}
          redirectTo={listHref}
          allowDelete
        />
      </div>
    </div>
  );
}
