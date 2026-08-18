import { AdminCreateButton } from "@/components/admin/admin-create-button";
import { CrudPanel } from "@/components/shared/crud-panel";
import { listRoles } from "@/lib/api/admin";
import { requireUser } from "@/lib/auth";
import { assertModuleAccess } from "@/lib/rbac";

export default async function AdminViewRolesPage() {
  const user = await requireUser();
  assertModuleAccess(user, "admin");

  const roles = await listRoles();

  return (
    <div className="space-y-4">
      <AdminCreateButton href="/admin/create/roles" label="Create role" />
      <CrudPanel
        title="Role"
        description="Manage RBAC roles."
        endpoint="/api/proxy/api/auth/roles/"
        initialItems={roles.results}
        mode="manage"
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "description", label: "Description", type: "textarea", required: true },
          { name: "is_active", label: "Active", type: "checkbox" },
        ]}
      />
    </div>
  );
}
