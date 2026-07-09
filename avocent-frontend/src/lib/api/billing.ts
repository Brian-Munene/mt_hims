import { browserRequest } from "@/lib/api/browser";
import { djangoRequest } from "@/lib/api/http";
import type { ApiListResponse, Invoice, Payment, ServiceCatalogue } from "@/lib/types";

export async function listInvoices() {
  return djangoRequest<ApiListResponse<Invoice>>("/api/billing/invoices/", {
    query: { ordering: "-created_at" },
  });
}

export async function createInvoice(data: Partial<Invoice>) {
  return browserRequest<Invoice>("/api/proxy/api/billing/invoices/", {
    method: "POST",
    body: data,
  });
}

export async function updateInvoice(id: string, data: Partial<Invoice>) {
  return browserRequest<Invoice>(`/api/proxy/api/billing/invoices/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteInvoice(id: string) {
  return browserRequest(`/api/proxy/api/billing/invoices/${id}/`, { method: "DELETE" });
}

export async function listPayments() {
  return djangoRequest<ApiListResponse<Payment>>("/api/billing/payments/", {
    query: { ordering: "-transaction_date" },
  });
}

export async function createPayment(data: Partial<Payment>) {
  return browserRequest<Payment>("/api/proxy/api/billing/payments/", {
    method: "POST",
    body: data,
  });
}

export async function updatePayment(id: string, data: Partial<Payment>) {
  return browserRequest<Payment>(`/api/proxy/api/billing/payments/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export async function deletePayment(id: string) {
  return browserRequest(`/api/proxy/api/billing/payments/${id}/`, { method: "DELETE" });
}

export async function listServices() {
  return djangoRequest<ApiListResponse<ServiceCatalogue>>("/api/billing/services/");
}

export async function createService(data: Partial<ServiceCatalogue>) {
  return browserRequest<ServiceCatalogue>("/api/proxy/api/billing/services/", {
    method: "POST",
    body: data,
  });
}

export async function updateService(id: string, data: Partial<ServiceCatalogue>) {
  return browserRequest<ServiceCatalogue>(`/api/proxy/api/billing/services/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteService(id: string) {
  return browserRequest(`/api/proxy/api/billing/services/${id}/`, { method: "DELETE" });
}

