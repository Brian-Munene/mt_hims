import { CrudPanel } from "@/components/shared/crud-panel";
import { PageHeader } from "@/components/shared/page-header";
import { listEncounters } from "@/lib/api/encounters";
import { listPatients } from "@/lib/api/patients";
import { listChatStates, listTelemedicineSessions } from "@/lib/api/telemedicine";
import { requireUser } from "@/lib/auth";
import { buildEncounterOptions, buildPatientOptions } from "@/lib/options";
import { assertModuleAccess } from "@/lib/rbac";

export default async function TelemedicinePage() {
  const user = await requireUser();
  assertModuleAccess(user, "telemedicine");

  const [sessions, chats, encounters, patients] = await Promise.all([
    listTelemedicineSessions(),
    listChatStates(),
    listEncounters({ ordering: "-start_time" }),
    listPatients({ ordering: "first_name" }),
  ]);
  const patientOptions = buildPatientOptions(patients.results);
  const encounterOptions = buildEncounterOptions(encounters.results);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Telemedicine"
        title="Remote care sessions"
        description="A foundation for session lists, linked chat state, and a polling-first real-time strategy."
      />
      <CrudPanel
        title="Session"
        description="Create, update, and end telemedicine sessions."
        endpoint="/api/proxy/api/telemedicine/sessions/"
        initialItems={sessions.results}
        fields={[
          { name: "patient", label: "Patient", type: "select", options: patientOptions, required: true },
          { name: "encounter", label: "Encounter", type: "select", options: encounterOptions, required: true },
          {
            name: "session_type",
            label: "Session type",
            type: "select",
            required: true,
            options: [
              { value: "video", label: "Video" },
              { value: "chat", label: "Chat" },
            ],
          },
          { name: "session_link", label: "Session link", required: true },
          { name: "status", label: "Status", required: true },
          { name: "start_time", label: "Start time", type: "datetime-local", required: true },
          { name: "end_time", label: "End time", type: "datetime-local" },
        ]}
      />
      <CrudPanel
        title="Chat state"
        description="Manage chat workflow state records."
        endpoint="/api/proxy/api/telemedicine/chat-states/"
        initialItems={chats.results}
        fields={[
          { name: "patient_phone", label: "Patient phone", required: true },
          { name: "current_state", label: "Current state", required: true },
          { name: "encounter", label: "Encounter", type: "select", options: encounterOptions },
        ]}
      />
    </div>
  );
}

