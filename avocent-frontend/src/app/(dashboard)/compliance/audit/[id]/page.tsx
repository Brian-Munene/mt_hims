import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuditLog } from "@/lib/api/compliance";
import { requireUser } from "@/lib/auth";
import { assertModuleAccess, canViewAuditLog } from "@/lib/rbac";
import { formatDateTime } from "@/lib/format";

export default async function AuditLogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  assertModuleAccess(user, "compliance");

  if (!canViewAuditLog(user)) {
    return (
      <div className="space-y-4">
        <PageHeader eyebrow="Compliance" title="Audit entry" description="Access restricted." />
        <p className="text-sm text-slate-500">Admin access required.</p>
      </div>
    );
  }

  const log = await getAuditLog(id);

  return (
    <div className="space-y-8">
      <Link href="/compliance/audit" className="text-sm text-teal-600 hover:text-teal-800">
        ← Back to audit log
      </Link>

      <PageHeader
        eyebrow="Audit entry"
        title={`${log.action} · ${log.model_name}`}
        description={`Object ${log.object_id} · ${formatDateTime(log.timestamp)}`}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200/70">
          <CardHeader>
            <CardTitle className="text-sm">Before</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-slate-50 p-4 text-xs text-slate-700">
              {Object.keys(log.before_snapshot).length > 0
                ? JSON.stringify(log.before_snapshot, null, 2)
                : "— (no prior state)"}
            </pre>
          </CardContent>
        </Card>

        <Card className="border-slate-200/70">
          <CardHeader>
            <CardTitle className="text-sm">After</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-slate-50 p-4 text-xs text-slate-700">
              {Object.keys(log.after_snapshot).length > 0
                ? JSON.stringify(log.after_snapshot, null, 2)
                : "— (no new state)"}
            </pre>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/70">
        <CardHeader>
          <CardTitle className="text-sm">Metadata</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">Action</p>
            <p className="mt-1 font-medium">{log.action}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">Model</p>
            <p className="mt-1 font-medium">{log.model_name}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">Object ID</p>
            <p className="mt-1 font-mono text-xs">{log.object_id}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">IP address</p>
            <p className="mt-1 font-mono text-xs">{log.ip_address ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">Timestamp</p>
            <p className="mt-1">{formatDateTime(log.timestamp)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
