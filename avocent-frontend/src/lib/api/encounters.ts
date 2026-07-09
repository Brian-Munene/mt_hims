import { djangoRequest } from "@/lib/api/http";
import type { ApiListResponse, Appointment, AvailabilitySlot, Encounter } from "@/lib/types";

export async function listAppointments(params?: {
  patient?: string;
  practitioner?: string;
  status?: string;
  encounter_type?: string;
  ordering?: string;
}) {
  return djangoRequest<ApiListResponse<Appointment>>("/api/encounters/appointments/", {
    query: { ordering: params?.ordering ?? "-scheduled_time", ...params },
  });
}

export async function listAvailabilitySlots(params?: { practitioner?: string; day_of_week?: number }) {
  return djangoRequest<ApiListResponse<AvailabilitySlot>>("/api/encounters/availability-slots/", {
    query: { ordering: "day_of_week,start_time", ...params },
  });
}

export async function listEncounters(params?: {
  search?: string;
  status?: string;
  encounter_type?: string;
  ordering?: string;
}) {
  return djangoRequest<ApiListResponse<Encounter>>("/api/encounters/encounters/", {
    query: { ordering: params?.ordering ?? "-start_time", ...params },
  });
}

export async function getEncounter(id: string) {
  return djangoRequest<Encounter>(`/api/encounters/encounters/${id}/`);
}
