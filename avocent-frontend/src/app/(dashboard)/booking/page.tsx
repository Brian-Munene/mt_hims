import Link from "next/link";

import { CreateBookingForm } from "@/components/booking/create-booking-form";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listClinics, listPractitioners, listUsers } from "@/lib/api/admin";
import { requireUser } from "@/lib/auth";
import { getBookingSummary, listBookings } from "@/lib/api/booking";
import { listAppointments } from "@/lib/api/encounters";
import { listPatients } from "@/lib/api/patients";
import { formatDateTime } from "@/lib/format";
import { buildPractitionerOptions } from "@/lib/options";
import { assertModuleAccess, hasAnyRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";

type SearchValue = string | string[] | undefined;

function first(searchValue: SearchValue) {
  return Array.isArray(searchValue) ? searchValue[0] : searchValue;
}

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchValue>>;
}) {
  const user = await requireUser();
  assertModuleAccess(user, "booking");

  const query = await searchParams;
  const isAdmin = hasAnyRole(user, ["Admin"]);
  const [bookings, summary, patients, appointments, practitioners, users, clinics] = await Promise.all([
    listBookings({
      search: first(query.search),
      status: first(query.status),
      payment_status: first(query.payment_status),
      booking_type: first(query.booking_type),
      priority: first(query.priority),
      ordering: first(query.ordering),
    }),
    getBookingSummary(),
    listPatients({ ordering: "first_name" }),
    listAppointments({ status: "scheduled", ordering: "scheduled_time" }),
    listPractitioners(),
    isAdmin ? listUsers() : Promise.resolve({ results: [], count: 0, next: null, previous: null }),
    isAdmin ? listClinics() : Promise.resolve({ results: [], count: 0, next: null, previous: null }),
  ]);

  const patientLabelById = new Map(
    patients.results.map((patient) => [patient.id, `${patient.first_name} ${patient.last_name}`]),
  );
  const userById = new Map(users.results.map((staffUser) => [staffUser.id, staffUser]));
  const practitionerOptions = buildPractitionerOptions(practitioners.results, userById);
  const practitionerLabelById = new Map(practitionerOptions.map((o) => [o.value, o.label]));
  const appointmentOptions = appointments.results.map((appointment) => ({
    value: appointment.id,
    label: [
      patientLabelById.get(appointment.patient) ?? "Unknown patient",
      practitionerLabelById.get(appointment.practitioner) ?? `Practitioner ${appointment.practitioner.slice(0, 8)}`,
      formatDateTime(appointment.scheduled_time),
    ].join(" • "),
  }));
  const clinicOptions = clinics.results.map((clinic) => ({
    value: clinic.id,
    label: `${clinic.name} (${clinic.code})`,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Booking"
        title="Booking and patient flow"
        description="Create bookings, monitor operational queues, and drive patients through arrival, triage, consultation, billing, and checkout."
      />

      {/* Summary stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total bookings", value: summary.total_bookings },
          { label: "Active bookings", value: summary.active_bookings },
          { label: "Completed today", value: summary.completed_today },
        ].map(({ label, value }) => (
          <Card key={label} className="border-slate-200/70">
            <CardContent className="pt-6">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-slate-200/70">
        <CardContent className="pt-6">
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" method="GET">
            <div className="space-y-2 xl:col-span-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="search">Search</label>
              <Input id="search" name="search" defaultValue={first(query.search) ?? ""} placeholder="Booking number, patient name, or visit reason" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="status">Status</label>
              <select id="status" name="status" defaultValue={first(query.status) ?? ""} className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm">
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="arrived">Arrived</option>
                <option value="waiting_triage">Waiting triage</option>
                <option value="in_consultation">In consultation</option>
                <option value="waiting_billing">Waiting billing</option>
                <option value="ready_for_checkout">Ready for checkout</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="booking_type">Type</label>
              <select id="booking_type" name="booking_type" defaultValue={first(query.booking_type) ?? ""} className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm">
                <option value="">All types</option>
                <option value="walk_in">Walk in</option>
                <option value="scheduled">Scheduled</option>
                <option value="telemedicine">Telemedicine</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="payment_status">Payment</label>
              <select id="payment_status" name="payment_status" defaultValue={first(query.payment_status) ?? ""} className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm">
                <option value="">All payment states</option>
                <option value="not_paid">Not paid</option>
                <option value="partially_paid">Partially paid</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="priority">Priority</label>
              <select id="priority" name="priority" defaultValue={first(query.priority) ?? ""} className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm">
                <option value="">All priorities</option>
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="ordering">Order by</label>
              <select id="ordering" name="ordering" defaultValue={first(query.ordering) ?? "-created_at"} className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm">
                <option value="-created_at">Newest created</option>
                <option value="created_at">Oldest created</option>
                <option value="-scheduled_time">Latest scheduled</option>
                <option value="scheduled_time">Earliest scheduled</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit">Apply filters</Button>
              <Link href="/booking" className={cn(buttonVariants({ variant: "outline" }))}>Reset</Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Bookings table */}
      <Card className="border-slate-200/70">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Scheduled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-400">
                    No bookings found. Adjust the filters or create a new booking below.
                  </TableCell>
                </TableRow>
              ) : (
                bookings.results.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <Link href={`/booking/${booking.id}`} className="font-medium text-slate-950 hover:text-teal-700">
                        {booking.booking_number}
                      </Link>
                      {booking.reason_for_visit && (
                        <p className="mt-0.5 text-xs text-slate-500">{booking.reason_for_visit}</p>
                      )}
                    </TableCell>
                    <TableCell className="capitalize">{booking.booking_type.replaceAll("_", " ")}</TableCell>
                    <TableCell className="capitalize">{booking.priority}</TableCell>
                    <TableCell><StatusBadge value={booking.status} /></TableCell>
                    <TableCell><StatusBadge value={booking.payment_status} /></TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {booking.scheduled_time ? formatDateTime(booking.scheduled_time) : "Walk in"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create booking */}
      <CreateBookingForm
        patients={patients.results}
        appointments={appointmentOptions}
        practitioners={practitionerOptions}
        clinics={clinicOptions}
      />
    </div>
  );
}
