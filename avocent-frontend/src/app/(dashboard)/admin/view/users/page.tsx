import { AdminCreateButton } from "@/components/admin/admin-create-button";
import { UserListPanel } from "@/components/admin/user-list-panel";
import { listClinics, listUsers } from "@/lib/api/admin";
import { requireUser } from "@/lib/auth";
import { assertModuleAccess } from "@/lib/rbac";

export default async function AdminViewUsersPage() {
  const user = await requireUser();
  assertModuleAccess(user, "admin");

  const [users, clinics] = await Promise.all([listUsers(), listClinics()]);

  return (
    <div className="space-y-4">
      <AdminCreateButton href="/admin/create/users" label="Create user" />
      <UserListPanel initialUsers={users.results} clinics={clinics.results} />
    </div>
  );
}
