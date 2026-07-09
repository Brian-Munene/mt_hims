import { browserRequest } from "@/lib/api/browser";
import type { Policy } from "@/lib/types";

export async function createPolicy(data: Partial<Policy>) {
  return browserRequest<Policy>("/api/proxy/api/compliance/policies/", {
    method: "POST",
    body: data,
  });
}

export async function updatePolicy(id: string, data: Partial<Policy>) {
  return browserRequest<Policy>(`/api/proxy/api/compliance/policies/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export async function deletePolicy(id: string) {
  return browserRequest(`/api/proxy/api/compliance/policies/${id}/`, { method: "DELETE" });
}
