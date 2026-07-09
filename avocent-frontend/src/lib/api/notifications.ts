import type { Notification } from "@/stores/notification-store";

export async function pollNotifications(since?: string): Promise<Notification[]> {
  try {
    const url = since
      ? `/api/proxy/api/notifications/?since=${encodeURIComponent(since)}`
      : "/api/proxy/api/notifications/";
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: Notification[] };
    return data.results ?? [];
  } catch {
    return [];
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  try {
    await fetch(`/api/proxy/api/notifications/${id}/read/`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Fail silently — local store already updated
  }
}
