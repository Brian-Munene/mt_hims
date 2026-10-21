import { PageHeader } from "@/components/shared/page-header";
import { TwoFactorSettings } from "@/components/security/two-factor-settings";
import { requireUser } from "@/lib/auth";

export default async function SecurityPage() {
  const user = await requireUser();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Security"
        description="Manage two-factor authentication for your own account."
      />

      <div className="max-w-2xl">
        <TwoFactorSettings initialEnabled={user.is_2fa_enabled} />
      </div>
    </div>
  );
}
