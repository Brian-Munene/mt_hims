import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ComplianceRecord } from "@/lib/types";

interface ComplianceSummaryCardProps {
  records: ComplianceRecord[];
}

export function ComplianceSummaryCard({ records }: ComplianceSummaryCardProps) {
  const total = records.length;
  const flagged = records.filter((r) => r.status === "open").length;
  const resolved = records.filter((r) => r.status === "resolved").length;
  const dismissed = records.filter((r) => r.status === "dismissed").length;

  return (
    <Card className="border-slate-200/70">
      <CardHeader>
        <CardTitle>Compliance overview</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-4">
        <Stat label="Total records" value={total} color="text-slate-950" />
        <Stat label="Open flags" value={flagged} color="text-rose-600" />
        <Stat label="Resolved" value={resolved} color="text-emerald-600" />
        <Stat label="Dismissed" value={dismissed} color="text-slate-400" />
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}
