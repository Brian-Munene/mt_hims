import { QueueColumn } from "@/components/booking/queue-column";
import { PageHeader } from "@/components/shared/page-header";
import { listQueueBoard } from "@/lib/api/booking";
import { requireUser } from "@/lib/auth";
import { assertModuleAccess } from "@/lib/rbac";

const QUEUE_TYPES = [
  "reception",
  "triage",
  "consultation",
  "laboratory",
  "pharmacy",
  "billing",
] as const;

export default async function QueueBoardPage() {
  const user = await requireUser();
  assertModuleAccess(user, "queue");

  const allQueues = await listQueueBoard();

  const byType = new Map<string, typeof allQueues.results>(
    QUEUE_TYPES.map((t) => [t, []]),
  );
  for (const entry of allQueues.results) {
    byType.get(entry.queue_type)?.push(entry);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Booking"
        title="Queue board"
        description="Live view of all operational queues across reception, triage, consultation, laboratory, pharmacy, and billing."
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {QUEUE_TYPES.map((queueType) => (
          <div key={queueType} className="rounded-2xl border border-slate-200/70 bg-white/60 p-4">
            <QueueColumn
              queueType={queueType}
              entries={byType.get(queueType) ?? []}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
