import { djangoRequest } from "@/lib/api/http";
import type { ApiListResponse, Policy, PolicyVersion } from "@/lib/types";

export async function listPolicies() {
  return djangoRequest<ApiListResponse<Policy>>("/api/compliance/policies/", {
    query: { ordering: "-effective_date" },
  });
}

export async function getPolicy(id: string) {
  return djangoRequest<Policy>(`/api/compliance/policies/${id}/`);
}

export async function listPolicyVersions(policyId: string) {
  return djangoRequest<ApiListResponse<PolicyVersion>>("/api/compliance/policy-versions/", {
    query: { policy: policyId, ordering: "-created_at" },
  });
}
