"use client";

import { useState, useTransition } from "react";
import { z } from "zod";

import { ErrorList } from "@/components/shared/error-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BrowserApiError, browserRequest, flattenValidationErrors } from "@/lib/api/browser";
import type { Clinic, RoleRecord, SessionUser } from "@/lib/types";

interface UserCreatePanelProps {
  clinics: Clinic[];
  roles: RoleRecord[];
}

const userSchema = z.object({
  clinic: z.string().min(1, "Clinic is required."),
  email: z.string().email("Invalid email address."),
  phone: z.string().min(1, "Phone is required."),
  password: z.string().optional(),
  is_active: z.boolean().optional(),
});

const practitionerSchema = z.object({
  license_number: z.string().min(1, "License number is required."),
  specialty: z.string().optional(),
  qualifications: z.string().optional(),
});

export function UserCreatePanel({ clinics, roles }: UserCreatePanelProps) {
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isPractitioner, setIsPractitioner] = useState(false);

  function parseFormData(formData: FormData) {
    // Omit password when empty so we don't send an empty string
    const password = String(formData.get("password") || "").trim();
    const rawUser = {
      clinic: String(formData.get("clinic") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      is_active: formData.get("is_active") === "on",
      ...(password ? { password } : {}),
    };

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
    setSuccessMessage(null);
    startTransition(async () => {
      try {
        const { parsedUser, parsedPractitioner, roleId } = parseFormData(formData);
        const roleObj = roles.find((r) => r.id === roleId);

        if (isPractitioner && parsedPractitioner) {
          // Unified Practitioner Flow
          const practitionerPayload = {
            ...parsedPractitioner,
            clinic: parsedUser.clinic,
            user_data: parsedUser,
            assign_roles: roleObj ? [roleObj.name] : [],
          };

          await browserRequest("/api/proxy/api/auth/practitioners/", {
            method: "POST",
            body: practitionerPayload,
          });
        } else {
          // Standard User Flow
          const createdUser = await browserRequest<SessionUser>("/api/proxy/api/auth/users/", {
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
            } catch (roleError) {
              console.error("Failed to assign role:", roleError);
              setErrors(["User created, but failed to assign role."]);
            }
          }
        }

        setSuccessMessage(
          `${isPractitioner ? "Practitioner" : "User"} ${parsedUser.email} created.`,
        );
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

  return (
    <Card className="border-slate-200/70">
      <CardHeader>
        <CardTitle>Create User</CardTitle>
        <p className="text-sm text-slate-600">
          Create a staff user account. Optionally create a practitioner profile at the same time.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <ErrorList errors={errors} />
        {successMessage && (
          <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
            {successMessage}
          </p>
        )}

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
              defaultValue={clinics.length === 1 ? clinics[0].id : ""}
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
      </CardContent>
    </Card>
  );
}
