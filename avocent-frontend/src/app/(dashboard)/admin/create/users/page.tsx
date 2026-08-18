import { UserCreatePanel } from "@/components/admin/user-create-panel";
import { listClinics, listRoles } from "@/lib/api/admin";
import { requireUser } from "@/lib/auth";
import { assertModuleAccess } from "@/lib/rbac";

export default async function AdminCreateUserPage() {
  const user = await requireUser();
  assertModuleAccess(user, "admin");

  const [clinics, roles] = await Promise.all([listClinics(), listRoles()]);

  // Clinic admins may only register users into their own clinic; superusers
  // (no matching clinic in the list restriction) keep the full list.
  const ownClinic = clinics.results.filter((clinic) => clinic.id === user.clinic);
  const clinicOptions = ownClinic.length ? ownClinic : clinics.results;

  return <UserCreatePanel clinics={clinicOptions} roles={roles.results} />;
}
