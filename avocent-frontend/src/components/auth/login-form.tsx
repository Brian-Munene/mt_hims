"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUiStore } from "@/stores/ui-store";

const schema = z.object({
  email: z.email(),
  password: z.string().min(6, "Use at least 6 characters."),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const globalError = useUiStore((state) => state.globalError);
  const setGlobalError = useUiStore((state) => state.setGlobalError);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    setGlobalError(null);
    startTransition(async () => {
      const response = await fetch("/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setGlobalError(payload?.error ?? "Unable to sign you in.");
        return;
      }

      router.push("/");
      router.refresh();
    });
  });

  return (
    <Card className="border-white/70 bg-white/85 shadow-[0_24px_80px_-38px_rgba(15,23,42,0.45)] backdrop-blur">
      <CardHeader className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">Secure access</p>
          <CardTitle className="mt-2 font-heading text-3xl font-semibold text-slate-950">
            Staff sign in
          </CardTitle>
        </div>
        <CardDescription className="text-sm leading-6 text-slate-600">
          Use your clinic email and password. JWT tokens are stored in httpOnly cookies and never exposed to browser JavaScript.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={onSubmit}>
          {globalError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {globalError}
            </div>
          ) : null}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800" htmlFor="email">
              Email
            </label>
            <Input id="email" placeholder="doctor@avocent.co.ke" {...register("email")} />
            {errors.email ? <p className="text-sm text-rose-600">{errors.email.message}</p> : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-800" htmlFor="password">
                Password
              </label>
              <Link href="/forgot-password" className="text-sm font-medium text-teal-700 hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
            {errors.password ? <p className="text-sm text-rose-600">{errors.password.message}</p> : null}
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Signing in..." : "Sign in to clinic dashboard"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
