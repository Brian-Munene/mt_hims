import { BookingActionPanel } from "@/components/booking/booking-action-panel";
import { RescheduleButton } from "@/components/booking/reschedule-button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPractitioners, listUsers } from "@/lib/api/admin";
import { requireUser } from "@/lib/auth";
import {
  getBooking,
  listBookingEncounters,
  listBookingEvents,
  listBookingInvoices,
  listBookingQueues,
} from "@/lib/api/booking";
import { formatCurrency, formatDateTime, formatRelative } from "@/lib/format";
import { buildPractitionerOptions } from "@/lib/options";
import { assertModuleAccess, hasAnyRole } from "@/lib/rbac";

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  assertModuleAccess(user, "booking");

  const isAdmin = hasAnyRole(user, ["Admin"]);
  const { id } = await params;
  const [booking, events, queues, encounters, invoices, practitioners, users] = await Promise.all([
    getBooking(id),
    listBookingEvents(id),
    listBookingQueues(id),
    listBookingEncounters(id),
    listBookingInvoices(id),
    listPractitioners(),
    isAdmin ? listUsers() : Promise.resolve({ results: [], count: 0, next: null, previous: null }),
  ]);
  const userById = new Map(users.results.map((staffUser) => [staffUser.id, staffUser]));
  const practitionerOptions = buildPractitionerOptions(practitioners.results, userById);
  const userOptions = users.results.map((staffUser) => ({
    value: staffUser.id,
    label: staffUser.email,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Booking detail"
        title={booking.booking_number}
        description="Review booking state, workflow events, queue assignments, linked encounters, and invoices."
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card className="border-slate-200/70">
            <CardHeader>
              <CardTitle>Booking state</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Status</p>
                <div className="mt-2"><StatusBadge value={booking.status} /></div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Payment</p>
                <div className="mt-2"><StatusBadge value={booking.payment_status} /></div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Booking type</p>
                <p className="mt-1 font-medium capitalize text-slate-900">{booking.booking_type.replaceAll("_", " ")}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Priority</p>
                <p className="mt-1 font-medium capitalize text-slate-900">{booking.priority}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Scheduled time</p>
                <p className="mt-1 font-medium text-slate-900">{booking.scheduled_time ? formatDateTime(booking.scheduled_time) : "Not scheduled"}</p>
                {booking.appointment && (
                  <div className="mt-2">
                    <RescheduleButton appointmentId={booking.appointment} />
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Triage required</p>
                <p className="mt-1 font-medium text-slate-900">{booking.triage_required ? "Yes" : "No"}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Reason for visit</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{booking.reason_for_visit || "No reason captured."}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Notes</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{booking.notes || "No notes captured."}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/70">
            <CardHeader>
              <CardTitle>Workflow timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {events.results.length ? (
                events.results.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-950">{event.event_type}</p>
                      <p className="text-xs text-slate-500">{formatRelative(event.occurred_at)}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {event.from_status ? `${event.from_status} -> ${event.to_status}` : event.to_status || "State update"}
                    </p>
                    {event.notes ? <p className="mt-1 text-sm text-slate-500">{event.notes}</p> : null}
                  </div>
                ))
              ) : (
                <EmptyState title="No workflow events yet" description="Booking events will appear here as the patient moves through the flow." />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <BookingActionPanel bookingId={booking.id} practitionerOptions={practitionerOptions} userOptions={userOptions} />

          <Card className="border-slate-200/70">
            <CardHeader>
              <CardTitle>Queue assignments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {queues.results.length ? (
                queues.results.map((queue) => (
                  <div key={queue.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium capitalize text-slate-950">{queue.queue_type}</p>
                      <StatusBadge value={queue.status} />
                    </div>
                    <p className="mt-2 text-sm text-slate-600">Position {queue.position ?? "Unassigned"}</p>
                  </div>
                ))
              ) : (
                <EmptyState title="No queue assignments yet" description="Queue entries appear here once the booking is routed through operational stations." />
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/70">
            <CardHeader>
              <CardTitle>Linked encounters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {encounters.results.length ? (
                encounters.results.map((encounter) => (
                  <div key={encounter.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-950">{formatDateTime(encounter.start_time)}</p>
                      <StatusBadge value={encounter.status} />
                    </div>
                    <p className="mt-2 text-sm text-slate-600 capitalize">{encounter.encounter_type.replaceAll("_", " ")}</p>
                  </div>
                ))
              ) : (
                <EmptyState title="No encounters linked yet" description="Consultation-driven encounters will appear here." />
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/70">
            <CardHeader>
              <CardTitle>Linked invoices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {invoices.results.length ? (
                invoices.results.map((invoice) => (
                  <div key={invoice.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-950">{formatCurrency(invoice.total_amount)}</p>
                      <StatusBadge value={invoice.status} />
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{invoice.due_date ? `Due ${invoice.due_date}` : "No due date"}</p>
                  </div>
                ))
              ) : (
                <EmptyState title="No invoices linked yet" description="Generated or refreshed booking invoices will appear here." />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
