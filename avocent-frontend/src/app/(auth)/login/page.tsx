import { AlertTriangle, ShieldCheck } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.2),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.18),_transparent_30%),linear-gradient(135deg,_#ecfeff_0%,_#f8fafc_45%,_#eef2ff_100%)] px-4 py-10">
      <div className="absolute inset-0 surface-grid opacity-60" />
      <div className="relative grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/70 bg-slate-950/90 text-white shadow-[0_24px_80px_-34px_rgba(15,23,42,0.7)]">
          <CardContent className="flex h-full flex-col justify-between gap-10 p-8 md:p-10">
            <div className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-300">Clinic-first platform</p>
              <div className="space-y-4">
                <h1 className="font-heading text-4xl leading-tight md:text-5xl">
                  Clinical operations that keep PHI on the server side.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-300">
                  This frontend uses Next.js as a secure BFF layer for Django, with httpOnly JWT cookies, server-side data fetching, and role-aware route protection.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <ShieldCheck className="mb-4 size-6 text-teal-300" />
                <h2 className="text-lg font-semibold">Server-protected access</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Tokens stay in httpOnly cookies and clinical pages render on the server before data reaches the browser.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <AlertTriangle className="mb-4 size-6 text-amber-300" />
                <h2 className="text-lg font-semibold">Role-aware workflows</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Receptionists, pharmacists, lab technicians, nurses, doctors, and admins land in views tailored to their permissions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}

