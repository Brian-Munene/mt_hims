import { PolicyListCard } from "@/components/policies/policy-list-card";
import { PageHeader } from "@/components/shared/page-header";
import { listPolicies } from "@/lib/api/policies";
import { requireUser } from "@/lib/auth";
import { assertModuleAccess } from "@/lib/rbac";

export default async function PoliciesPage() {
  const user = await requireUser();
  assertModuleAccess(user, "policies");

  const policiesResp = await listPolicies();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Policies"
        title="Clinic policies"
        description="Manage clinic policies, procedures, and compliance documents."
      />
      <PolicyListCard policies={policiesResp.results} />
    </div>
  );
}
