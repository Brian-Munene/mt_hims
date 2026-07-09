import { AuditLogTable } from "@/components/compliance/audit-log-table";
import { ComplianceFlagsPanel } from "@/components/compliance/compliance-flags-panel";
import { ComplianceSummaryCard } from "@/components/compliance/compliance-summary-card";
import { PageHeader } from "@/components/shared/page-header";
import { listAuditLogs, listComplianceRecords } from "@/lib/api/compliance";
import { requireUser } from "@/lib/auth";
import { assertModuleAccess } from "@/lib/rbac";

export default async function CompliancePage() {
  const user = await requireUser();
  assertModuleAccess(user, "compliance");

  const [complianceResp, auditResp] = await Promise.all([
    listComplianceRecords(),
    listAuditLogs(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Compliance"
        title="Compliance centre"
        description="Review open flags, resolve compliance records, and audit system-wide activity."
      />

      <ComplianceSummaryCard records={complianceResp.results} />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Audit log</h2>
          <AuditLogTable logs={auditResp.results} />
        </div>
        <aside>
          <ComplianceFlagsPanel records={complianceResp.results} />
        </aside>
      </div>
    </div>
  );
}
