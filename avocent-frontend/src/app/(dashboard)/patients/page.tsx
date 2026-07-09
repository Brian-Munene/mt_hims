import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatName } from "@/lib/format";
import { listPatients } from "@/lib/api/patients";
import { requireUser } from "@/lib/auth";
import { canWritePatients } from "@/lib/rbac";
import { cn } from "@/lib/utils";

type SearchValue = string | string[] | undefined;

function first(searchValue: SearchValue) {
  return Array.isArray(searchValue) ? searchValue[0] : searchValue;
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchValue>>;
}) {
  const query = await searchParams;
  const [user, response] = await Promise.all([
    requireUser(),
    listPatients({
      search: first(query.search),
      gender: first(query.gender),
      is_active: first(query.is_active),
      ordering: first(query.ordering),
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          eyebrow="Patients"
          title="Patient registry"
          description="Search, filter, order, and register clinic-scoped patients using the `/api/patients/patients/` endpoint family."
        />
        <div className="flex items-center gap-2">
          <a
            href="/api/proxy/api/patients/patients/export-csv/"
            download="patients.csv"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Export CSV
          </a>
          {canWritePatients(user) && (
            <Link href="/patients/new" className={cn(buttonVariants())}>
              Add Patient
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <Card className="border-slate-200/70">
          <CardHeader>
            <CardTitle>Query patient registry</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" method="GET">
              <div className="space-y-2 xl:col-span-2">
                <label className="text-sm font-medium text-slate-800" htmlFor="search">
                  Search
                </label>
                <Input
                  id="search"
                  name="search"
                  defaultValue={first(query.search) ?? ""}
                  placeholder="Name, phone, email, or SHA number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800" htmlFor="gender">
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  defaultValue={first(query.gender) ?? ""}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                >
                  <option value="">All genders</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800" htmlFor="is_active">
                  Status
                </label>
                <select
                  id="is_active"
                  name="is_active"
                  defaultValue={first(query.is_active) ?? ""}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                >
                  <option value="">All statuses</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800" htmlFor="ordering">
                  Order by
                </label>
                <select
                  id="ordering"
                  name="ordering"
                  defaultValue={first(query.ordering) ?? "first_name"}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                >
                  <option value="first_name">First name</option>
                  <option value="last_name">Last name</option>
                  <option value="-created_at">Newest created</option>
                  <option value="created_at">Oldest created</option>
                  <option value="date_of_birth">Oldest DOB</option>
                  <option value="-date_of_birth">Youngest DOB</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit">Apply filters</Button>
                <Link href="/patients" className={cn(buttonVariants({ variant: "outline" }))}>
                  Reset
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {response.results.length ? (
          <Card className="border-slate-200/70">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Date of birth</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {response.results.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <Link href={`/patients/${patient.id}`} className="font-medium text-slate-950 hover:text-teal-700">
                          {formatName(patient.first_name, patient.last_name)}
                        </Link>
                        <p className="mt-1 text-xs text-slate-500">{patient.email || "No email recorded"}</p>
                      </TableCell>
                      <TableCell className="capitalize">{patient.gender}</TableCell>
                      <TableCell>{formatDate(patient.date_of_birth)}</TableCell>
                      <TableCell>{patient.phone || "No phone"}</TableCell>
                      <TableCell>
                        <StatusBadge value={patient.is_active ? "active" : "inactive"} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <EmptyState title="No patients found" description="Adjust the patient filters or register a new patient record." />
        )}
      </div>
    </div>
  );
}
