import { browserRequest } from "@/lib/api/browser";
import { djangoRequest } from "@/lib/api/http";
import type { ApiListResponse, LabOrder, LabOrderItem, LabResult, LabTest } from "@/lib/types";

export async function listLabOrders(encounter?: string) {
  return djangoRequest<ApiListResponse<LabOrder>>("/api/laboratory/orders/", {
    query: { encounter, ordering: "-created_at" },
  });
}

export async function createLabOrder(data: Partial<LabOrder>) {
  return browserRequest<LabOrder>("/api/proxy/api/laboratory/orders/", {
    method: "POST",
    body: data,
  });
}

export async function updateLabOrder(id: string, data: Partial<LabOrder>) {
  return browserRequest<LabOrder>(`/api/proxy/api/laboratory/orders/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteLabOrder(id: string) {
  return browserRequest(`/api/proxy/api/laboratory/orders/${id}/`, { method: "DELETE" });
}

export async function listLabResults() {
  return djangoRequest<ApiListResponse<LabResult>>("/api/laboratory/results/");
}

export async function listLabOrderItems(labOrder?: string) {
  return djangoRequest<ApiListResponse<LabOrderItem>>("/api/laboratory/order-items/", {
    query: { lab_order: labOrder, ordering: "-created_at" },
  });
}

export async function createLabResult(data: Partial<LabResult>) {
  return browserRequest<LabResult>("/api/proxy/api/laboratory/results/", {
    method: "POST",
    body: data,
  });
}

export async function updateLabResult(id: string, data: Partial<LabResult>) {
  return browserRequest<LabResult>(`/api/proxy/api/laboratory/results/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteLabResult(id: string) {
  return browserRequest(`/api/proxy/api/laboratory/results/${id}/`, { method: "DELETE" });
}

export async function listLabTests() {
  return djangoRequest<ApiListResponse<LabTest>>("/api/laboratory/tests/");
}

export async function createLabTest(data: Partial<LabTest>) {
  return browserRequest<LabTest>("/api/proxy/api/laboratory/tests/", {
    method: "POST",
    body: data,
  });
}

export async function updateLabTest(id: string, data: Partial<LabTest>) {
  return browserRequest<LabTest>(`/api/proxy/api/laboratory/tests/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteLabTest(id: string) {
  return browserRequest(`/api/proxy/api/laboratory/tests/${id}/`, { method: "DELETE" });
}
