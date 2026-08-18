import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Administration console"
        description="Admin-only operational controls for staff accounts, RBAC roles, clinics, and departments."
      />
      <AdminNav />
      {children}
    </div>
  );
}
