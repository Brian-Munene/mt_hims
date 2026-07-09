import { browserRequest } from "@/lib/api/browser";
import { djangoRequest } from "@/lib/api/http";
import type { ApiListResponse, ClinicalNote, Diagnosis, Observation } from "@/lib/types";

export async function listClinicalNotes(encounter?: string) {
  return djangoRequest<ApiListResponse<ClinicalNote>>("/api/clinical/notes/", {
    query: { encounter },
  });
}

export async function getClinicalNote(id: string) {
  return djangoRequest<ClinicalNote>(`/api/clinical/notes/${id}/`);
}

export async function createClinicalNote(data: Partial<ClinicalNote>) {
  return browserRequest<ClinicalNote>("/api/proxy/api/clinical/notes/", {
    method: "POST",
    body: data,
  });
}

export async function updateClinicalNote(id: string, data: Partial<ClinicalNote>) {
  return browserRequest<ClinicalNote>(`/api/proxy/api/clinical/notes/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteClinicalNote(id: string) {
  return browserRequest(`/api/proxy/api/clinical/notes/${id}/`, { method: "DELETE" });
}

export async function listDiagnoses(encounter?: string) {
  return djangoRequest<ApiListResponse<Diagnosis>>("/api/clinical/diagnoses/", {
    query: { encounter },
  });
}

export async function getDiagnosis(id: string) {
  return djangoRequest<Diagnosis>(`/api/clinical/diagnoses/${id}/`);
}

export async function createDiagnosis(data: Partial<Diagnosis>) {
  return browserRequest<Diagnosis>("/api/proxy/api/clinical/diagnoses/", {
    method: "POST",
    body: data,
  });
}

export async function updateDiagnosis(id: string, data: Partial<Diagnosis>) {
  return browserRequest<Diagnosis>(`/api/proxy/api/clinical/diagnoses/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteDiagnosis(id: string) {
  return browserRequest(`/api/proxy/api/clinical/diagnoses/${id}/`, { method: "DELETE" });
}

export async function listObservations(encounter?: string) {
  return djangoRequest<ApiListResponse<Observation>>("/api/clinical/observations/", {
    query: { encounter },
  });
}

export async function getObservation(id: string) {
  return djangoRequest<Observation>(`/api/clinical/observations/${id}/`);
}

export async function createObservation(data: Partial<Observation>) {
  return browserRequest<Observation>("/api/proxy/api/clinical/observations/", {
    method: "POST",
    body: data,
  });
}

export async function updateObservation(id: string, data: Partial<Observation>) {
  return browserRequest<Observation>(`/api/proxy/api/clinical/observations/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteObservation(id: string) {
  return browserRequest(`/api/proxy/api/clinical/observations/${id}/`, { method: "DELETE" });
}

