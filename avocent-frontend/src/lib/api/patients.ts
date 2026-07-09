import { djangoRequest } from "@/lib/api/http";
import type {
  Allergy,
  ApiListResponse,
  ChronicCondition,
  ClinicalNote,
  Encounter,
  Patient,
  PatientAlert,
  PatientDocument,
  PatientIdentifier,
} from "@/lib/types";

interface PatientListFilters {
  search?: string;
  gender?: string;
  is_active?: string;
  ordering?: string;
}

interface PatientResourceFilters {
  patient?: string;
  search?: string;
  ordering?: string;
  is_active?: string;
  identifier_type?: string;
  severity?: string;
}

export async function listPatients(filters: PatientListFilters = {}) {
  return djangoRequest<ApiListResponse<Patient>>("/api/patients/patients/", {
    query: {
      search: filters.search,
      gender: filters.gender,
      is_active: filters.is_active,
      ordering: filters.ordering ?? "first_name",
    },
  });
}

export async function getPatient(id: string) {
  return djangoRequest<Patient>(`/api/patients/patients/${id}/`);
}

export async function listPatientEncounters(id: string) {
  return djangoRequest<ApiListResponse<Encounter>>(`/api/patients/patients/${id}/encounters/`);
}

export async function listPatientNotes(id: string) {
  return djangoRequest<ApiListResponse<ClinicalNote>>(`/api/patients/patients/${id}/notes/`);
}

export async function listPatientIdentifiers(filters: PatientResourceFilters = {}) {
  return djangoRequest<ApiListResponse<PatientIdentifier>>("/api/patients/identifiers/", {
    query: {
      patient: filters.patient,
      identifier_type: filters.identifier_type,
      search: filters.search,
      is_active: filters.is_active,
      ordering: filters.ordering ?? "-created_at",
    },
  });
}

export async function listPatientAllergies(filters: PatientResourceFilters = {}) {
  return djangoRequest<ApiListResponse<Allergy>>("/api/patients/allergies/", {
    query: {
      patient: filters.patient,
      severity: filters.severity,
      search: filters.search,
      is_active: filters.is_active,
      ordering: filters.ordering ?? "-created_at",
    },
  });
}

export async function listPatientChronicConditions(filters: PatientResourceFilters = {}) {
  return djangoRequest<ApiListResponse<ChronicCondition>>("/api/patients/chronic-conditions/", {
    query: {
      patient: filters.patient,
      search: filters.search,
      is_active: filters.is_active,
      ordering: filters.ordering ?? "-diagnosed_date",
    },
  });
}

export async function listPatientDocuments(patientId: string) {
  return djangoRequest<ApiListResponse<PatientDocument>>("/api/patients/documents/", {
    query: { patient: patientId, ordering: "-created_at" },
  });
}

export async function listPatientAlerts(patientId: string) {
  return djangoRequest<ApiListResponse<PatientAlert>>("/api/patients/alerts/", {
    query: { patient: patientId, is_active: "true", ordering: "-created_at" },
  });
}
