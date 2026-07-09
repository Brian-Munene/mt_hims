"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { pollNotifications } from "@/lib/api/notifications";
import { useNotificationStore } from "@/stores/notification-store";
import { formatRelative } from "@/lib/format";

const POLL_INTERVAL_MS = 30_000;

export function NotificationBell() {
  const { notifications, unreadCount, addNotification, markRead, markAllRead } =
    useNotificationStore();

  useEffect(() => {
    let lastSeen: string | undefined = useNotificationStore.getState().notifications[0]?.createdAt;

    async function poll() {
      const incoming = await pollNotifications(lastSeen);
      if (incoming.length) {
        lastSeen = incoming[0].createdAt;
        for (const n of incoming) addNotification(n);
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [addNotification]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="relative inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white/60 text-slate-600 hover:bg-white hover:text-slate-950"
            aria-label="Notifications"
          />
        }
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0 text-sm font-semibold text-slate-900">
            Notifications
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs text-teal-600 hover:text-teal-800"
            >
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-slate-400">No notifications</p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onClick={() => markRead(n.id)}
                className="flex flex-col items-start gap-0.5 px-2 py-2"
              >
                {n.href ? (
                  <Link href={n.href} className="w-full">
                    <NotificationContent n={n} />
                  </Link>
                ) : (
                  <NotificationContent n={n} />
                )}
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationContent({
  n,
}: {
  n: { title: string; body: string; read: boolean; createdAt: string };
}) {
  return (
    <>
      <div className="flex w-full items-center justify-between gap-2">
        <span className={`text-sm font-medium ${n.read ? "text-slate-600" : "text-slate-950"}`}>
          {n.title}
        </span>
        {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-teal-500" />}
      </div>
      <span className="text-xs text-slate-500 line-clamp-2">{n.body}</span>
      <span className="text-[10px] text-slate-400">{formatRelative(n.createdAt)}</span>
    </>
  );
}
