import Link from "next/link";
import { Activity, CreditCard, FlaskConical, Pill, Users } from "lucide-react";

import { ModuleCard } from "@/components/dashboard/module-card";
import { QueueColumn } from "@/components/booking/queue-column";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApiListResponse } from "@/lib/types";
import { listInvoices } from "@/lib/api/billing";
import { listQueueBoard } from "@/lib/api/booking";
import { listEncounters } from "@/lib/api/encounters";
import { listLabOrders } from "@/lib/api/laboratory";
import { listPatients } from "@/lib/api/patients";
import { listPrescriptions } from "@/lib/api/pharmacy";
import { moduleCards } from "@/lib/navigation";
import { requireUser } from "@/lib/auth";
import { hasAnyRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";

const QUEUE_TYPES = ["reception", "triage", "consultation", "laboratory", "pharmacy", "billing"] as const;

const EMPTY_LIST: ApiListResponse<unknown> = { results: [], count: 0, next: null, previous: null };

export default async function DashboardPage() {
  const user = await requireUser();

  // Mirrors the backend PERMISSION_MATRIX: patients.read is granted to every clinic role, but
  // encounters/billing/pharmacy/laboratory reads are split unevenly across roles, so each list
  // call here has to be gated individually rather than behind a single isAdmin check.
  const canViewEncounters = hasAnyRole(user, ["Admin", "Doctor", "Nurse", "Lab Technician", "Pharmacist"]);
  const canViewBilling = hasAnyRole(user, ["Admin", "Pharmacist", "Receptionist"]);
  const canViewPharmacy = hasAnyRole(user, ["Admin", "Doctor", "Pharmacist"]);
  const canViewLaboratory = hasAnyRole(user, ["Admin", "Doctor", "Lab Technician"]);
  const isAdmin = hasAnyRole(user, ["Admin"]) || user.is_superuser;

  const [patients, encounters, invoices, prescriptions, labOrders, queueBoard] = await Promise.all([
    listPatients(),
    canViewEncounters ? listEncounters() : Promise.resolve(EMPTY_LIST),
    canViewBilling ? listInvoices() : Promise.resolve(EMPTY_LIST),
    canViewPharmacy ? listPrescriptions() : Promise.resolve(EMPTY_LIST),
    canViewLaboratory ? listLabOrders() : Promise.resolve(EMPTY_LIST),
    listQueueBoard(),
  ]);

  const queueByType = new Map<string, (typeof queueBoard.results)>(
    QUEUE_TYPES.map((t) => [t, []]),
  );
  for (const entry of queueBoard.results) {
    queueByType.get(entry.queue_type)?.push(entry);
  }

  const statCards = [
    { key: "patients", visible: true, label: "Patients", value: patients.count, hint: "Clinic records available", icon: <Users className="size-4" /> },
    { key: "encounters", visible: canViewEncounters, label: "Encounters", value: encounters.count, hint: "Total visits in system", icon: <Activity className="size-4" /> },
    { key: "invoices", visible: canViewBilling, label: "Invoices", value: invoices.count, hint: "Billing records tracked", icon: <CreditCard className="size-4" /> },
    { key: "prescriptions", visible: canViewPharmacy, label: "Prescriptions", value: prescriptions.count, hint: "Items entering dispense flow", icon: <Pill className="size-4" /> },
    { key: "labOrders", visible: canViewLaboratory, label: "Lab orders", value: labOrders.count, hint: "Orders visible to worklists", icon: <FlaskConical className="size-4" /> },
  ].filter((card) => card.visible);

  return (
    <div className="space-y-8">
      <Card className="border-slate-200/70">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Operational queues</CardTitle>
            <Link href="/queue" className="text-xs font-medium text-teal-600 hover:text-teal-800">
              Full board →
            </Link>
          </div>
          <CardDescription>Live queue positions across all clinic stations.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {QUEUE_TYPES.map((queueType) => (
            <div key={queueType} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <QueueColumn queueType={queueType} entries={queueByType.get(queueType) ?? []} />
            </div>
          ))}
        </CardContent>
      </Card>

      <PageHeader
        eyebrow="Overview"
        title="Clinic dashboard"
        description="A server-rendered operational view across patients, encounters, billing, prescriptions, and laboratory work."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => (
          <StatCard key={card.key} label={card.label} value={`${card.value}`} hint={card.hint} icon={card.icon} />
        ))}
      </div>

      <div className={cn("grid gap-4", isAdmin && "xl:grid-cols-[1.4fr_0.9fr]")}>
        <Card className="border-slate-200/70">
          <CardHeader>
            <CardTitle>Module launchpad</CardTitle>
            <CardDescription>
              Navigation is filtered to the roles assigned to {user.email}.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {moduleCards
              .filter((card) => !(card.href === "/admin" && !user.role_names.includes("Admin")))
              .filter((card) => !(card.href === "/billing" && !user.role_names.some((role) => ["Admin", "Receptionist"].includes(role))))
              .filter((card) => !(card.href === "/pharmacy" && !user.role_names.some((role) => ["Admin", "Doctor", "Pharmacist"].includes(role))))
              .filter((card) => !(card.href === "/laboratory" && !user.role_names.some((role) => ["Admin", "Doctor", "Lab Technician"].includes(role))))
              .filter((card) => !(card.href === "/telemedicine" && !user.role_names.some((role) => ["Admin", "Doctor", "Nurse"].includes(role))))
              .filter((card) => !(card.href === "/clinical" && !user.role_names.some((role) => ["Admin", "Doctor", "Nurse"].includes(role))))
              .map((card) => (
                <ModuleCard key={card.href} {...card} />
              ))}
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="border-slate-200/70 bg-slate-950 text-white">
            <CardHeader>
              <CardTitle className="text-white">Architecture notes</CardTitle>
              <CardDescription className="text-slate-300">
                The frontend is structured to keep sensitive healthcare flows on the server side.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-slate-200">
              <p>App Router pages render lists on the server to avoid client-side fetch waterfalls.</p>
              <p>JWTs are exchanged through route handlers and persisted in httpOnly cookies.</p>
              <p>RBAC helpers mirror the backend roles so restricted modules redirect before rendering.</p>
              <p>An AES-256-GCM helper is ready for encrypted API envelopes when the backend enables them.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

