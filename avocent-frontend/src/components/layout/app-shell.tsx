"use client";

import { Menu } from "lucide-react";

import { NotificationBell } from "@/components/layout/notification-bell";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { SessionUser } from "@/lib/types";

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.18),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(148,163,184,0.18),_transparent_24%),linear-gradient(180deg,_#f7fbfb_0%,_#f8fafc_100%)]">
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 gap-6 p-4 md:p-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden rounded-[2rem] border border-white/70 bg-white/70 p-5 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.45)] backdrop-blur xl:flex xl:flex-col">
          <div className="border-b border-slate-200/80 pb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">Clinic OS</p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-slate-950">Avocent Health Centre</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Secure clinical, billing, pharmacy, laboratory, and telemedicine workflows in one shell.
            </p>
          </div>

          <div className="mt-6 flex-1">
            <SidebarNav user={user} />
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Signed in</p>
            <p className="mt-2 font-medium text-slate-900">{user.email}</p>
            <p className="mt-1 text-sm text-slate-500">{user.role_names.join(" • ")}</p>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col gap-4">
          <header className="sticky top-4 z-20 flex items-center justify-between rounded-[1.75rem] border border-white/70 bg-white/75 px-4 py-3 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger
                  className="inline-flex xl:hidden"
                  render={
                    <Button size="icon" variant="outline" className="xl:hidden" />
                  }
                >
                    <Menu className="size-4" />
                </SheetTrigger>
                <SheetContent side="left" className="w-[310px] border-slate-200 bg-[#f8fafc]">
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">Clinic OS</p>
                      <h2 className="mt-2 font-heading text-2xl font-semibold text-slate-950">Avocent Health Centre</h2>
                    </div>
                    <SidebarNav user={user} compact />
                  </div>
                </SheetContent>
              </Sheet>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Protected dashboard</p>
                <h1 className="font-heading text-xl font-semibold text-slate-950 md:text-2xl">Operational overview</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell />
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-slate-900">{user.email}</p>
                <p className="text-xs text-slate-500">{user.role_names.join(", ")}</p>
              </div>
              <Avatar className="border border-slate-200 bg-slate-100">
                <AvatarFallback className="bg-slate-950 text-white">
                  {user.email.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          <main className="flex-1 rounded-[2rem] border border-white/70 bg-white/70 p-5 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.2)] backdrop-blur md:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
