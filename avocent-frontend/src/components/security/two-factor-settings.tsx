"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ErrorList } from "@/components/shared/error-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BrowserApiError, browserRequest, extractApiErrors } from "@/lib/api/browser";
import type { TwoFactorSetup } from "@/lib/types";

type Step = "idle" | "confirming" | "disabling";

export function TwoFactorSettings({ initialEnabled }: { initialEnabled: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [step, setStep] = useState<Step>("idle");
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const startSetup = () => {
    setErrors([]);
    startTransition(async () => {
      try {
        const response = await browserRequest<TwoFactorSetup>("/api/proxy/api/auth/2fa/setup/", {
          method: "POST",
        });
        setSetup(response);
        setStep("confirming");
      } catch (error) {
        setErrors(error instanceof BrowserApiError ? extractApiErrors(error) : ["Unable to start setup."]);
      }
    });
  };

  const confirmSetup = () => {
    setErrors([]);
    startTransition(async () => {
      try {
        await browserRequest("/api/proxy/api/auth/2fa/enable/", { method: "POST", body: { code } });
        setEnabled(true);
        setStep("idle");
        setSetup(null);
        setCode("");
        router.refresh();
      } catch (error) {
        setErrors(error instanceof BrowserApiError ? extractApiErrors(error) : ["Unable to enable 2FA."]);
      }
    });
  };

  const confirmDisable = () => {
    setErrors([]);
    startTransition(async () => {
      try {
        await browserRequest("/api/proxy/api/auth/2fa/disable/", { method: "POST", body: { code } });
        setEnabled(false);
        setStep("idle");
        setCode("");
        router.refresh();
      } catch (error) {
        setErrors(error instanceof BrowserApiError ? extractApiErrors(error) : ["Unable to disable 2FA."]);
      }
    });
  };

  const cancel = () => {
    setErrors([]);
    setStep("idle");
    setSetup(null);
    setCode("");
  };

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="font-heading text-xl font-semibold text-slate-950">
          Two-factor authentication
        </CardTitle>
        <CardDescription className="text-sm leading-6 text-slate-600">
          {enabled
            ? "Enabled. Signing in requires a current code from your authenticator app, in addition to your password."
            : "Not enabled. Add an authenticator app (e.g. Google Authenticator, Authy) as a second sign-in step."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {errors.length ? <ErrorList errors={errors} /> : null}

        {step === "idle" && !enabled ? (
          <Button onClick={startSetup} disabled={isPending}>
            {isPending ? "Starting..." : "Enable two-factor authentication"}
          </Button>
        ) : null}

        {step === "idle" && enabled ? (
          <Button variant="destructive" onClick={() => setStep("disabling")} disabled={isPending}>
            Disable two-factor authentication
          </Button>
        ) : null}

        {step === "confirming" && setup ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800">1. Add this account to your authenticator app</p>
              <p className="text-sm text-slate-600">
                Choose &ldquo;enter a setup key manually&rdquo; and enter this secret:
              </p>
              <code className="block w-full break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                {setup.secret}
              </code>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="confirm-code">
                2. Enter the 6-digit code it shows
              </label>
              <Input
                id="confirm-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={confirmSetup} disabled={isPending || code.length !== 6}>
                {isPending ? "Confirming..." : "Confirm and enable"}
              </Button>
              <Button variant="ghost" onClick={cancel} disabled={isPending}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {step === "disabling" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="disable-code">
                Enter a current code from your authenticator app to confirm
              </label>
              <Input
                id="disable-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="destructive" onClick={confirmDisable} disabled={isPending || code.length !== 6}>
                {isPending ? "Disabling..." : "Confirm disable"}
              </Button>
              <Button variant="ghost" onClick={cancel} disabled={isPending}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
