import Link from "next/link";
import type { ReactNode } from "react";

import { ActiveBadge } from "@/components/shared/active-badge";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listPractitioners, listUsers } from "@/lib/api/admin";
import { listEncounters } from "@/lib/api/encounters";
import { listMedications, listPrescriptions, listStockBatches } from "@/lib/api/pharmacy";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { buildEncounterOptions, buildPractitionerOptions } from "@/lib/options";
import { clinicQuery, first, resolveClinicContext, type SearchValue } from "@/lib/pharmacy-pages";
import { assertModuleAccess, hasAnyRole } from "@/lib/rbac";

function ListSection({
  title,
  description,
  newHref,
  newLabel,
  children,
}: {
  title: string;
  description: string;
  newHref: string;
  newLabel: string;
  children: ReactNode;
}) {
  return (
    <Card className="border-slate-200/70">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
        <Link href={newHref} className={buttonVariants()}>
          {newLabel}
        </Link>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-8 text-center text-sm text-slate-400">
        No records found.
      </TableCell>
    </TableRow>
  );
}

function EditLink({ href }: { href: string }) {
  return (
    <Link href={href} className={buttonVariants({ variant: "outline", size: "sm" })}>
      Edit
    </Link>
  );
}

export default async function PharmacyPage({ searchParams }: { searchParams: Promise<Record<string, SearchValue>> }) {
  const [user, query] = await Promise.all([requireUser(), searchParams]);
  assertModuleAccess(user, "pharmacy");
  const isAdmin = hasAnyRole(user, ["Admin"]);

  const clinic = await resolveClinicContext(user, first(query.clinic));
  const qs = clinicQuery(clinic);

  const [prescriptions, medications, stockBatches, encounters, practitioners, users] = await Promise.all([
    listPrescriptions(undefined, clinic.clinicParam),
    listMedications(clinic.clinicParam),
    listStockBatches(undefined, clinic.clinicParam),
    listEncounters({ ordering: "-start_time", clinic: clinic.clinicParam }),
    listPractitioners(clinic.clinicParam),
    isAdmin ? listUsers() : Promise.resolve({ results: [], count: 0, next: null, previous: null }),
  ]);

  const userById = new Map(users.results.map((u) => [u.id, u]));
  const encounterLabel = new Map(buildEncounterOptions(encounters.results).map((o) => [o.value, o.label]));
  const practitionerLabel = new Map(
    buildPractitionerOptions(practitioners.results, userById).map((o) => [o.value, o.label]),
  );
  const medicationName = new Map(medications.results.map((m) => [m.id, `${m.name} ${m.strength}`]));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Pharmacy"
        title="Pharmacy"
        description="Prescriptions, the medication catalogue and stock batches. Use New or Edit to add or change records."
      />

      {clinic.clinicOptions.length ? (
        <form method="GET" className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800" htmlFor="view-clinic">
              Viewing clinic
            </label>
            <select
              id="view-clinic"
              name="clinic"
              defaultValue={clinic.clinicId}
              className="h-8 w-full min-w-64 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
            >
              {clinic.clinicOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="outline" size="sm">
            View
          </Button>
          <p className="basis-full text-xs text-slate-500">Lists below show this clinic, and new records default to it.</p>
        </form>
      ) : null}

      <ListSection
        title="Prescriptions"
        description="Prescriptions awaiting or past dispensing."
        newHref={`/pharmacy/prescriptions/new/${qs}`}
        newLabel="New prescription"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Encounter</TableHead>
              <TableHead>Prescribed by</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prescriptions.results.length === 0 ? (
              <EmptyRow colSpan={5} />
            ) : (
              prescriptions.results.map((rx) => (
                <TableRow key={rx.id}>
                  <TableCell className="font-medium text-slate-900">{encounterLabel.get(rx.encounter) ?? "-"}</TableCell>
                  <TableCell>{practitionerLabel.get(rx.prescribed_by) ?? "-"}</TableCell>
                  <TableCell>
                    <StatusBadge value={rx.status} />
                  </TableCell>
                  <TableCell>{formatDate(rx.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <EditLink href={`/pharmacy/prescriptions/${rx.id}/edit/`} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ListSection>

      <ListSection
        title="Medication catalogue"
        description="The clinic's medication formulary."
        newHref={`/pharmacy/medications/new/${qs}`}
        newLabel="New medication"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Strength</TableHead>
              <TableHead>Dosage form</TableHead>
              <TableHead>Reorder level</TableHead>
              <TableHead>Controlled</TableHead>
              <TableHead>Available</TableHead>
              <TableHead>Clinic</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {medications.results.length === 0 ? (
              <EmptyRow colSpan={8} />
            ) : (
              medications.results.map((med) => (
                <TableRow key={med.id}>
                  <TableCell className="font-medium text-slate-900">
                    {med.name}
                    {med.generic_name ? <span className="block text-xs text-slate-500">{med.generic_name}</span> : null}
                  </TableCell>
                  <TableCell>{med.strength}</TableCell>
                  <TableCell>{med.dosage_form || "-"}</TableCell>
                  <TableCell>{med.reorder_level}</TableCell>
                  <TableCell>
                    <ActiveBadge active={med.is_controlled} activeLabel="Yes" inactiveLabel="No" />
                  </TableCell>
                  <TableCell>
                    <ActiveBadge active={med.is_available} activeLabel="Yes" inactiveLabel="No" />
                  </TableCell>
                  <TableCell>{med.clinic_name}</TableCell>
                  <TableCell className="text-right">
                    <EditLink href={`/pharmacy/medications/${med.id}/edit/`} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ListSection>

      <ListSection
        title="Stock batches"
        description="Received medication batches, expiry dates and remaining quantity."
        newHref={`/pharmacy/stock-batches/new/${qs}`}
        newLabel="New stock batch"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medication</TableHead>
              <TableHead>Batch number</TableHead>
              <TableHead>Expiry date</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockBatches.results.length === 0 ? (
              <EmptyRow colSpan={6} />
            ) : (
              stockBatches.results.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium text-slate-900">{medicationName.get(batch.medication) ?? "-"}</TableCell>
                  <TableCell>{batch.batch_number}</TableCell>
                  <TableCell>{formatDate(batch.expiry_date)}</TableCell>
                  <TableCell>{batch.quantity_received}</TableCell>
                  <TableCell>{batch.quantity_remaining}</TableCell>
                  <TableCell className="text-right">
                    <EditLink href={`/pharmacy/stock-batches/${batch.id}/edit/`} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ListSection>
    </div>
  );
}
