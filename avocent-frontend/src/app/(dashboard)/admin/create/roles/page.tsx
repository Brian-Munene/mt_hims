import { CrudPanel } from "@/components/shared/crud-panel";
import { requireUser } from "@/lib/auth";
import { assertModuleAccess } from "@/lib/rbac";

export default async function AdminCreateRolePage() {
  const user = await requireUser();
  assertModuleAccess(user, "admin");

  return (
    <CrudPanel
      title="Role"
      description="Create an RBAC role."
      endpoint="/api/proxy/api/auth/roles/"
      initialItems={[]}
      mode="create"
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "description", label: "Description", type: "textarea", required: true },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
    />
  );
}
