import type { Encounter, Medication, Patient, PractitionerProfile, SessionUser } from "@/lib/types";

export interface FieldOption {
  value: string;
  label: string;
}

export function buildPractitionerOptions(
  practitioners: PractitionerProfile[],
  userById: Map<string, SessionUser>,
): FieldOption[] {
  return practitioners.map((practitioner) => ({
    value: practitioner.id,
    label:
      [userById.get(practitioner.user)?.email, practitioner.specialty, practitioner.license_number]
        .filter(Boolean)
        .join(" • ") || `Practitioner ${practitioner.id.slice(0, 8)}`,
  }));
}

export function buildEncounterOptions(encounters: Encounter[]): FieldOption[] {
  return encounters.map((encounter) => ({
    value: encounter.id,
    label: `Encounter ${encounter.id.slice(0, 8)}`,
  }));
}

export function buildPatientOptions(patients: Patient[]): FieldOption[] {
  return patients.map((patient) => ({
    value: patient.id,
    label: `${patient.first_name} ${patient.last_name}`,
  }));
}

export function buildMedicationOptions(medications: Medication[]): FieldOption[] {
  return medications.map((medication) => ({
    value: medication.id,
    label: medication.name,
  }));
}
