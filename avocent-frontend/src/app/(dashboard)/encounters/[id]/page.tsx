import { CrudPanel } from "@/components/shared/crud-panel";
import { EncounterDeleteButton } from "@/components/encounters/encounter-delete-button";
import { EncounterForm } from "@/components/encounters/encounter-form";
import { TriageForm } from "@/components/encounters/triage-form";
import { VitalsDisplay } from "@/components/encounters/vitals-display";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listPractitioners, listUsers } from "@/lib/api/admin";
import { listDiagnoses, listClinicalNotes, listObservations } from "@/lib/api/clinical";
import { getEncounter, listAppointments } from "@/lib/api/encounters";
import { listLabOrders } from "@/lib/api/laboratory";
import { listPatients } from "@/lib/api/patients";
import { listPrescriptions } from "@/lib/api/pharmacy";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { buildPractitionerOptions } from "@/lib/options";
import { hasAnyRole } from "@/lib/rbac";

export default async function EncounterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const isAdmin = hasAnyRole(user, ["Admin"]);

  const [
    encounter,
    observationsResp,
    diagnosesResp,
    prescriptionsResp,
    labOrdersResp,
    clinicalNotesResp,
    patientsResp,
    practitionersResp,
    usersResp,
    appointmentsResp,
  ] = await Promise.all([
    getEncounter(id),
    listObservations(id),
    listDiagnoses(id),
    listPrescriptions(id),
    listLabOrders(id),
    listClinicalNotes(id),
    listPatients({ ordering: "first_name" }),
    listPractitioners(),
    isAdmin ? listUsers() : Promise.resolve({ results: [], count: 0, next: null, previous: null }),
    listAppointments({ ordering: "scheduled_time" }),
  ]);

  const userById = new Map(usersResp.results.map((u) => [u.id, u]));
  const practitionerOptions = buildPractitionerOptions(practitionersResp.results, userById);
  const practitionerLabelById = new Map(practitionerOptions.map((o) => [o.value, o.label]));

  const clinicPatients = patientsResp.results.map((p) => ({
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
  }));

  const patientLabelById = new Map(
    clinicPatients.map((p) => [p.id, `${p.first_name} ${p.last_name}`]),
  );

  const practitioners = practitionersResp.results.map((p) => ({
    id: p.id,
    email: practitionerOptions.find((o) => o.value === p.id)?.label ?? p.id,
  }));

  const appointments = appointmentsResp.results.map((a) => ({
    id: a.id,
    label: [
      patientLabelById.get(a.patient) ?? "Unknown patient",
      practitionerLabelById.get(a.practitioner) ?? `Practitioner ${a.practitioner.slice(0, 8)}`,
      formatDateTime(a.scheduled_time),
    ].join(" • "),
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Encounter detail"
        title={`Encounter ${encounter.id.slice(0, 8)}`}
        description="Active visit record with inline clinical documentation."
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <Card className="border-slate-200/70">
            <CardHeader>
              <CardTitle>Visit summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Started</p>
                <p className="mt-1 font-medium text-slate-900">{formatDateTime(encounter.start_time)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Status</p>
                <div className="mt-2"><StatusBadge value={encounter.status} /></div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Encounter type</p>
                <p className="mt-1 font-medium capitalize text-slate-900">
                  {encounter.encounter_type.replaceAll("_", " ")}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Triage level</p>
                <p className="mt-1 font-medium text-slate-900">{encounter.triage_level.toUpperCase()}</p>
              </div>
            </CardContent>
          </Card>
          <EncounterForm
            mode="edit"
            initialData={encounter}
            clinicPatients={clinicPatients}
            practitioners={practitioners}
            appointments={appointments}
          />
        </div>

        <div className="space-y-4">
          <TriageForm
            encounterId={encounter.id}
            initialData={{
              triage_score: encounter.triage_score,
              triage_level: encounter.triage_level,
              physical_escalation_required: encounter.physical_escalation_required,
            }}
          />
          <Card className="border-rose-200 bg-rose-50/70">
            <CardHeader>
              <CardTitle>Danger zone</CardTitle>
            </CardHeader>
            <CardContent>
              <EncounterDeleteButton encounterId={encounter.id} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="vitals">
        <TabsList variant="line">
          <TabsTrigger value="vitals">Vitals</TabsTrigger>
          <TabsTrigger value="diagnoses">Diagnoses</TabsTrigger>
          <TabsTrigger value="observations">Observations</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="lab-orders">Lab orders</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="vitals" className="pt-4">
          <VitalsDisplay observations={observationsResp.results} />
        </TabsContent>

        <TabsContent value="diagnoses" className="pt-4">
          <CrudPanel
            title="Diagnosis"
            description="ICD-10 diagnoses recorded during this encounter."
            endpoint="/api/proxy/api/clinical/diagnoses/"
            initialItems={diagnosesResp.results}
            fields={[
              { name: "encounter", label: "Encounter", required: true, hidden: true, defaultValue: id },
              { name: "icd10_code", label: "ICD-10 code", required: true },
              { name: "description", label: "Description", type: "textarea", required: true },
              { name: "is_primary", label: "Primary diagnosis", type: "checkbox" },
            ]}
          />
        </TabsContent>

        <TabsContent value="observations" className="pt-4">
          <CrudPanel
            title="Observation"
            description="Clinical observations and measurements for this encounter."
            endpoint="/api/proxy/api/clinical/observations/"
            initialItems={observationsResp.results}
            fields={[
              { name: "encounter", label: "Encounter", required: true, hidden: true, defaultValue: id },
              { name: "name", label: "Name", required: true },
              { name: "value", label: "Value", required: true },
              { name: "unit", label: "Unit" },
              { name: "loinc_code", label: "LOINC code" },
              { name: "reference_range", label: "Reference range" },
              { name: "abnormal_flag", label: "Abnormal flag", type: "checkbox" },
            ]}
          />
        </TabsContent>

        <TabsContent value="prescriptions" className="pt-4">
          <CrudPanel
            title="Prescription"
            description="Prescriptions issued during this encounter."
            endpoint="/api/proxy/api/pharmacy/prescriptions/"
            initialItems={prescriptionsResp.results}
            fields={[
              { name: "encounter", label: "Encounter", required: true, hidden: true, defaultValue: id },
              { name: "prescribed_by", label: "Prescribed by", type: "select", options: practitionerOptions, required: true },
              {
                name: "status",
                label: "Status",
                type: "select",
                required: true,
                options: [
                  { value: "active", label: "Active" },
                  { value: "dispensed", label: "Dispensed" },
                  { value: "cancelled", label: "Cancelled" },
                ],
              },
              { name: "hash_signature", label: "Signature hash", required: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="lab-orders" className="pt-4">
          <CrudPanel
            title="Lab order"
            description="Laboratory orders raised during this encounter."
            endpoint="/api/proxy/api/laboratory/orders/"
            initialItems={labOrdersResp.results}
            fields={[
              { name: "encounter", label: "Encounter", required: true, hidden: true, defaultValue: id },
              { name: "ordered_by", label: "Ordered by", type: "select", options: practitionerOptions, required: true },
              {
                name: "status",
                label: "Status",
                type: "select",
                required: true,
                options: [
                  { value: "ordered", label: "Ordered" },
                  { value: "collected", label: "Collected" },
                  { value: "processing", label: "Processing" },
                  { value: "completed", label: "Completed" },
                ],
              },
              {
                name: "priority",
                label: "Priority",
                type: "select",
                required: true,
                options: [
                  { value: "routine", label: "Routine" },
                  { value: "urgent", label: "Urgent" },
                  { value: "stat", label: "STAT" },
                ],
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="notes" className="pt-4">
          <CrudPanel
            title="Clinical note"
            description="SOAP notes authored during this encounter."
            endpoint="/api/proxy/api/clinical/notes/"
            initialItems={clinicalNotesResp.results}
            fields={[
              { name: "encounter", label: "Encounter", required: true, hidden: true, defaultValue: id },
              { name: "subjective", label: "Subjective", type: "textarea", required: true },
              { name: "objective", label: "Objective", type: "textarea", required: true },
              { name: "assessment", label: "Assessment", type: "textarea", required: true },
              { name: "plan", label: "Plan", type: "textarea", required: true },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
