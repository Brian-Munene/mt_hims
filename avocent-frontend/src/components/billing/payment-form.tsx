"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { ErrorList } from "@/components/shared/error-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BrowserApiError, browserRequest, flattenValidationErrors } from "@/lib/api/browser";
import type { Invoice, Payment } from "@/lib/types";

const paymentSchema = z.object({
  invoice: z.string().min(1, "Invoice is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  payment_method: z.enum(["mpesa", "cash", "card"]),
  phone_number: z.string().optional(),
  mpesa_receipt_number: z.string().optional(),
  status: z.enum(["pending", "successful", "failed"]),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  invoices: Invoice[];
}

export function PaymentForm({ invoices }: PaymentFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<PaymentFormData>({
    invoice: "",
    amount: 0,
    payment_method: "cash",
    phone_number: "",
    mpesa_receipt_number: "",
    status: "pending",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const isMpesa = formData.payment_method === "mpesa";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const result = paymentSchema.safeParse(formData);
    if (!result.success) {
      setErrors(result.error.issues.map((i) => i.message));
      return;
    }

    startTransition(async () => {
      try {
        const payload: Partial<Payment> = {
          invoice: result.data.invoice,
          amount: String(result.data.amount),
          payment_method: result.data.payment_method,
          status: result.data.status,
          ...(isMpesa && {
            phone_number: result.data.phone_number ?? "",
            mpesa_receipt_number: result.data.mpesa_receipt_number ?? "",
          }),
        };
        await browserRequest<Payment>("/api/proxy/api/billing/payments/", {
          method: "POST",
          body: payload,
        });
        setFormData({
          invoice: "",
          amount: 0,
          payment_method: "cash",
          phone_number: "",
          mpesa_receipt_number: "",
          status: "pending",
        });
        router.refresh();
      } catch (error) {
        if (error instanceof BrowserApiError) {
          const backendErrors = flattenValidationErrors(error.details);
          setErrors(backendErrors.length ? backendErrors : [error.message]);
        } else {
          setErrors(["Failed to record payment. Please try again."]);
        }
      }
    });
  };

  return (
    <Card className="border-slate-200/70">
      <CardHeader>
        <CardTitle>Record payment</CardTitle>
        <p className="text-sm text-slate-600">
          Record a payment against an invoice. M-PESA reference fields appear when M-PESA is selected.
        </p>
      </CardHeader>
      <CardContent>
        <ErrorList errors={errors} />
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-800" htmlFor="pay-invoice">
              Invoice <span className="text-destructive">*</span>
            </label>
            <select
              id="pay-invoice"
              value={formData.invoice}
              onChange={(e) => setFormData((prev) => ({ ...prev, invoice: e.target.value }))}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
              required
            >
              <option value="">Select invoice</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.id.slice(0, 12)}… — {inv.status} — {inv.total_amount}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800" htmlFor="pay-amount">
              Amount (KES) <span className="text-destructive">*</span>
            </label>
            <Input
              id="pay-amount"
              type="number"
              min="0"
              step="0.01"
              value={formData.amount || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, amount: Number(e.target.value) }))}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800" htmlFor="pay-method">
              Payment method
            </label>
            <select
              id="pay-method"
              value={formData.payment_method}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  payment_method: e.target.value as PaymentFormData["payment_method"],
                }))
              }
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
            >
              <option value="cash">Cash</option>
              <option value="mpesa">M-PESA</option>
              <option value="card">Card</option>
            </select>
          </div>

          {isMpesa && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800" htmlFor="pay-phone">
                  Phone number
                </label>
                <Input
                  id="pay-phone"
                  type="tel"
                  value={formData.phone_number ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone_number: e.target.value }))
                  }
                  placeholder="+254…"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800" htmlFor="pay-mpesa-ref">
                  M-PESA receipt number
                </label>
                <Input
                  id="pay-mpesa-ref"
                  value={formData.mpesa_receipt_number ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, mpesa_receipt_number: e.target.value }))
                  }
                  placeholder="e.g. QK12AB3CDE"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800" htmlFor="pay-status">
              Status
            </label>
            <select
              id="pay-status"
              value={formData.status}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  status: e.target.value as PaymentFormData["status"],
                }))
              }
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
            >
              <option value="pending">Pending</option>
              <option value="successful">Successful</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="flex items-end md:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Recording…" : "Record payment"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
