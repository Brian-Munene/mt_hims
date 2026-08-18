"use client";

import { useMemo, useState, useTransition } from "react";
import { z } from "zod";

import { ActiveBadge } from "@/components/shared/active-badge";
import { ErrorList } from "@/components/shared/error-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { BrowserApiError, browserRequest, flattenValidationErrors } from "@/lib/api/browser";
import type { FieldOption } from "@/lib/options";

type FieldType = "text" | "textarea" | "number" | "checkbox" | "select" | "datetime-local";

export interface CrudField {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  options?: FieldOption[];
  defaultValue?: string | number | boolean;
  hidden?: boolean;
}

type CrudPanelMode = "create" | "manage" | "full";

interface CrudPanelProps<T extends { id: string }> {
  title: string;
  description: string;
  endpoint: string;
  fields: CrudField[];
  initialItems: T[];
  mode?: CrudPanelMode;
}

function makeSchema(fields: CrudField[]) {
  const entries = fields.map((field) => {
    if (field.type === "checkbox") {
      return [field.name, field.required ? z.boolean() : z.boolean().optional()] as const;
    }
    if (field.type === "number") {
      return [field.name, field.required ? z.coerce.number() : z.coerce.number().optional()] as const;
    }
    return [
      field.name,
      field.required
        ? z.string().trim().min(1, `${field.label} is required.`)
        : z.string().optional(),
    ] as const;
  });

  return z.object(Object.fromEntries(entries));
}

