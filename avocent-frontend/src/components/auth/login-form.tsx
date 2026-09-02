"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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

const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app."),
});

type FormValues = z.infer<typeof schema>;
type CodeFormValues = z.infer<typeof codeSchema>;

export function LoginForm() {
  const router = useRouter();
  const globalError = useUiStore((state) => state.globalError);
  const setGlobalError = useUiStore((state) => state.setGlobalError);
  const [isPending, startTransition] = useTransition();
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
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
  const {
    register: registerCode,
    handleSubmit: handleCodeSubmit,
    formState: { errors: codeErrors },
  } = useForm<CodeFormValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setGlobalError(null);
    startTransition(async () => {
      const response = await fetch("/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; two_factor_required?: boolean; challenge_token?: string }
        | null;

      if (!response.ok) {
        setGlobalError(payload?.error ?? "Unable to sign you in.");
        return;
      }

      if (payload?.two_factor_required && payload.challenge_token) {
        setChallengeToken(payload.challenge_token);
        return;
      }

      router.push("/");
      router.refresh();
    });
  });

  const onCodeSubmit = handleCodeSubmit((values) => {
    setGlobalError(null);
    startTransition(async () => {
      const response = await fetch("/api/auth/verify-2fa/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_token: challengeToken, code: values.code }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setGlobalError(payload?.error ?? "That code didn't work.");
        return;
      }

      router.push("/");
      router.refresh();
    });
  });

  if (challengeToken) {
    return (
      <Card className="border-white/70 bg-white/85 shadow-[0_24px_80px_-38px_rgba(15,23,42,0.45)] backdrop-blur">
        <CardHeader className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">Secure access</p>
            <CardTitle className="mt-2 font-heading text-3xl font-semibold text-slate-950">
              Enter your code
            </CardTitle>
          </div>
          <CardDescription className="text-sm leading-6 text-slate-600">
            Open your authenticator app and enter the current 6-digit code for this account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={onCodeSubmit}>
            {globalError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {globalError}
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="code">
                Authentication code
              </label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                {...registerCode("code")}
              />
              {codeErrors.code ? <p className="text-sm text-rose-600">{codeErrors.code.message}</p> : null}
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Verifying..." : "Verify and sign in"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={isPending}
              onClick={() => {
                setGlobalError(null);
                setChallengeToken(null);
              }}
            >
              Back to sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

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
