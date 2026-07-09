import { browserRequest } from "@/lib/api/browser";
import type { ComplianceRecord } from "@/lib/types";

export async function createComplianceRecord(data: Partial<ComplianceRecord>) {
  return browserRequest<ComplianceRecord>("/api/proxy/api/compliance/records/", {
    method: "POST",
    body: data,
  });
}

export async function updateComplianceRecord(id: string, data: Partial<ComplianceRecord>) {
  return browserRequest<ComplianceRecord>(`/api/proxy/api/compliance/records/${id}/`, {
    method: "PATCH",
    body: data,
  });
}
