import { djangoRequest } from "@/lib/api/http";
import type { ApiListResponse, AuditLog, ComplianceRecord } from "@/lib/types";

export async function listComplianceRecords() {
  return djangoRequest<ApiListResponse<ComplianceRecord>>("/api/compliance/records/", {
    query: { ordering: "-created_at" },
  });
}

export async function listAuditLogs() {
  return djangoRequest<ApiListResponse<AuditLog>>("/api/audit/logs/", {
    query: { ordering: "-created_at" },
  });
}

export async function getAuditLog(id: string) {
  return djangoRequest<AuditLog>(`/api/audit/logs/${id}/`);
}
