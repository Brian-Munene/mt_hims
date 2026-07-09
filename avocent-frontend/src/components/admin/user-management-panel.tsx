"use client";

import { useState, useTransition } from "react";
import { z } from "zod";

import { ErrorList } from "@/components/shared/error-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BrowserApiError, browserRequest, flattenValidationErrors } from "@/lib/api/browser";
import type { Clinic, PractitionerProfile, RoleRecord, SessionUser } from "@/lib/types";

interface UserManagementPanelProps {
  initialUsers: SessionUser[];
  initialPractitioners: PractitionerProfile[];
  clinics: Clinic[];
  roles: RoleRecord[];
}

const userSchema = z.object({
  clinic: z.string().min(1, "Clinic is required."),
  email: z.string().email("Invalid email address."),
  phone: z.string().min(1, "Phone is required."),
  password: z.string().optional(),
  is_active: z.boolean().optional(),
  is_staff: z.boolean().optional(),
});

const practitionerSchema = z.object({
  license_number: z.string().min(1, "License number is required."),
  specialty: z.string().optional(),
  qualifications: z.string().optional(),
});

export function UserManagementPanel({
  initialUsers,
  initialPractitioners,
  clinics,
  roles,
}: UserManagementPanelProps) {
  const [users, setUsers] = useState<SessionUser[]>(initialUsers);
  const [practitioners, setPractitioners] = useState<PractitionerProfile[]>(initialPractitioners);
  const [errors, setErrors] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form states for creation
  const [isPractitioner, setIsPractitioner] = useState(false);

  function parseFormData(formData: FormData) {
    const rawUser = {
      clinic: String(formData.get("clinic") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      password: String(formData.get("password") || "").trim(),
      is_active: formData.get("is_active") === "on",
      is_staff: formData.get("is_staff") === "on",
    };

    // Remove password if empty so we don't send an empty string
    if (!rawUser.password) {
      delete (rawUser as any).password;
    }

    const parsedUser = userSchema.parse(rawUser);
    const roleId = String(formData.get("role") || "").trim();

    let parsedPractitioner = null;
    if (isPractitioner) {
      const rawPractitioner = {
        license_number: String(formData.get("license_number") || "").trim(),
        specialty: String(formData.get("specialty") || "").trim(),
        qualifications: String(formData.get("qualifications") || "").trim(),
      };
      parsedPractitioner = practitionerSchema.parse(rawPractitioner);
    }

    return { parsedUser, parsedPractitioner, roleId };
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setErrors([]);
    startTransition(async () => {
      try {
        const { parsedUser, parsedPractitioner, roleId } = parseFormData(formData);
        
        let createdUser: SessionUser | undefined;

        if (isPractitioner && parsedPractitioner) {
          // Unified Practitioner Flow
          const roleObj = roles.find(r => r.id === roleId);
          const practitionerPayload = {
            ...parsedPractitioner,
            clinic: parsedUser.clinic,
            user_data: parsedUser,
            assign_roles: roleObj ? [roleObj.name] : [],
          };
          
          const createdPractitioner = await browserRequest<any>("/api/proxy/api/auth/practitioners/", {
            method: "POST",
            body: practitionerPayload,
          });
          
          createdUser = createdPractitioner.user_details || await browserRequest<SessionUser>(`/api/proxy/api/auth/users/?email=${parsedUser.email}`).then(res => (res as any).results?.[0]);
          
          if (!createdUser) {
             // Fallback if user_details is not returned directly, fetch it manually or mock it
             createdUser = {
               id: "refresh-required",
               clinic: parsedUser.clinic,
               email: parsedUser.email,
               phone: parsedUser.phone,
               is_active: parsedUser.is_active || true,
               is_staff: parsedUser.is_staff || false,
               role_names: roleObj ? [roleObj.name as any] : [],
             } as SessionUser;
          } else if (roleObj && !createdUser.role_names) {
              createdUser.role_names = [roleObj.name as any];
          }

          setPractitioners((prev) => [createdPractitioner, ...prev]);
        } else {
          // Standard User Flow
          createdUser = await browserRequest<SessionUser>("/api/proxy/api/auth/users/", {
            method: "POST",
            body: parsedUser,
          });

          if (roleId) {
            try {
              await browserRequest("/api/proxy/api/auth/user-roles/", {
                method: "POST",
                body: {
                  user: createdUser.id,
                  role: roleId,
                  clinic: createdUser.clinic,
                  is_active: true,
                },
              });
              const roleObj = roles.find(r => r.id === roleId);
              if (roleObj && !createdUser.role_names) {
                  createdUser.role_names = [roleObj.name as any];
              }
            } catch (roleError) {
              console.error("Failed to assign role:", roleError);
              setErrors(["User created, but failed to assign role."]);
            }
          }
        }

        if (createdUser) {
          setUsers((prev) => [createdUser as SessionUser, ...prev]);
        }

        form.reset();
        setIsPractitioner(false);
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
        setErrors([error instanceof Error ? error.message : "Unable to save record."]);
      }
    });
  }

  async function handleUpdate(id: string, formData: FormData) {
    setErrors([]);
    startTransition(async () => {
      try {
        const rawUser = {
          clinic: String(formData.get("clinic") || "").trim(),
          email: String(formData.get("email") || "").trim(),
          phone: String(formData.get("phone") || "").trim(),
          password: String(formData.get("password") || "").trim(),
          is_active: formData.get("is_active") === "on",
          is_staff: formData.get("is_staff") === "on",
        };
        if (!rawUser.password) {
          delete (rawUser as any).password;
        }
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
        // Remove associated practitioner if exists
        setPractitioners((prev) => prev.filter((item) => item.user !== id));
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
        <CardTitle>User & Practitioner Management</CardTitle>
        <p className="text-sm text-slate-600">
          Create, update, and deactivate staff users. Optionally create a practitioner profile at the same time.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <ErrorList errors={errors} />

        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
          {/* User Fields */}
          <div className="space-y-2 md:col-span-2 border-b pb-4 mb-2">
            <h3 className="font-semibold text-slate-800">User Account Details</h3>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800" htmlFor="user-clinic">Clinic *</label>
            <select
              id="user-clinic"
              name="clinic"
              required
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
            <label className="text-sm font-medium text-slate-800" htmlFor="user-email">Email *</label>
            <Input id="user-email" name="email" type="email" required />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800" htmlFor="user-phone">Phone *</label>
            <Input id="user-phone" name="phone" required />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800" htmlFor="user-password">Password</label>
            <Input id="user-password" name="password" type="password" placeholder="Leave blank to unset" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800" htmlFor="user-role">Assign Role</label>
            <select
              id="user-role"
              name="role"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
            >
              <option value="">No Role assigned</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 space-y-0 pt-6">
            <div className="flex items-center gap-2">
              <input id="user-is_active" name="is_active" type="checkbox" className="h-4 w-4" defaultChecked />
              <label className="text-sm font-medium text-slate-800" htmlFor="user-is_active">Active</label>
            </div>
            <div className="flex items-center gap-2">
              <input id="user-is_staff" name="is_staff" type="checkbox" className="h-4 w-4" />
              <label className="text-sm font-medium text-slate-800" htmlFor="user-is_staff">Staff</label>
            </div>
          </div>

          {/* Practitioner Toggle & Fields */}
          <div className="space-y-4 md:col-span-2 border-t pt-4 mt-2 bg-slate-50/50 p-4 rounded-lg border border-slate-100">
            <div className="flex items-center gap-2">
              <input
                id="create-practitioner"
                type="checkbox"
                className="h-4 w-4"
                checked={isPractitioner}
                onChange={(e) => setIsPractitioner(e.target.checked)}
              />
              <label className="text-sm font-semibold text-slate-800" htmlFor="create-practitioner">
                Create Practitioner Profile
              </label>
            </div>

            {isPractitioner && (
              <div className="grid gap-4 md:grid-cols-2 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800" htmlFor="practitioner-license">
                    License Number *
                  </label>
                  <Input id="practitioner-license" name="license_number" required={isPractitioner} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800" htmlFor="practitioner-specialty">
                    Specialty
                  </label>
                  <Input id="practitioner-specialty" name="specialty" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-800" htmlFor="practitioner-qualifications">
                    Qualifications
                  </label>
                  <Textarea id="practitioner-qualifications" name="qualifications" />
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Create User"}
            </Button>
          </div>
        </form>

        <div className="space-y-4">
          {users.map((item) => {
            const isEditing = editingId === item.id;
            const userPractitioner = practitioners.find((p) => p.user === item.id);

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
                      <div className="flex items-center gap-4 space-y-0 pt-6">
                        <div className="flex items-center gap-2">
                          <input name="is_active" type="checkbox" className="h-4 w-4" defaultChecked={item.is_active} />
                          <label className="text-sm font-medium text-slate-800">Active</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input name="is_staff" type="checkbox" className="h-4 w-4" defaultChecked={item.is_staff} />
                          <label className="text-sm font-medium text-slate-800">Staff</label>
                        </div>
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
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">ID: {item.id}</p>
                      <div className="grid gap-2 md:grid-cols-2">
                        <p className="text-sm text-slate-700">
                          <span className="font-medium text-slate-900">Email:</span> {item.email}
                        </p>
                        <p className="text-sm text-slate-700">
                          <span className="font-medium text-slate-900">Phone:</span> {item.phone || "-"}
                        </p>
                        <p className="text-sm text-slate-700">
                          <span className="font-medium text-slate-900">Active:</span> {item.is_active ? "Yes" : "No"}
                        </p>
                        <p className="text-sm text-slate-700">
                          <span className="font-medium text-slate-900">Staff:</span> {item.is_staff ? "Yes" : "No"}
                        </p>
                        <p className="text-sm text-slate-700 md:col-span-2">
                          <span className="font-medium text-slate-900">Roles:</span> {item.role_names?.join(", ") || "None"}
                        </p>
                      </div>
                      
                      {userPractitioner && (
                        <div className="mt-2 p-2 bg-slate-50 rounded-md border border-slate-100">
                          <p className="text-xs font-semibold text-slate-700 mb-1">Practitioner Profile</p>
                          <div className="grid gap-2 md:grid-cols-2">
                            <p className="text-sm text-slate-600">
                              <span className="font-medium">License:</span> {userPractitioner.license_number}
                            </p>
                            <p className="text-sm text-slate-600">
                              <span className="font-medium">Specialty:</span> {userPractitioner.specialty || "-"}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setEditingId(item.id)}>
                          Edit User
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
          {!users.length && <p className="text-sm text-slate-500">No records found.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
