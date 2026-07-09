import Link from "next/link";

import { AuditLogTable } from "@/components/compliance/audit-log-table";
import { PageHeader } from "@/components/shared/page-header";
import { listAuditLogs } from "@/lib/api/compliance";
import { requireUser } from "@/lib/auth";
import { assertModuleAccess, canViewAuditLog } from "@/lib/rbac";

export default async function AuditLogPage() {
  const user = await requireUser();
  assertModuleAccess(user, "compliance");

  if (!canViewAuditLog(user)) {
    return (
      <div className="space-y-4">
        <PageHeader eyebrow="Compliance" title="Audit log" description="Access restricted." />
        <p className="text-sm text-slate-500">Admin access required to view the full audit log.</p>
      </div>
    );
  }

  const auditResp = await listAuditLogs();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Compliance"
        title="Full audit log"
        description="Complete system-wide audit trail. All actions are immutable and append-only."
      />
      <Link href="/compliance" className="text-sm text-teal-600 hover:text-teal-800">
        ← Back to compliance centre
      </Link>
      <AuditLogTable logs={auditResp.results} />
    </div>
  );
}
