import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/format";
import type { Observation } from "@/lib/types";
import { cn } from "@/lib/utils";

export function VitalsDisplay({ observations }: { observations: Observation[] }) {
  if (!observations.length) {
    return (
      <EmptyState
        title="No vitals recorded"
        description="Observations will appear here once triage is complete."
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {observations.map((obs) => (
        <div
          key={obs.id}
          className={cn(
            "rounded-2xl border p-4",
            obs.abnormal_flag
              ? "border-rose-200 bg-rose-50/50"
              : "border-slate-200 bg-slate-50/50",
          )}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{obs.name}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">
            {obs.value}
            {obs.unit && (
              <span className="ml-1 text-sm font-normal text-slate-500">{obs.unit}</span>
            )}
          </p>
          {obs.reference_range && (
            <p className="mt-1 text-xs text-slate-500">Ref: {obs.reference_range}</p>
          )}
          {obs.abnormal_flag && (
            <p className="mt-1 text-xs font-medium text-rose-600">Abnormal</p>
          )}
          <p className="mt-2 text-[10px] text-slate-400">{formatDate(obs.created_at)}</p>
        </div>
      ))}
    </div>
  );
}
