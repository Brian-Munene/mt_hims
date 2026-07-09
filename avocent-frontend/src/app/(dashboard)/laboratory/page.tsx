import { CrudPanel } from "@/components/shared/crud-panel";
import { PageHeader } from "@/components/shared/page-header";
import { listPractitioners, listUsers } from "@/lib/api/admin";
import { listEncounters } from "@/lib/api/encounters";
import { listLabOrderItems, listLabOrders, listLabResults, listLabTests } from "@/lib/api/laboratory";
import { requireUser } from "@/lib/auth";
import { buildEncounterOptions, buildPractitionerOptions } from "@/lib/options";
import { assertModuleAccess, hasAnyRole } from "@/lib/rbac";

export default async function LaboratoryPage() {
  const user = await requireUser();
  assertModuleAccess(user, "laboratory");
  const isAdmin = hasAnyRole(user, ["Admin"]);

  const [orders, orderItems, results, tests, encounters, practitioners, users] = await Promise.all([
    listLabOrders(),
    listLabOrderItems(),
    listLabResults(),
    listLabTests(),
    listEncounters({ ordering: "-start_time" }),
    listPractitioners(),
    isAdmin ? listUsers() : Promise.resolve({ results: [], count: 0, next: null, previous: null }),
  ]);
  const userById = new Map(users.results.map((staffUser) => [staffUser.id, staffUser]));
  const encounterOptions = buildEncounterOptions(encounters.results);
  const practitionerOptions = buildPractitionerOptions(practitioners.results, userById);
  const labTestNameById = new Map(tests.results.map((test) => [test.id, test.name]));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Laboratory"
        title="Lab worklist"
        description="This standalone view complements encounter-scoped order creation for lab technicians and clinicians."
      />
      <CrudPanel
        title="Lab order"
        description="Manage lab orders."
        endpoint="/api/proxy/api/laboratory/orders/"
        initialItems={orders.results}
        fields={[
          { name: "encounter", label: "Encounter", type: "select", options: encounterOptions, required: true },
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
      <CrudPanel
        title="Lab result"
        description="Create and verify result entries."
        endpoint="/api/proxy/api/laboratory/results/"
        initialItems={results.results}
        fields={[
          {
            name: "lab_order_item",
            label: "Order item",
            type: "select",
            options: orderItems.results.map((item) => ({
              value: item.id,
              label: `Order ${item.lab_order.slice(0, 8)} • ${labTestNameById.get(item.lab_test) ?? item.lab_test.slice(0, 8)}`,
            })),
            required: true,
          },
          { name: "result_value", label: "Result value", required: true },
          { name: "unit", label: "Unit" },
          { name: "reference_range", label: "Reference range" },
          { name: "abnormal_flag", label: "Abnormal flag" },
          { name: "verified_by", label: "Verified by", type: "select", options: practitionerOptions },
        ]}
      />
      <CrudPanel
        title="Lab test"
        description="Maintain test catalogue entries."
        endpoint="/api/proxy/api/laboratory/tests/"
        initialItems={tests.results}
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "loinc_code", label: "LOINC code", required: true },
          { name: "price", label: "Price", required: true },
          { name: "sample_type", label: "Sample type", required: true },
        ]}
      />
    </div>
  );
}
