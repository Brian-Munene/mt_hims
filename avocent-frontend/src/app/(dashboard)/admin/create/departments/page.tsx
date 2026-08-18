import { CrudPanel } from "@/components/shared/crud-panel";
import { requireUser } from "@/lib/auth";
import { assertModuleAccess } from "@/lib/rbac";

export default async function AdminCreateDepartmentPage() {
  const user = await requireUser();
  assertModuleAccess(user, "admin");

  return (
    <CrudPanel
      title="Department"
      description="Create a clinic department. Practitioners can be assigned to a department."
      endpoint="/api/proxy/api/auth/departments/"
      initialItems={[]}
      mode="create"
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "code", label: "Code", required: true },
      ]}
    />
  );
}
