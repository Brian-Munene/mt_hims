import { djangoRequest } from "@/lib/api/http";
import type { ApiListResponse, Medication, Prescription, PrescriptionItem, StockBatch } from "@/lib/types";

export async function listPrescriptions(encounter?: string) {
  return djangoRequest<ApiListResponse<Prescription>>("/api/pharmacy/prescriptions/", {
    query: { encounter, ordering: "-created_at" },
  });
}

export async function listPrescriptionItems(prescription?: string) {
  return djangoRequest<ApiListResponse<PrescriptionItem>>("/api/pharmacy/prescription-items/", {
    query: { prescription },
  });
}

export async function listMedications() {
  return djangoRequest<ApiListResponse<Medication>>("/api/pharmacy/medications/");
}

export async function listStockBatches(medication?: string) {
  return djangoRequest<ApiListResponse<StockBatch>>("/api/pharmacy/stock-batches/", {
    query: { medication, ordering: "expiry_date" },
  });
}
