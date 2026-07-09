import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PatientForm } from "@/components/patients/patient-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/auth";
import { canWritePatients } from "@/lib/rbac";

export default async function NewPatientPage() {
  const user = await requireUser();
  if (!canWritePatients(user)) {
    redirect("/patients");
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/patients"
          className="inline-flex h-7 items-center justify-center gap-1.5 rounded-lg border border-transparent px-2.5 text-sm font-medium whitespace-nowrap text-slate-700 hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to patients
        </Link>
      </div>

      <PageHeader
        eyebrow="Patients"
        title="Register new patient"
        description="Add a new patient record to the clinic registry."
      />

      <div className="max-w-2xl">
        <PatientForm mode="create" />
      </div>
    </div>
  );
}