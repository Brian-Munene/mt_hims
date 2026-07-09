import { browserRequest } from "@/lib/api/browser";
import type { Medication, Prescription, PrescriptionItem } from "@/lib/types";

export async function createPrescription(data: Partial<Prescription>) {
  return browserRequest<Prescription>("/api/proxy/api/pharmacy/prescriptions/", {
    method: "POST",
    body: data,
  });
}

export async function updatePrescription(id: string, data: Partial<Prescription>) {
  return browserRequest<Prescription>(`/api/proxy/api/pharmacy/prescriptions/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export async function deletePrescription(id: string) {
  return browserRequest(`/api/proxy/api/pharmacy/prescriptions/${id}/`, { method: "DELETE" });
}

export async function createPrescriptionItem(data: Partial<PrescriptionItem>) {
  return browserRequest<PrescriptionItem>("/api/proxy/api/pharmacy/prescription-items/", {
    method: "POST",
    body: data,
  });
}

export async function updatePrescriptionItem(id: string, data: Partial<PrescriptionItem>) {
  return browserRequest<PrescriptionItem>(`/api/proxy/api/pharmacy/prescription-items/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export async function deletePrescriptionItem(id: string) {
  return browserRequest(`/api/proxy/api/pharmacy/prescription-items/${id}/`, { method: "DELETE" });
}

export async function createMedication(data: Partial<Medication>) {
  return browserRequest<Medication>("/api/proxy/api/pharmacy/medications/", {
    method: "POST",
    body: data,
  });
}

export async function updateMedication(id: string, data: Partial<Medication>) {
  return browserRequest<Medication>(`/api/proxy/api/pharmacy/medications/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteMedication(id: string) {
  return browserRequest(`/api/proxy/api/pharmacy/medications/${id}/`, { method: "DELETE" });
}
