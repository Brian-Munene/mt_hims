"use client";

import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Medication } from "@/lib/types";

interface InteractionWarningProps {
  selectedMedications: Medication[];
}

export function InteractionWarning({ selectedMedications }: InteractionWarningProps) {
  const controlled = selectedMedications.filter((m) => m.is_controlled);

  if (controlled.length < 2) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/70">
      <CardContent className="flex gap-3 pt-4">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-amber-900">Controlled substance review required</p>
          <p className="text-xs text-amber-700">
            This prescription includes {controlled.length} controlled substances. Verify dosage
            combinations and document clinical justification before dispensing.
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {controlled.map((m) => (
              <Badge
                key={m.id}
                className="border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-100"
              >
                {m.generic_name} {m.strength}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
