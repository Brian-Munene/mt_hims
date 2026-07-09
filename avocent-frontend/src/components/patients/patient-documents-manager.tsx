"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { FileText, Download, CheckCircle, XCircle } from "lucide-react";

import { ErrorList } from "@/components/shared/error-list";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/format";
import type { PatientDocument } from "@/lib/types";

async function uploadDocument(patientId: string, formData: FormData) {
  formData.set("patient", patientId);
  const response = await fetch("/api/proxy/api/patients/documents/", {
    method: "POST",
    credentials: "include",
    // Do NOT set Content-Type — browser sets multipart/form-data with boundary automatically
    body: formData,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((payload as { error?: string } | null)?.error ?? `Upload failed (${response.status})`);
  }
  return payload as PatientDocument;
}

async function documentAction(documentId: string, action: "finalise" | "void") {
  const response = await fetch(`/api/proxy/api/patients/documents/${documentId}/${action}/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error((payload as { error?: string } | null)?.error ?? `Action failed (${response.status})`);
  }
}

function UploadForm({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setErrors([]);
        const formData = new FormData(e.currentTarget);
        if (!formData.get("file") || (formData.get("file") as File).size === 0) {
          setErrors(["Please select a file to upload."]);
          return;
        }
        startTransition(async () => {
          try {
            await uploadDocument(patientId, formData);
            formRef.current?.reset();
            router.refresh();
          } catch (error) {
            setErrors([error instanceof Error ? error.message : "Upload failed."]);
          }
        });
      }}
    >
      <ErrorList errors={errors} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800" htmlFor="doc-title">Title</label>
          <Input id="doc-title" name="title" placeholder="e.g. Blood test results" required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800" htmlFor="doc-type">Document type</label>
          <select
            id="doc-type"
            name="document_type"
            defaultValue="report"
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
          >
            <option value="report">Report</option>
            <option value="scan">Scan / Imaging</option>
            <option value="form">Form</option>
            <option value="referral">Referral</option>
            <option value="consent">Consent</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-slate-800" htmlFor="doc-description">Description</label>
          <Input id="doc-description" name="description" placeholder="Optional description" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-slate-800" htmlFor="doc-file">File</label>
          <Input id="doc-file" name="file" type="file" required className="h-auto py-1.5" />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Uploading..." : "Upload document"}
        </Button>
      </div>
    </form>
  );
}

export function PatientDocumentsManager({
  patientId,
  documents,
  canWrite = true,
}: {
  patientId: string;
  documents: PatientDocument[];
  canWrite?: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleAction(doc: PatientDocument, action: "finalise" | "void") {
    const label = action === "void" ? "archive" : "finalise";
    if (!window.confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} "${doc.title}"?`)) return;
    setPendingId(doc.id);
    try {
      await documentAction(doc.id, action);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {canWrite && (
        <Card className="border-slate-200/70">
          <CardHeader>
            <CardTitle>Upload document</CardTitle>
          </CardHeader>
          <CardContent>
            <UploadForm patientId={patientId} />
          </CardContent>
        </Card>
      )}

      {documents.length === 0 ? (
        <p className="text-sm text-slate-400">No documents on file for this patient.</p>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="border-slate-200/70">
              <CardContent className="flex items-start justify-between gap-4 pt-4">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 size-5 shrink-0 text-slate-400" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-950">{doc.title}</p>
                    <p className="text-xs text-slate-500 capitalize">{doc.document_type.replace("_", " ")} · {formatDateTime(doc.created_at)}</p>
                    {doc.description && <p className="text-xs text-slate-500">{doc.description}</p>}
                    <StatusBadge value={doc.is_finalised ? "finalised" : "draft"} />
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {doc.file_url && (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="size-3" />
                      Download
                    </a>
                  )}
                  {canWrite && !doc.is_finalised && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pendingId === doc.id}
                      onClick={() => handleAction(doc, "finalise")}
                      className="h-7 gap-1 text-xs text-emerald-700 hover:text-emerald-800"
                    >
                      <CheckCircle className="size-3" />
                      Finalise
                    </Button>
                  )}
                  {canWrite && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pendingId === doc.id}
                      onClick={() => handleAction(doc, "void")}
                      className="h-7 gap-1 text-xs text-rose-600 hover:text-rose-700"
                    >
                      <XCircle className="size-3" />
                      Archive
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
