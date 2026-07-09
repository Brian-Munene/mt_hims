"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const schema = z
  .object({
    newPassword: z.string().min(8, "Use at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

interface ResetPasswordFormProps {
  uid: string | null;
  token: string | null;
}

export function ResetPasswordForm({ uid, token }: ResetPasswordFormProps) {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const missingLink = !uid || !token;

  const onSubmit = handleSubmit((values) => {
    if (missingLink) return;

    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/auth/reset-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, token, newPassword: values.newPassword }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Unable to reset your password.");
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
            Set a new password
          </CardTitle>
        </div>
        <CardDescription className="text-sm leading-6 text-slate-600">
          Choose a new password for your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {submitted ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
              Password has been reset. You can now sign in with your new password.
            </div>
            <Link href="/login" className="block text-center text-sm font-medium text-teal-700 hover:underline">
              Go to sign in
            </Link>
          </div>
        ) : missingLink ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              This reset link is missing required information. Request a new one.
            </div>
            <Link href="/forgot-password" className="block text-center text-sm font-medium text-teal-700 hover:underline">
              Request a new link
            </Link>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={onSubmit}>
            {error ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
                <Link href="/forgot-password" className="block text-center text-sm font-medium text-teal-700 hover:underline">
                  Request a new link
                </Link>
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="newPassword">
                New password
              </label>
              <Input id="newPassword" type="password" placeholder="••••••••" {...register("newPassword")} />
              {errors.newPassword ? <p className="text-sm text-rose-600">{errors.newPassword.message}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="confirmPassword">
                Confirm new password
              </label>
              <Input id="confirmPassword" type="password" placeholder="••••••••" {...register("confirmPassword")} />
              {errors.confirmPassword ? (
                <p className="text-sm text-rose-600">{errors.confirmPassword.message}</p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Resetting..." : "Reset password"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
