import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { Invoice } from "@/lib/types";

interface DoctorBillSummaryCardProps {
  invoices: Invoice[];
}

export function DoctorBillSummaryCard({ invoices }: DoctorBillSummaryCardProps) {
  const encounterTotals = new Map<string, { total: number; count: number }>();

  for (const invoice of invoices) {
    const key = invoice.encounter ?? "no-encounter";
    const existing = encounterTotals.get(key) ?? { total: 0, count: 0 };
    encounterTotals.set(key, {
      total: existing.total + Number(invoice.total_amount),
      count: existing.count + 1,
    });
  }

  const entries = Array.from(encounterTotals.entries());
  const grandTotal = entries.reduce((sum, [, v]) => sum + v.total, 0);

  if (!entries.length) return null;

  return (
    <Card className="border-slate-200/70">
      <CardHeader>
        <CardTitle>Billing summary</CardTitle>
        <p className="text-sm text-slate-600">Invoice totals grouped by encounter.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map(([encounterId, { total, count }]) => (
          <div key={encounterId} className="flex items-center justify-between gap-3 text-sm">
            <span className="font-mono text-xs text-slate-500">
              {encounterId === "no-encounter"
                ? "No encounter"
                : `Encounter ${encounterId.slice(0, 8)}`}
              <span className="ml-1 text-slate-400">({count} inv.)</span>
            </span>
            <span className="font-semibold text-slate-950">{formatCurrency(total)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3 text-sm">
          <span className="font-medium text-slate-800">Total</span>
          <span className="text-base font-bold text-slate-950">{formatCurrency(grandTotal)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
