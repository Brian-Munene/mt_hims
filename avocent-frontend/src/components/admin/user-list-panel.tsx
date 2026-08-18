"use client";

import { useState, useTransition } from "react";
import { z } from "zod";

import { ActiveBadge } from "@/components/shared/active-badge";
import { ErrorList } from "@/components/shared/error-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BrowserApiError, browserRequest, flattenValidationErrors } from "@/lib/api/browser";
import type { Clinic, SessionUser } from "@/lib/types";

interface UserListPanelProps {
  initialUsers: SessionUser[];
  clinics: Clinic[];
}

const userSchema = z.object({
  clinic: z.string().min(1, "Clinic is required."),
  email: z.string().email("Invalid email address."),
  phone: z.string().min(1, "Phone is required."),
  password: z.string().optional(),
  is_active: z.boolean().optional(),
});

export function UserListPanel({ initialUsers, clinics }: UserListPanelProps) {
  const [users, setUsers] = useState<SessionUser[]>(initialUsers);
  const [errors, setErrors] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleUpdate(id: string, formData: FormData) {
    setErrors([]);
    startTransition(async () => {
      try {
        // Omit password when empty so we don't send an empty string
        const password = String(formData.get("password") || "").trim();
        const rawUser = {
          clinic: String(formData.get("clinic") || "").trim(),
          email: String(formData.get("email") || "").trim(),
          phone: String(formData.get("phone") || "").trim(),
          is_active: formData.get("is_active") === "on",
          ...(password ? { password } : {}),
        };
        const payload = userSchema.parse(rawUser);

        const updated = await browserRequest<SessionUser>(`/api/proxy/api/auth/users/${id}/`, {
          method: "PATCH",
          body: payload,
        });

        setUsers((prev) => prev.map((item) => (item.id === id ? updated : item)));
        setEditingId(null);
      } catch (error) {
        if (error instanceof z.ZodError) {
          setErrors(
            Object.values(z.flattenError(error).fieldErrors)
              .flatMap((messages) => messages ?? [])
              .map((message) => String(message))
          );
          return;
        }
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
    if (!window.confirm("Delete this user? This action cannot be undone.")) {
      return;
    }
    setErrors([]);
    startTransition(async () => {
      try {
        await browserRequest(`/api/proxy/api/auth/users/${id}/`, { method: "DELETE" });
        setUsers((prev) => prev.filter((item) => item.id !== id));
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
        <CardTitle>Users</CardTitle>
        <p className="text-sm text-slate-600">
          Update or deactivate staff users.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ErrorList errors={errors} />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-400">
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((item) => {
                const isEditing = editingId === item.id;
                return (
                  <TableRow key={item.id}>
                    {isEditing ? (
                      <TableCell colSpan={5} className="whitespace-normal">
                        <form
                          className="grid gap-4 py-2 md:grid-cols-2"
                          onSubmit={(event) => {
                            event.preventDefault();
                            handleUpdate(item.id, new FormData(event.currentTarget));
                          }}
                        >
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-800">Clinic</label>
                            <select
                              name="clinic"
                              required
                              defaultValue={item.clinic}
                              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                            >
                              <option value="">Select Clinic</option>
                              {clinics.map((clinic) => (
                                <option key={clinic.id} value={clinic.id}>
                                  {clinic.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-800">Email</label>
                            <Input name="email" type="email" required defaultValue={item.email} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-800">Phone</label>
                            <Input name="phone" required defaultValue={item.phone} />
                          </div>
                          <div className="flex items-center gap-2 pt-6">
                            <input name="is_active" type="checkbox" className="h-4 w-4" defaultChecked={item.is_active} />
                            <label className="text-sm font-medium text-slate-800">Active</label>
                          </div>

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
                        <TableCell className="font-medium text-slate-900">{item.email}</TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {item.role_names?.join(", ") || "None"}
                        </TableCell>
                        <TableCell>
                          <ActiveBadge active={item.is_active} />
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{item.phone || "-"}</TableCell>
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
      </CardContent>
    </Card>
  );
}
