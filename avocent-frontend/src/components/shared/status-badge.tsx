import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const toneMap: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inactive: "bg-slate-100 text-slate-700 ring-slate-200",
  completed: "bg-slate-100 text-slate-700 ring-slate-200",
  confirmed: "bg-sky-50 text-sky-700 ring-sky-200",
  arrived: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  waiting_triage: "bg-amber-50 text-amber-700 ring-amber-200",
  in_triage: "bg-orange-50 text-orange-700 ring-orange-200",
  waiting_consultation: "bg-amber-50 text-amber-700 ring-amber-200",
  in_consultation: "bg-orange-50 text-orange-700 ring-orange-200",
  awaiting_disposition: "bg-slate-100 text-slate-700 ring-slate-200",
  waiting_lab: "bg-amber-50 text-amber-700 ring-amber-200",
  in_lab: "bg-orange-50 text-orange-700 ring-orange-200",
  waiting_pharmacy: "bg-amber-50 text-amber-700 ring-amber-200",
  in_pharmacy: "bg-orange-50 text-orange-700 ring-orange-200",
  waiting_billing: "bg-amber-50 text-amber-700 ring-amber-200",
  ready_for_checkout: "bg-lime-50 text-lime-700 ring-lime-200",
  processing: "bg-amber-50 text-amber-700 ring-amber-200",
  ordered: "bg-sky-50 text-sky-700 ring-sky-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  successful: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  failed: "bg-rose-50 text-rose-700 ring-rose-200",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  partially_paid: "bg-amber-50 text-amber-700 ring-amber-200",
  not_paid: "bg-rose-50 text-rose-700 ring-rose-200",
  unpaid: "bg-amber-50 text-amber-700 ring-amber-200",
  draft: "bg-slate-100 text-slate-700 ring-slate-200",
  dispensed: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  no_show: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full border-0 px-2.5 py-1 font-medium capitalize ring-1", toneMap[value] ?? toneMap.active)}
    >
      {value.replaceAll("_", " ")}
    </Badge>
  );
}
