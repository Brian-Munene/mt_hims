"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const schema = z.object({
  email: z.email(),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/auth/forgot-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Unable to process this request.");
        return;
      }

      setSubmitted(true);
    });
  });

  return (
    <Card className="border-white/70 bg-white/85 shadow-[0_24px_80px_-38px_rgba(15,23,42,0.45)] backdrop-blur">
      <CardHeader className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">Account recovery</p>
          <CardTitle className="mt-2 font-heading text-3xl font-semibold text-slate-950">
            Reset your password
          </CardTitle>
        </div>
        <CardDescription className="text-sm leading-6 text-slate-600">
          Enter your clinic email and we&apos;ll send you a link to set a new password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {submitted ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
              If that email exists, a reset link has been sent. Check your inbox.
            </div>
            <Link href="/login" className="block text-center text-sm font-medium text-teal-700 hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={onSubmit}>
            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="email">
                Email
              </label>
              <Input id="email" placeholder="doctor@avocent.co.ke" {...register("email")} />
              {errors.email ? <p className="text-sm text-rose-600">{errors.email.message}</p> : null}
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Sending..." : "Send reset link"}
            </Button>

            <Link href="/login" className="block text-center text-sm font-medium text-slate-600 hover:underline">
              Back to sign in
            </Link>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
