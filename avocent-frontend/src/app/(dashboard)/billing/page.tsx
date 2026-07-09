import Link from "next/link";

import { CrudPanel } from "@/components/shared/crud-panel";
import { PageHeader } from "@/components/shared/page-header";
import { DoctorBillSummaryCard } from "@/components/billing/doctor-bill-summary-card";
import { InvoiceDetailCard } from "@/components/billing/invoice-detail-card";
import { PaymentForm } from "@/components/billing/payment-form";
import { listEncounters } from "@/lib/api/encounters";
import { listPatients } from "@/lib/api/patients";
import { listInvoices, listPayments, listServices } from "@/lib/api/billing";
import { requireUser } from "@/lib/auth";
import { buildEncounterOptions, buildPatientOptions } from "@/lib/options";
import { assertModuleAccess, canViewBillingSummary } from "@/lib/rbac";

export default async function BillingPage() {
  const user = await requireUser();
  assertModuleAccess(user, "billing");

  const [invoices, payments, services, encounters, patients] = await Promise.all([
    listInvoices(),
    listPayments(),
    listServices(),
    listEncounters({ ordering: "-start_time" }),
    listPatients({ ordering: "first_name" }),
  ]);
  const patientOptions = buildPatientOptions(patients.results);
  const encounterOptions = buildEncounterOptions(encounters.results);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Billing"
          title="Invoice and payment desk"
          description="Record payments, review outstanding balances, and manage the service catalogue."
        />
        <Link href="/billing/reports" className="shrink-0 inline-flex h-8 items-center rounded-lg border border-input px-3 text-sm font-medium text-slate-700 hover:bg-muted">
          Reports →
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <InvoiceDetailCard invoices={invoices.results} payments={payments.results} />

          <PaymentForm invoices={invoices.results} />

          <CrudPanel
            title="Invoice"
            description="Create, update, and void invoices."
            endpoint="/api/proxy/api/billing/invoices/"
            initialItems={invoices.results}
            fields={[
              { name: "patient", label: "Patient", type: "select", options: patientOptions, required: true },
              { name: "encounter", label: "Encounter", type: "select", options: encounterOptions },
              { name: "total_amount", label: "Total amount", required: true },
              {
                name: "status",
                label: "Status",
                type: "select",
                required: true,
                options: [
                  { value: "draft", label: "Draft" },
                  { value: "unpaid", label: "Unpaid" },
                  { value: "paid", label: "Paid" },
                  { value: "void", label: "Void" },
                ],
              },
              { name: "due_date", label: "Due date", type: "datetime-local" },
            ]}
          />

          <CrudPanel
            title="Service catalogue"
            description="Manage billable services."
            endpoint="/api/proxy/api/billing/services/"
            initialItems={services.results}
            fields={[
              { name: "name", label: "Name", required: true },
              { name: "code", label: "Code", required: true },
              { name: "price", label: "Price", required: true },
              {
                name: "category",
                label: "Category",
                type: "select",
                required: true,
                options: [
                  { value: "consultation", label: "Consultation" },
                  { value: "lab_test", label: "Lab test" },
                  { value: "medication", label: "Medication" },
                  { value: "other", label: "Other" },
                ],
              },
            ]}
          />
        </div>

        {canViewBillingSummary(user) && (
          <aside className="space-y-6">
            <DoctorBillSummaryCard invoices={invoices.results} />
          </aside>
        )}
      </div>
    </div>
  );
}
