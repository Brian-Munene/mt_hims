import { browserRequest } from "@/lib/api/browser";
import type { Encounter } from "@/lib/types";

export async function createEncounter(data: Partial<Encounter>) {
  return browserRequest<Encounter>("/api/proxy/api/encounters/encounters/", {
    method: "POST",
    body: data,
  });
}

export async function updateEncounter(id: string, data: Partial<Encounter>) {
  return browserRequest<Encounter>(`/api/proxy/api/encounters/encounters/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteEncounter(id: string) {
  return browserRequest<void>(`/api/proxy/api/encounters/encounters/${id}/`, {
    method: "DELETE",
  });
}
