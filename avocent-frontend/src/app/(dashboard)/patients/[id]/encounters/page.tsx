import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { listPatientEncounters } from "@/lib/api/patients";

export default async function PatientEncountersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const encounters = await listPatientEncounters(id);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Patient encounters"
        title="Encounter history"
        description="Every patient-centered workflow eventually rolls up into an encounter timeline."
      />

      {encounters.results.length ? (
        <Card className="border-slate-200/70">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Encounter</TableHead>
                  <TableHead>Type</TableHead>
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
                    <TableCell className="uppercase">{encounter.triage_level}</TableCell>
                    <TableCell><StatusBadge value={encounter.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <EmptyState title="No encounters yet" description="Encounter history for this patient will render here once the API returns related visits." />
      )}
    </div>
  );
}

