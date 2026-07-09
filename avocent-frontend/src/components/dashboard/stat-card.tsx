import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
}) {
  return (
    <Card className="border-slate-200/70 bg-white/90 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-slate-600">{label}</CardTitle>
        <div className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-700">{icon}</div>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
        <p className="text-sm text-slate-500">{hint}</p>
      </CardContent>
    </Card>
  );
}

