import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CrudPanel } from "@/components/shared/crud-panel";
import { PageHeader } from "@/components/shared/page-header";
import { listPractitioners, listUsers } from "@/lib/api/admin";
import { listAvailabilitySlots } from "@/lib/api/encounters";
import { requireUser } from "@/lib/auth";
import { buildPractitionerOptions } from "@/lib/options";
import { assertModuleAccess, hasAnyRole } from "@/lib/rbac";

const DAY_OPTIONS = [
  { value: "0", label: "Monday" },
  { value: "1", label: "Tuesday" },
  { value: "2", label: "Wednesday" },
  { value: "3", label: "Thursday" },
  { value: "4", label: "Friday" },
  { value: "5", label: "Saturday" },
  { value: "6", label: "Sunday" },
];

export default async function AvailabilityPage() {
  const user = await requireUser();
  assertModuleAccess(user, "encounters");
  const isAdmin = hasAnyRole(user, ["Admin"]);

  const [slots, practitioners, users] = await Promise.all([
    listAvailabilitySlots(),
    listPractitioners(),
    isAdmin ? listUsers() : Promise.resolve({ results: [], count: 0, next: null, previous: null }),
  ]);
  const userById = new Map(users.results.map((staffUser) => [staffUser.id, staffUser]));
  const practitionerOptions = buildPractitionerOptions(practitioners.results, userById);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/encounters"
          className="inline-flex h-7 items-center justify-center gap-1.5 rounded-lg border border-transparent px-2.5 text-sm font-medium whitespace-nowrap text-slate-700 hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to encounters
        </Link>
      </div>

      <PageHeader
        eyebrow="Encounters"
        title="Practitioner availability"
        description="Maintain weekly availability slots used to schedule appointments and (later) the public booking portal."
      />

      <CrudPanel
        title="Availability slot"
        description="Each slot is a recurring weekly window when a practitioner can be booked."
        endpoint="/api/proxy/api/encounters/availability-slots/"
        initialItems={slots.results}
        fields={[
          { name: "practitioner", label: "Practitioner", type: "select", options: practitionerOptions, required: true },
          { name: "day_of_week", label: "Day of week", type: "select", options: DAY_OPTIONS, required: true },
          { name: "start_time", label: "Start time (HH:MM:SS)", required: true },
          { name: "end_time", label: "End time (HH:MM:SS)", required: true },
          { name: "is_available", label: "Available", type: "checkbox" },
        ]}
      />
    </div>
  );
}
