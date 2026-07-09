import { redirect } from "next/navigation";

import type { RoleName, SessionUser } from "@/lib/types";

type ModuleKey =
  | "dashboard"
  | "booking"
  | "patients"
  | "encounters"
  | "clinical"
  | "laboratory"
  | "pharmacy"
  | "billing"
  | "telemedicine"
  | "admin"
  | "queue"
  | "compliance"
  | "policies";

const roleAccess: Record<ModuleKey, RoleName[]> = {
  dashboard: ["Admin", "Doctor", "Nurse", "Lab Technician", "Pharmacist", "Receptionist"],
  booking: ["Admin", "Doctor", "Nurse", "Lab Technician", "Pharmacist", "Receptionist"],
  patients: ["Admin", "Doctor", "Nurse", "Lab Technician", "Pharmacist", "Receptionist"],
  encounters: ["Admin", "Doctor", "Nurse", "Receptionist"],
  clinical: ["Admin", "Doctor", "Nurse"],
  laboratory: ["Admin", "Doctor", "Lab Technician"],
  pharmacy: ["Admin", "Doctor", "Pharmacist"],
  billing: ["Admin", "Receptionist", "Accountant"],
  telemedicine: ["Admin", "Doctor", "Nurse"],
  admin: ["Admin"],
  queue: ["Admin", "Doctor", "Nurse", "Lab Technician", "Pharmacist", "Receptionist"],
  compliance: ["Admin"],
  policies: ["Admin"],
};

export function hasAnyRole(user: SessionUser, allowed: RoleName[]) {
  return user.role_names.some((role) => allowed.includes(role));
}

export function canAccessModule(user: SessionUser, module: ModuleKey) {
  return hasAnyRole(user, roleAccess[module]);
}

export function assertModuleAccess(user: SessionUser, module: ModuleKey) {
  if (!canAccessModule(user, module)) {
    redirect("/");
  }
}

export function canWritePatients(user: SessionUser) {
  return hasAnyRole(user, ["Admin", "Doctor", "Nurse", "Receptionist"]);
}

export function isClinicalUser(user: SessionUser) {
  return hasAnyRole(user, ["Admin", "Doctor", "Nurse"]);
}

export function canEditBilling(user: SessionUser) {
  return hasAnyRole(user, ["Admin", "Receptionist"]);
}

export function canDispenseMedication(user: SessionUser) {
  return hasAnyRole(user, ["Admin", "Pharmacist"]);
}

export function canWorkLabQueue(user: SessionUser) {
  return hasAnyRole(user, ["Admin", "Lab Technician"]);
}

export function canViewBillingSummary(user: SessionUser) {
  return hasAnyRole(user, ["Admin", "Doctor", "Receptionist"]);
}

export function canViewAuditLog(user: SessionUser) {
  return hasAnyRole(user, ["Admin"]);
}
