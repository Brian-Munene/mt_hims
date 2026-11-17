"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { z } from "zod";

import {
  CrudFields,
  makeSchema,
  parseCrudFormData,
  recordFieldValue,
  type CrudField,
} from "@/components/shared/crud-panel";
import { ErrorList } from "@/components/shared/error-list";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrowserApiError, browserRequest, flattenValidationErrors } from "@/lib/api/browser";

interface RecordFormProps {
  title: string;
  description?: string;
  /** Collection endpoint, e.g. "/api/proxy/api/pharmacy/medications/". */
  endpoint: string;
  fields: CrudField[];
  /** Where to go after a successful save, delete, or cancel. */
  redirectTo: string;
  /** Present when editing: the record being edited. */
  record?: { id: string } & Record<string, unknown>;
  allowDelete?: boolean;
}

/** A single-record create/edit form that redirects on success. */
export function RecordForm({ title, description, endpoint, fields, redirectTo, record, allowDelete }: RecordFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const schema = useMemo(() => makeSchema(fields), [fields]);

  function finish() {
    router.push(redirectTo);
    router.refresh();
  }

  function showError(error: unknown, fallback: string) {
    if (error instanceof z.ZodError) {
      setErrors(
        Object.values(z.flattenError(error).fieldErrors)
          .flatMap((messages) => messages ?? [])
          .map((message) => String(message)),
      );
      return;
    }
    if (error instanceof BrowserApiError) {
      const backendErrors = flattenValidationErrors(error.details);
      setErrors(backendErrors.length ? backendErrors : [error.message]);
      return;
    }
    setErrors([error instanceof Error ? error.message : fallback]);
  }

  function handleSubmit(formData: FormData) {
    setErrors([]);
    startTransition(async () => {
      try {
        const payload = parseCrudFormData(fields, schema, formData);
        await browserRequest(record ? `${endpoint}${record.id}/` : endpoint, {
          method: record ? "PATCH" : "POST",
          body: payload,
        });
        finish();
      } catch (error) {
        showError(error, "Unable to save record.");
      }
    });
  }

  function handleDelete() {
    if (!record || !window.confirm("Delete this record? This action cannot be undone.")) {
      return;
    }
    setErrors([]);
    startTransition(async () => {
      try {
        await browserRequest(`${endpoint}${record.id}/`, { method: "DELETE" });
        finish();
      } catch (error) {
        showError(error, "Unable to delete record.");
      }
    });
  }

  return (
    <Card className="border-slate-200/70">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <p className="text-sm text-slate-600">{description}</p> : null}
      </CardHeader>
      <CardContent className="space-y-6">
        <ErrorList errors={errors} />
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit(new FormData(event.currentTarget));
          }}
        >
          <CrudFields
            fields={fields}
            titlePrefix={title}
            getFieldValue={(field) => (record ? recordFieldValue(record, field) : (field.defaultValue ?? ""))}
          />
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : record ? "Save changes" : "Create"}
            </Button>
            <Link href={redirectTo} className={buttonVariants({ variant: "outline" })}>
              Cancel
            </Link>
            {record && allowDelete ? (
              <Button type="button" variant="destructive" className="ml-auto" disabled={isPending} onClick={handleDelete}>
                Delete
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
