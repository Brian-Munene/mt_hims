import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBillingReport } from "@/lib/api/admin";
import { requireUser } from "@/lib/auth";
import { assertModuleAccess } from "@/lib/rbac";

type SearchValue = string | string[] | undefined;
function first(v: SearchValue) { return Array.isArray(v) ? v[0] : v; }

export default async function BillingReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchValue>>;
}) {
  const user = await requireUser();
  assertModuleAccess(user, "billing");

  const query = await searchParams;
  const from_date = first(query.from_date);
  const to_date = first(query.to_date);

  const report = await getBillingReport({ from_date, to_date });

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/billing"
          className="inline-flex h-7 items-center justify-center gap-1.5 rounded-lg border border-transparent px-2.5 text-sm font-medium whitespace-nowrap text-slate-700 hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to billing
        </Link>
      </div>

      <PageHeader
        eyebrow="Billing"
        title="Financial reports"
        description="Revenue summary, invoice breakdown, and payment method analysis for the current clinic."
      />

      {/* Date range filter */}
      <Card className="border-slate-200/70">
        <CardContent className="pt-6">
          <form className="flex flex-wrap items-end gap-4" method="GET">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="from_date">From</label>
              <input
                id="from_date"
                name="from_date"
                type="date"
                defaultValue={from_date ?? ""}
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="to_date">To</label>
              <input
                id="to_date"
                name="to_date"
                type="date"
                defaultValue={to_date ?? ""}
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
              />
            </div>
            <button type="submit" className="h-8 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
              Apply
            </button>
            <Link href="/billing/reports" className="h-8 inline-flex items-center rounded-lg border border-input px-4 text-sm font-medium text-slate-700">
              Reset
            </Link>
          </form>
        </CardContent>
      </Card>

      {/* Summary stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total invoices", value: report.total_invoices },
          { label: "Total revenue", value: `KES ${Number(report.total_revenue).toLocaleString()}` },
          { label: "Average invoice", value: `KES ${Number(report.avg_invoice).toLocaleString()}` },
        ].map(({ label, value }) => (
          <Card key={label} className="border-slate-200/70">
            <CardContent className="pt-6">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* By status */}
        <Card className="border-slate-200/70">
          <CardHeader><CardTitle className="text-base">Revenue by invoice status</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Revenue (KES)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.by_status.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="py-6 text-center text-sm text-slate-400">No data</TableCell></TableRow>
                ) : report.by_status.map((row) => (
                  <TableRow key={row.status}>
                    <TableCell className="capitalize">{row.status}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right">{row.revenue ? Number(row.revenue).toLocaleString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* By payment method */}
        <Card className="border-slate-200/70">
          <CardHeader><CardTitle className="text-base">Payments by method</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Total (KES)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.by_payment_method.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="py-6 text-center text-sm text-slate-400">No payments recorded</TableCell></TableRow>
                ) : report.by_payment_method.map((row) => (
                  <TableRow key={row.payment_method}>
                    <TableCell className="capitalize">{row.payment_method.replaceAll("_", " ")}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right">{row.total ? Number(row.total).toLocaleString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
