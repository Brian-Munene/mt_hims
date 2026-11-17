import { djangoRequest } from "@/lib/api/http";
import type { ApiListResponse, Medication, Prescription, PrescriptionItem, StockBatch } from "@/lib/types";

export async function listPrescriptions(encounter?: string, clinic?: string) {
  return djangoRequest<ApiListResponse<Prescription>>("/api/pharmacy/prescriptions/", {
    query: { encounter, clinic, ordering: "-created_at" },
  });
}

export async function listPrescriptionItems(prescription?: string) {
  return djangoRequest<ApiListResponse<PrescriptionItem>>("/api/pharmacy/prescription-items/", {
    query: { prescription },
  });
}

// `clinic` is only honoured for superusers; the backend pins everyone else to
// their own clinic regardless.
export async function listMedications(clinic?: string) {
  return djangoRequest<ApiListResponse<Medication>>("/api/pharmacy/medications/", {
    query: { clinic },
  });
}

export async function listStockBatches(medication?: string, clinic?: string) {
  return djangoRequest<ApiListResponse<StockBatch>>("/api/pharmacy/stock-batches/", {
    query: { medication, clinic, ordering: "expiry_date" },
  });
}

export async function getMedication(id: string) {
  return djangoRequest<Medication>(`/api/pharmacy/medications/${id}/`);
}

export async function getStockBatch(id: string) {
  return djangoRequest<StockBatch>(`/api/pharmacy/stock-batches/${id}/`);
}

export async function getPrescription(id: string) {
  return djangoRequest<Prescription>(`/api/pharmacy/prescriptions/${id}/`);
}
