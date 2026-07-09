import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { listEncounters } from "@/lib/api/encounters";
import { cn } from "@/lib/utils";

type SearchValue = string | string[] | undefined;

function first(searchValue: SearchValue) {
  return Array.isArray(searchValue) ? searchValue[0] : searchValue;
}

export default async function EncountersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchValue>>;
}) {
  const query = await searchParams;
  const encounters = await listEncounters({
    search: first(query.search),
    status: first(query.status),
    encounter_type: first(query.encounter_type),
    ordering: first(query.ordering),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Encounters"
        title="Encounter queue"
        description="This route is the central clinical event stream for appointments, notes, diagnoses, prescriptions, and lab orders."
      />
      <div className="flex justify-end gap-2">
        <Link href="/encounters/availability" className={cn(buttonVariants({ variant: "outline" }))}>
          Manage availability
        </Link>
        <Link href="/encounters/calendar" className={cn(buttonVariants({ variant: "outline" }))}>
          Calendar
        </Link>
        <Link href="/encounters/new" className={cn(buttonVariants())}>
          Add encounter
        </Link>
      </div>

      <Card className="border-slate-200/70">
        <CardContent className="pt-6">
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" method="GET">
            <div className="space-y-2 xl:col-span-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="search">
                Search
              </label>
              <Input id="search" name="search" defaultValue={first(query.search) ?? ""} placeholder="Search by practitioner, patient, or ID" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="status">
                Status
              </label>
              <select id="status" name="status" defaultValue={first(query.status) ?? ""} className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm">
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="encounter_type">
                Encounter type
              </label>
              <select id="encounter_type" name="encounter_type" defaultValue={first(query.encounter_type) ?? ""} className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm">
                <option value="">All types</option>
                <option value="in_person">In person</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="ordering">
                Order by
              </label>
              <select id="ordering" name="ordering" defaultValue={first(query.ordering) ?? "-start_time"} className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm">
                <option value="-start_time">Newest</option>
                <option value="start_time">Oldest</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit">Apply filters</Button>
              <Link href="/encounters" className={cn(buttonVariants({ variant: "outline" }))}>
                Reset
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-200/70">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Start time</TableHead>
                <TableHead>Encounter type</TableHead>
                <TableHead>Triage</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {encounters.results.map((encounter) => (
                <TableRow key={encounter.id}>
                  <TableCell>
                    <Link href={`/encounters/${encounter.id}`} className="font-medium text-slate-950 hover:text-teal-700">
                      {formatDateTime(encounter.start_time)}
                    </Link>
                  </TableCell>
                  <TableCell className="capitalize">{encounter.encounter_type.replaceAll("_", " ")}</TableCell>
                  <TableCell>{encounter.triage_level.toUpperCase()}</TableCell>
                  <TableCell><StatusBadge value={encounter.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
