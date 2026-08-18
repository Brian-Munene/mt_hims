import { browserRequest } from "@/lib/api/browser";
import { djangoRequest } from "@/lib/api/http";
import type { ApiListResponse, BillingReport, Clinic, Department, PractitionerProfile, RoleRecord, SessionUser } from "@/lib/types";

export async function listUsers() {
  return djangoRequest<ApiListResponse<SessionUser>>("/api/auth/users/", {
    query: { ordering: "-created_at" },
  });
}

export async function listPractitioners() {
  return djangoRequest<ApiListResponse<PractitionerProfile>>("/api/auth/practitioners/", {
    query: { ordering: "-created_at" },
  });
}

export async function createUser(data: Partial<SessionUser>) {
  return browserRequest<SessionUser>("/api/proxy/api/auth/users/", {
    method: "POST",
    body: data,
  });
}

export async function updateUser(id: string, data: Partial<SessionUser>) {
  return browserRequest<SessionUser>(`/api/proxy/api/auth/users/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteUser(id: string) {
  return browserRequest(`/api/proxy/api/auth/users/${id}/`, { method: "DELETE" });
}

export async function listRoles() {
  return djangoRequest<ApiListResponse<RoleRecord>>("/api/auth/roles/");
}

export async function createRole(data: Partial<RoleRecord>) {
  return browserRequest<RoleRecord>("/api/proxy/api/auth/roles/", {
    method: "POST",
    body: data,
  });
}

export async function updateRole(id: string, data: Partial<RoleRecord>) {
  return browserRequest<RoleRecord>(`/api/proxy/api/auth/roles/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteRole(id: string) {
  return browserRequest(`/api/proxy/api/auth/roles/${id}/`, { method: "DELETE" });
}

export async function listClinics() {
  return djangoRequest<ApiListResponse<Clinic>>("/api/organization/clinics/");
}

export async function createClinic(data: Partial<Clinic>) {
  return browserRequest<Clinic>("/api/proxy/api/organization/clinics/", {
    method: "POST",
    body: data,
  });
}

export async function updateClinic(id: string, data: Partial<Clinic>) {
  return browserRequest<Clinic>(`/api/proxy/api/organization/clinics/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteClinic(id: string) {
  return browserRequest(`/api/proxy/api/organization/clinics/${id}/`, { method: "DELETE" });
}

export async function listDepartments() {
  return djangoRequest<ApiListResponse<Department>>("/api/auth/departments/", {
    query: { ordering: "name" },
  });
}

export async function getBillingReport(params?: { from_date?: string; to_date?: string }) {
  return djangoRequest<BillingReport>("/api/billing/report/", { query: params });
}
