import { CrudPanel } from "@/components/shared/crud-panel";
import { PageHeader } from "@/components/shared/page-header";
import { listPractitioners, listUsers } from "@/lib/api/admin";
import { listLabOrders } from "@/lib/api/laboratory";
import { requireUser } from "@/lib/auth";
import { buildPractitionerOptions } from "@/lib/options";
import { hasAnyRole } from "@/lib/rbac";

export default async function EncounterLabOrdersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const isAdmin = hasAnyRole(user, ["Admin"]);
  const [orders, practitioners, users] = await Promise.all([
    listLabOrders(id),
    listPractitioners(),
    isAdmin ? listUsers() : Promise.resolve({ results: [], count: 0, next: null, previous: null }),
  ]);
  const userById = new Map(users.results.map((staffUser) => [staffUser.id, staffUser]));
  const practitionerOptions = buildPractitionerOptions(practitioners.results, userById);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Laboratory" title="Lab orders" description="Orders created inside an encounter that later feed the laboratory worklist." />
      <CrudPanel
        title="Lab order"
        description="Create and manage lab orders for this encounter."
        endpoint="/api/proxy/api/laboratory/orders/"
        initialItems={orders.results}
        fields={[
          { name: "encounter", label: "Encounter", required: true, hidden: true, defaultValue: id },
          { name: "ordered_by", label: "Ordered by", type: "select", options: practitionerOptions, required: true },
          {
            name: "status",
            label: "Status",
            type: "select",
            required: true,
            options: [
              { value: "ordered", label: "Ordered" },
              { value: "collected", label: "Collected" },
              { value: "processing", label: "Processing" },
              { value: "completed", label: "Completed" },
            ],
          },
          {
            name: "priority",
            label: "Priority",
            type: "select",
            required: true,
            options: [
              { value: "routine", label: "Routine" },
              { value: "urgent", label: "Urgent" },
              { value: "stat", label: "STAT" },
            ],
          },
        ]}
      />
    </div>
  );
}
