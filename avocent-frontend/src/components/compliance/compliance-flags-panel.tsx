"use client";

import { useState, useTransition } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { ErrorList } from "@/components/shared/error-list";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrowserApiError, flattenValidationErrors } from "@/lib/api/browser";
import { updateComplianceRecord } from "@/lib/api/compliance-browser";
import { formatDateTime } from "@/lib/format";
import type { ComplianceRecord } from "@/lib/types";

interface ComplianceFlagsPanelProps {
  records: ComplianceRecord[];
}

export function ComplianceFlagsPanel({ records: initialRecords }: ComplianceFlagsPanelProps) {
  const [records, setRecords] = useState(initialRecords.filter((r) => r.status === "open"));
  const [errors, setErrors] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  function updateStatus(id: string, status: ComplianceRecord["status"]) {
    setErrors([]);
    startTransition(async () => {
      try {
        const updated = await updateComplianceRecord(id, { status });
        setRecords((prev) => prev.filter((r) => r.id !== updated.id));
      } catch (error) {
        if (error instanceof BrowserApiError) {
          setErrors(flattenValidationErrors(error.details));
        } else {
          setErrors(["Failed to update compliance record."]);
        }
      }
    });
  }

  return (
    <Card className="border-slate-200/70">
      <CardHeader>
        <CardTitle>Open flags</CardTitle>
        <p className="text-sm text-slate-600">
          Resolve or dismiss open compliance flags. Resolved records remain in the audit trail.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ErrorList errors={errors} />

        {records.length === 0 ? (
          <EmptyState
            title="No open flags"
            description="All compliance records have been reviewed."
          />
        ) : (
          records.map((record) => (
            <div
              key={record.id}
              className="rounded-xl border border-slate-200 p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium capitalize text-slate-900">
                    {record.resource_type}
                    <span className="ml-2 font-mono text-xs text-slate-400">
                      {record.resource_id.slice(0, 8)}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{record.flag_reason}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Flagged {formatDateTime(record.created_at)}
                  </p>
                </div>
                <StatusBadge value={record.status} />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => updateStatus(record.id, "resolved")}
                  className="h-7 text-xs text-emerald-700 hover:text-emerald-800"
                >
                  Resolve
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => updateStatus(record.id, "dismissed")}
                  className="h-7 text-xs text-slate-500 hover:text-slate-700"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
