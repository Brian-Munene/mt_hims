import Link from "next/link";
import { History } from "lucide-react";

import { PolicyDetailCard } from "@/components/policies/policy-detail-card";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPolicy, listPolicyVersions } from "@/lib/api/policies";
import { requireUser } from "@/lib/auth";
import { assertModuleAccess } from "@/lib/rbac";
import { formatDateTime } from "@/lib/format";

export default async function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  assertModuleAccess(user, "policies");

  const [policy, versionsResp] = await Promise.all([getPolicy(id), listPolicyVersions(id)]);
  const versions = versionsResp.results;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Policies"
        title={policy.title}
        description={`Version ${policy.version} · ${policy.category}`}
      />
      <Link href="/policies" className="text-sm text-teal-600 hover:text-teal-800">
        ← Back to policies
      </Link>

      <PolicyDetailCard policy={policy} />

      {versions.length > 0 && (
        <Card className="border-slate-200/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="size-4 text-slate-400" />
              Version history
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100">
            {versions.map((v) => (
              <div key={v.id} className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      v{v.version_label}
                      <span className="ml-2 text-xs capitalize text-slate-500">{v.status}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{v.title}</p>
                  </div>
                  <p className="shrink-0 text-xs text-slate-400">{formatDateTime(v.created_at)}</p>
                </div>
                {v.body && (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">{v.body}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
