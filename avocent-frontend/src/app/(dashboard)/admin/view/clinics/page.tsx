import { AdminCreateButton } from "@/components/admin/admin-create-button";
import { CrudPanel } from "@/components/shared/crud-panel";
import { listClinics } from "@/lib/api/admin";
import { requireUser } from "@/lib/auth";
import { assertModuleAccess } from "@/lib/rbac";

export default async function AdminViewClinicsPage() {
  const user = await requireUser();
  assertModuleAccess(user, "admin");

  const clinics = await listClinics();

  return (
    <div className="space-y-4">
      <AdminCreateButton href="/admin/create/clinics" label="Create clinic" />
      <CrudPanel
        title="Clinic"
        description="Manage clinic records."
        endpoint="/api/proxy/api/organization/clinics/"
        initialItems={clinics.results}
        mode="manage"
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "registration_number", label: "Registration number", required: true },
          { name: "is_active", label: "Active", type: "checkbox" },
        ]}
      />
    </div>
  );
}
