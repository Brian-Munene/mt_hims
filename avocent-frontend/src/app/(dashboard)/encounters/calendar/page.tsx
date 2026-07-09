import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays } from "lucide-react";
import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
  subWeeks,
} from "date-fns";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { listAppointments } from "@/lib/api/encounters";
import { requireUser } from "@/lib/auth";
import { assertModuleAccess } from "@/lib/rbac";
import { cn } from "@/lib/utils";

type SearchValue = string | string[] | undefined;

function first(v: SearchValue) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AppointmentCalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchValue>>;
}) {
  const user = await requireUser();
  assertModuleAccess(user, "encounters");

  const query = await searchParams;
  const today = new Date();

  const weekOffset = parseInt(first(query.week) ?? "0", 10);
  const baseDate = weekOffset === 0 ? today : weekOffset > 0
    ? addWeeks(today, weekOffset)
    : subWeeks(today, Math.abs(weekOffset));

  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const appointments = await listAppointments({
    ordering: "scheduled_time",
  });

  const prevWeek = weekOffset - 1;
  const nextWeek = weekOffset + 1;

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
        title="Appointment calendar"
        description="Weekly view of scheduled appointments. Navigate weeks using the arrows below."
      />

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={`?week=${prevWeek}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
        >
          <ArrowLeft className="size-4" />
          Previous week
        </Link>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
          <CalendarDays className="size-4 text-slate-400" />
          {format(weekStart, "d MMM")} – {format(weekEnd, "d MMM yyyy")}
        </div>
        <Link
          href={`?week=${nextWeek}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
        >
          Next week
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {/* Calendar grid */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          const dayAppointments = appointments.results.filter((a) =>
            isSameDay(parseISO(a.scheduled_time), day),
          );

          return (
            <Card
              key={day.toISOString()}
              className={cn(
                "min-h-32 border-slate-200/70",
                isToday && "ring-2 ring-teal-500 ring-offset-2",
              )}
            >
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs font-semibold">
                  <span className={cn("text-slate-500", isToday && "text-teal-600")}>
                    {format(day, "EEE")}
                  </span>
                  <span
                    className={cn(
                      "ml-1.5 inline-flex size-6 items-center justify-center rounded-full text-sm font-bold",
                      isToday
                        ? "bg-teal-600 text-white"
                        : "text-slate-900",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 px-3 pb-3">
                {dayAppointments.length === 0 ? (
                  <p className="text-[10px] text-slate-400">No appointments</p>
                ) : (
                  dayAppointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-2"
                    >
                      <p className="text-[10px] font-medium text-slate-700">
                        {format(parseISO(appt.scheduled_time), "HH:mm")}
                      </p>
                      <p className="mt-0.5 text-[10px] capitalize text-slate-500">
                        {appt.encounter_type.replaceAll("_", " ")}
                      </p>
                      <div className="mt-1">
                        <StatusBadge value={appt.status} />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
