import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Invoice, Payment } from "@/lib/types";

interface InvoiceDetailCardProps {
  invoices: Invoice[];
  payments: Payment[];
}

export function InvoiceDetailCard({ invoices, payments }: InvoiceDetailCardProps) {
  if (!invoices.length) return null;

  const paidByInvoice = new Map<string, number>();
  for (const payment of payments) {
    if (payment.status === "successful") {
      paidByInvoice.set(
        payment.invoice,
        (paidByInvoice.get(payment.invoice) ?? 0) + Number(payment.amount),
      );
    }
  }

  return (
    <Card className="border-slate-200/70">
      <CardHeader>
        <CardTitle>Invoice summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {invoices.map((invoice) => {
          const total = Number(invoice.total_amount);
          const paid = paidByInvoice.get(invoice.id) ?? 0;
          const outstanding = total - paid;
          return (
            <div key={invoice.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-mono text-slate-500">{invoice.id.slice(0, 12)}…</p>
                <StatusBadge value={invoice.status} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">
                    {formatCurrency(total)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Paid</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-700">
                    {formatCurrency(paid)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Outstanding</p>
                  <p
                    className={`mt-1 text-lg font-semibold ${outstanding > 0 ? "text-rose-600" : "text-slate-400"}`}
                  >
                    {formatCurrency(outstanding)}
                  </p>
                </div>
              </div>
              {invoice.due_date && (
                <p className="text-xs text-slate-500">Due {formatDate(invoice.due_date)}</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
