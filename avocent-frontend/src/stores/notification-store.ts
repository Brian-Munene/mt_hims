"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  href?: string;
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Notification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (n) =>
        set((state) => {
          if (state.notifications.some((existing) => existing.id === n.id)) {
            return state;
          }
          return {
            notifications: [n, ...state.notifications].slice(0, 50),
            unreadCount: state.unreadCount + (n.read ? 0 : 1),
          };
        }),

      markRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
          unreadCount: Math.max(
            0,
            state.unreadCount - (state.notifications.find((n) => n.id === id && !n.read) ? 1 : 0),
          ),
        })),

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),
    }),
    {
      name: "avocent-notifications",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
