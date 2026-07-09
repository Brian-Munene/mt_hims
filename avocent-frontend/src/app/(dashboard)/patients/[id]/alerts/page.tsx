import { CrudPanel } from "@/components/shared/crud-panel";
import { PageHeader } from "@/components/shared/page-header";
import { listPatientAlerts } from "@/lib/api/patients";

export default async function PatientAlertsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const alerts = await listPatientAlerts(id);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Patient alerts"
        title="Clinical alerts"
        description="Active warnings and flags that appear on the patient detail page for all clinical staff."
      />
      <CrudPanel
        title="Alert"
        description="Create, edit, and archive patient alerts. Active critical and warning alerts appear as banners on the patient view."
        endpoint="/api/proxy/api/patients/alerts/"
        initialItems={alerts.results}
        fields={[
          { name: "patient", label: "Patient", required: true, hidden: true, defaultValue: id },
          {
            name: "alert_type",
            label: "Alert type",
            type: "select",
            required: true,
            options: [
              { value: "allergy", label: "Allergy" },
              { value: "medication", label: "Medication" },
              { value: "clinical", label: "Clinical" },
              { value: "administrative", label: "Administrative" },
              { value: "other", label: "Other" },
            ],
          },
          {
            name: "severity",
            label: "Severity",
            type: "select",
            required: true,
            options: [
              { value: "info", label: "Info" },
              { value: "warning", label: "Warning" },
              { value: "critical", label: "Critical" },
            ],
          },
          { name: "message", label: "Message", type: "textarea", required: true },
        ]}
      />
    </div>
  );
}