function CrudFields({
  fields,
  titlePrefix,
  getFieldValue,
}: {
  fields: CrudField[];
  titlePrefix?: string;
  getFieldValue: (field: CrudField) => unknown;
}) {
  return (
    <>
      {fields.map((field) => {
        const rawValue = getFieldValue(field);
        return (
          <div key={field.name} className="space-y-2">
            {field.hidden ? (
              <input name={field.name} defaultValue={String(rawValue)} hidden />
            ) : (
              <>
                <label
                  className="text-sm font-medium text-slate-800"
                  htmlFor={titlePrefix ? `${titlePrefix}-${field.name}` : undefined}
                >
                  {field.label}
                </label>
                {field.type === "textarea" ? (
                  <Textarea
                    id={titlePrefix ? `${titlePrefix}-${field.name}` : undefined}
                    name={field.name}
                    required={field.required}
                    defaultValue={String(rawValue)}
                  />
                ) : field.type === "select" ? (
                  <select
                    id={titlePrefix ? `${titlePrefix}-${field.name}` : undefined}
                    name={field.name}
                    required={field.required}
                    defaultValue={String(rawValue)}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                  >
                    <option value="">Select</option>
                    {(field.options ?? []).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "checkbox" ? (
                  <input
                    id={titlePrefix ? `${titlePrefix}-${field.name}` : undefined}
                    name={field.name}
                    type="checkbox"
                    defaultChecked={Boolean(rawValue)}
                    className="h-4 w-4"
                  />
                ) : (
                  <Input
                    id={titlePrefix ? `${titlePrefix}-${field.name}` : undefined}
                    name={field.name}
                    required={field.required}
                    type={field.type === "number" || field.type === "datetime-local" ? field.type : "text"}
                    defaultValue={String(rawValue)}
                  />
                )}
              </>
            )}
          </div>
        );
      })}
    </>
  );
}

export function CrudPanel<T extends { id: string }>({
  title,
  description,
  endpoint,
  fields,
  initialItems,
  mode = "full",
}: CrudPanelProps<T>) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [errors, setErrors] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const schema = useMemo(() => makeSchema(fields), [fields]);
  const visibleFields = fields.filter((field) => !field.hidden);

  function getDefaultValue(item: Record<string, unknown>, field: CrudField): unknown {
    const value = item[field.name];
    if (field.type === "checkbox") return Boolean(value);
    if (field.type === "datetime-local" && typeof value === "string") return value.slice(0, 16);
    return typeof value === "string" || typeof value === "number" ? String(value) : "";
  }

  function parseFormData(formData: FormData) {
    const raw: Record<string, unknown> = {};
    fields.forEach((field) => {
      if (field.type === "checkbox") {
        raw[field.name] = formData.get(field.name) === "on";
        return;
      }
      const fallback = field.defaultValue === undefined ? "" : String(field.defaultValue);
      const value = String(formData.get(field.name) ?? fallback).trim();
      raw[field.name] = value === "" && !field.required ? undefined : value;
    });
    return schema.parse(raw);
  }

  async function handleCreate(formData: FormData) {
    setErrors([]);
    startTransition(async () => {
      try {
        const payload = parseFormData(formData);
        const created = await browserRequest<T>(endpoint, { method: "POST", body: payload });
        setItems((prev) => [created, ...prev]);
        formData.forEach((_, key) => formData.set(key, ""));
      } catch (error) {
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
        setErrors([error instanceof Error ? error.message : "Unable to save record."]);
      }
    });
  }

  async function handleUpdate(id: string, formData: FormData) {
    setErrors([]);
    startTransition(async () => {
      try {
        const payload = parseFormData(formData);
        const updated = await browserRequest<T>(`${endpoint}${id}/`, { method: "PATCH", body: payload });
        setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
        setEditingId(null);
      } catch (error) {
        if (error instanceof BrowserApiError) {
          const backendErrors = flattenValidationErrors(error.details);
          setErrors(backendErrors.length ? backendErrors : [error.message]);
          return;
        }
        setErrors([error instanceof Error ? error.message : "Unable to update record."]);
      }
    });
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this record? This action cannot be undone.")) {
      return;
    }
    setErrors([]);
    startTransition(async () => {
      try {
        await browserRequest(`${endpoint}${id}/`, { method: "DELETE" });
        setItems((prev) => prev.filter((item) => item.id !== id));
      } catch (error) {
        if (error instanceof BrowserApiError) {
          const backendErrors = flattenValidationErrors(error.details);
          setErrors(backendErrors.length ? backendErrors : [error.message]);
          return;
        }
        setErrors([error instanceof Error ? error.message : "Unable to delete record."]);
      }
    });
  }

  return (
    <Card className="border-slate-200/70">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-slate-600">{description}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <ErrorList errors={errors} />

        {mode !== "manage" && (
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              handleCreate(new FormData(event.currentTarget));
              event.currentTarget.reset();
            }}
          >
            <CrudFields
              fields={fields}
              titlePrefix={title}
              getFieldValue={(field) => field.defaultValue ?? ""}
            />
            <div className="md:col-span-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : `Create ${title}`}
              </Button>
            </div>
          </form>
        )}

        {mode === "manage" && (
          <Table>
            <TableHeader>
              <TableRow>
                {visibleFields.map((field) => (
                  <TableHead key={field.name}>{field.label}</TableHead>
                ))}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleFields.length + 1} className="py-8 text-center text-sm text-slate-400">
                    No records found.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const record = item as Record<string, unknown>;
                  const isEditing = editingId === item.id;
                  return (
                    <TableRow key={item.id}>
                      {isEditing ? (
                        <TableCell colSpan={visibleFields.length + 1} className="whitespace-normal">
                          <form
                            className="grid gap-4 py-2 md:grid-cols-2"
                            onSubmit={(event) => {
                              event.preventDefault();
                              handleUpdate(item.id, new FormData(event.currentTarget));
                            }}
                          >
                            <CrudFields
                              fields={fields}
                              getFieldValue={(field) => getDefaultValue(record, field)}
                            />
                            <div className="flex gap-2 md:col-span-2">
                              <Button type="submit" disabled={isPending}>
                                {isPending ? "Saving..." : "Save changes"}
                              </Button>
                              <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
                                Cancel
                              </Button>
                            </div>
                          </form>
                        </TableCell>
                      ) : (
                        <>
                          {visibleFields.map((field, index) => (
                            <TableCell
                              key={field.name}
                              className={index === 0 ? "font-medium text-slate-900" : "text-sm text-slate-600"}
                            >
                              {field.type === "checkbox" ? (
                                <ActiveBadge
                                  active={Boolean(record[field.name])}
                                  {...(field.name === "is_active"
                                    ? {}
                                    : { activeLabel: "Yes", inactiveLabel: "No" })}
                                />
                              ) : (
                                String(record[field.name] ?? "-")
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(item.id)}>
                                Edit
                              </Button>
                              <Button type="button" size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}

        {mode === "full" && (
        <div className="space-y-4">
          {items.map((item) => {
            const isEditing = editingId === item.id;
            return (
              <Card key={item.id}>
                <CardContent className="space-y-4 pt-4">
                  {isEditing ? (
                    <form
                      className="grid gap-4 md:grid-cols-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleUpdate(item.id, new FormData(event.currentTarget));
                      }}
                    >
                      <CrudFields
                        fields={fields}
                        getFieldValue={(field) => getDefaultValue(item as Record<string, unknown>, field)}
                      />
                      <div className="flex gap-2 md:col-span-2">
                        <Button type="submit" disabled={isPending}>
                          {isPending ? "Saving..." : "Save changes"}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">ID: {item.id}</p>
                      <div className="grid gap-2 md:grid-cols-2">
                        {fields.slice(0, 6).map((field) => (
                          <p key={field.name} className="text-sm text-slate-700">
                            <span className="font-medium text-slate-900">{field.label}:</span>{" "}
                            {String((item as Record<string, unknown>)[field.name] ?? "-")}
                          </p>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setEditingId(item.id)}>
                          Edit
                        </Button>
                        <Button type="button" variant="destructive" onClick={() => handleDelete(item.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {!items.length && <p className="text-sm text-slate-500">No records found.</p>}
        </div>
        )}
      </CardContent>
    </Card>
  );
}
