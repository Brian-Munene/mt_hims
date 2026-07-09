import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/format";
import type { Policy } from "@/lib/types";

interface PolicyListCardProps {
  policies: Policy[];
}

export function PolicyListCard({ policies }: PolicyListCardProps) {
  if (!policies.length) {
    return (
      <EmptyState
        title="No policies found"
        description="Create the first clinic policy to get started."
      />
    );
  }

  return (
    <div className="space-y-3">
      {policies.map((policy) => (
        <Link key={policy.id} href={`/policies/${policy.id}`}>
          <Card className="border-slate-200/70 transition-colors hover:border-teal-200 hover:bg-teal-50/20">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base">{policy.title}</CardTitle>
                <StatusBadge value={policy.status} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                <span className="capitalize">{policy.category}</span>
                <span>v{policy.version}</span>
                <span>Effective {formatDate(policy.effective_date)}</span>
                {policy.expiry_date && <span>Expires {formatDate(policy.expiry_date)}</span>}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
