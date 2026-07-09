import { browserRequest } from "@/lib/api/browser";
import { djangoRequest } from "@/lib/api/http";
import type { ApiListResponse, ChatSessionState, TelemedicineSession } from "@/lib/types";

export async function listTelemedicineSessions() {
  return djangoRequest<ApiListResponse<TelemedicineSession>>("/api/telemedicine/sessions/", {
    query: { ordering: "-start_time" },
  });
}

export async function createTelemedicineSession(data: Partial<TelemedicineSession>) {
  return browserRequest<TelemedicineSession>("/api/proxy/api/telemedicine/sessions/", {
    method: "POST",
    body: data,
  });
}

export async function updateTelemedicineSession(id: string, data: Partial<TelemedicineSession>) {
  return browserRequest<TelemedicineSession>(`/api/proxy/api/telemedicine/sessions/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteTelemedicineSession(id: string) {
  return browserRequest(`/api/proxy/api/telemedicine/sessions/${id}/`, { method: "DELETE" });
}

export async function listChatStates() {
  return djangoRequest<ApiListResponse<ChatSessionState>>("/api/telemedicine/chat-states/", {
    query: { ordering: "-last_interaction_at" },
  });
}

export async function createChatState(data: Partial<ChatSessionState>) {
  return browserRequest<ChatSessionState>("/api/proxy/api/telemedicine/chat-states/", {
    method: "POST",
    body: data,
  });
}

export async function updateChatState(id: string, data: Partial<ChatSessionState>) {
  return browserRequest<ChatSessionState>(`/api/proxy/api/telemedicine/chat-states/${id}/`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteChatState(id: string) {
  return browserRequest(`/api/proxy/api/telemedicine/chat-states/${id}/`, { method: "DELETE" });
}

