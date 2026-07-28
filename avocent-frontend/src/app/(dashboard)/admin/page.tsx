import { UserManagementPanel } from "@/components/admin/user-management-panel";
import { CrudPanel } from "@/components/shared/crud-panel";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { listClinics, listDepartments, listEmailLogs, listPractitioners, listRoles, listUsers } from "@/lib/api/admin";
import { requireUser } from "@/lib/auth";
import { assertModuleAccess } from "@/lib/rbac";
import { formatDateTime } from "@/lib/format";

export default async function AdminPage() {
  const user = await requireUser();
  assertModuleAccess(user, "admin");

  const [users, roles, clinics, practitioners, departments, emailLogs] = await Promise.all([
    listUsers(),
    listRoles(),
    listClinics(),
    listPractitioners(),
    listDepartments(),
    listEmailLogs(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title="Users and role governance"
        description="Admin-only operational controls for staff accounts, RBAC roles, and clinic-wide settings."
      />
      <UserManagementPanel
        initialUsers={users.results}
        initialPractitioners={practitioners.results}
        clinics={clinics.results}
        roles={roles.results}
      />
      <CrudPanel
        title="Role"
        description="Manage RBAC roles."
        endpoint="/api/proxy/api/auth/roles/"
        initialItems={roles.results}
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "description", label: "Description", type: "textarea", required: true },
          { name: "is_active", label: "Active", type: "checkbox" },
        ]}
      />
      <CrudPanel
        title="Clinic"
        description="Manage clinic records."
        endpoint="/api/proxy/api/organization/clinics/"
        initialItems={clinics.results}
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "registration_number", label: "Registration number", required: true },
          { name: "is_active", label: "Active", type: "checkbox" },
        ]}
      />

      <CrudPanel
        title="Department"
        description="Manage clinic departments. Practitioners can be assigned to a department."
        endpoint="/api/proxy/api/auth/departments/"
        initialItems={departments.results}
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "code", label: "Code", required: true },
        ]}
      />

      <Card className="border-slate-200/70">
        <CardHeader>
          <CardTitle>Email log</CardTitle>
          <p className="text-sm text-slate-500">Record of all outbound emails sent by the system (appointment reminders, lab result notifications).</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emailLogs.results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-400">
                    No emails sent yet. Configure SMTP credentials in your environment to enable email notifications.
                  </TableCell>
                </TableRow>
              ) : (
                emailLogs.results.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">{log.recipient_email}</TableCell>
                    <TableCell className="text-sm">{log.subject}</TableCell>
                    <TableCell className="capitalize text-sm text-slate-600">{log.event_type.replaceAll("_", " ")}</TableCell>
                    <TableCell><StatusBadge value={log.status} /></TableCell>
                    <TableCell className="text-sm text-slate-600">{formatDateTime(log.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
