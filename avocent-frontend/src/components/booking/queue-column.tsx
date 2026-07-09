"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatRelative } from "@/lib/format";
import type { BookingQueue } from "@/lib/types";

interface QueueColumnProps {
  queueType: string;
  entries: BookingQueue[];
}

const queueTypeLabel: Record<string, string> = {
  reception: "Reception",
  triage: "Triage",
  consultation: "Consultation",
  laboratory: "Laboratory",
  pharmacy: "Pharmacy",
  billing: "Billing",
};

export function QueueColumn({ queueType, entries }: QueueColumnProps) {
  const label = queueTypeLabel[queueType] ?? queueType;
  const waiting = entries.filter((e) => e.status === "waiting" || e.status === "called");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {waiting.length} waiting
        </span>
      </div>

      {entries.length === 0 ? (
        <EmptyState title="Queue clear" description="No entries" />
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-slate-500">
                  {entry.position != null ? `#${entry.position}` : "Unassigned"}
                </span>
                <StatusBadge value={entry.status} />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Entered {formatRelative(entry.entered_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
