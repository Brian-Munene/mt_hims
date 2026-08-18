import { CrudPanel } from "@/components/shared/crud-panel";
import { requireUser } from "@/lib/auth";
import { assertModuleAccess } from "@/lib/rbac";

export default async function AdminCreateClinicPage() {
  const user = await requireUser();
  assertModuleAccess(user, "admin");

  return (
    <CrudPanel
      title="Clinic"
      description="Create a clinic record."
      endpoint="/api/proxy/api/organization/clinics/"
      initialItems={[]}
      mode="create"
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "registration_number", label: "Registration number", required: true },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
    />
  );
}
