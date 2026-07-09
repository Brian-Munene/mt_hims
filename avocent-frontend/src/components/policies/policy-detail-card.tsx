"use client";

import { useState } from "react";

import { AutosaveIndicator } from "@/components/shared/autosave-indicator";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { updatePolicy } from "@/lib/api/policies-browser";
import { useAutosave } from "@/hooks/use-autosave";
import { formatDate } from "@/lib/format";
import type { Policy } from "@/lib/types";

interface PolicyDetailCardProps {
  policy: Policy;
}

export function PolicyDetailCard({ policy }: PolicyDetailCardProps) {
  const [body, setBody] = useState(policy.body);

  const { status: autosaveStatus } = useAutosave(
    async (currentBody) => {
      await updatePolicy(policy.id, { body: currentBody });
    },
    body,
    1000,
  );

  return (
    <div className="space-y-6">
      <Card className="border-slate-200/70">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{policy.title}</CardTitle>
            <StatusBadge value={policy.status} />
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-1">
            <span className="capitalize">{policy.category}</span>
            <span>Version {policy.version}</span>
            <span>Effective {formatDate(policy.effective_date)}</span>
            {policy.expiry_date && <span>Expires {formatDate(policy.expiry_date)}</span>}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-800">Policy body</label>
            <AutosaveIndicator status={autosaveStatus} />
          </div>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={16}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>
    </div>
  );
}
