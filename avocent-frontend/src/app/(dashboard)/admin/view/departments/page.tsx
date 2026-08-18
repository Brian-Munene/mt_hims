import { AdminCreateButton } from "@/components/admin/admin-create-button";
import { CrudPanel } from "@/components/shared/crud-panel";
import { listDepartments } from "@/lib/api/admin";
import { requireUser } from "@/lib/auth";
import { assertModuleAccess } from "@/lib/rbac";

export default async function AdminViewDepartmentsPage() {
  const user = await requireUser();
  assertModuleAccess(user, "admin");

  const departments = await listDepartments();

  return (
    <div className="space-y-4">
      <AdminCreateButton href="/admin/create/departments" label="Create department" />
      <CrudPanel
        title="Department"
        description="Manage clinic departments. Practitioners can be assigned to a department."
        endpoint="/api/proxy/api/auth/departments/"
        initialItems={departments.results}
        mode="manage"
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "code", label: "Code", required: true },
        ]}
      />
    </div>
  );
}
