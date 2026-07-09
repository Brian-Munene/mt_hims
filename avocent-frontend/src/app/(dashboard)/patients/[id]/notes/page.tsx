import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPatientNotes } from "@/lib/api/patients";

export default async function PatientNotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notes = await listPatientNotes(id);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Patient notes"
        title="Clinical note history"
        description="A patient-level lens over encrypted clinical notes, useful for longitudinal review."
      />

      {notes.results.length ? (
        <div className="grid gap-4">
          {notes.results.map((note) => (
            <Card key={note.id} className="border-slate-200/70">
              <CardHeader>
                <CardTitle className="text-lg">Encounter {note.encounter}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Subjective</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{note.subjective || "No subjective note"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Assessment</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{note.assessment || "No assessment note"}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No patient notes found" description="Patient-scoped note history will appear here when the backend notes action returns records." />
      )}
    </div>
  );
}
