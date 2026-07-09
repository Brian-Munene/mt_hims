import {
  Activity,
  CalendarRange,
  ClipboardList,
  CreditCard,
  FileText,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  ListOrdered,
  Pill,
  Settings2,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";

import type { AppModuleSummary, RoleName } from "@/lib/types";

const ALL_ROLES: RoleName[] = ["Admin", "Doctor", "Nurse", "Lab Technician", "Pharmacist", "Receptionist"];

export const moduleCards: AppModuleSummary[] = [
  {
    title: "Booking",
    href: "/booking",
    description: "Patient journey orchestration, queue state, and operational workflow actions.",
    accent: "from-emerald-300/25 to-cyan-500/10",
  },
  {
    title: "Patients",
    href: "/patients",
    description: "Registration, search, identifiers, and longitudinal patient context.",
    accent: "from-cyan-400/30 to-teal-500/15",
  },
  {
    title: "Encounters",
    href: "/encounters",
    description: "Triage, active visits, and encounter-centered clinical activity.",
    accent: "from-lime-400/25 to-emerald-500/10",
  },
  {
    title: "Clinical",
    href: "/clinical",
    description: "Notes, diagnoses, and observations with clinician-only access.",
    accent: "from-amber-300/30 to-orange-500/10",
  },
  {
    title: "Billing",
    href: "/billing",
    description: "Invoices, payments, and M-PESA visibility for front-office workflows.",
    accent: "from-pink-300/20 to-rose-500/10",
  },
  {
    title: "Pharmacy",
    href: "/pharmacy",
    description: "Prescription queues, dispensing, and stock posture.",
    accent: "from-violet-300/20 to-indigo-500/10",
  },
  {
    title: "Laboratory",
    href: "/laboratory",
    description: "Order worklists, result verification, and test turnaround.",
    accent: "from-sky-300/25 to-blue-500/10",
  },
  {
    title: "Telemedicine",
    href: "/telemedicine",
    description: "Remote sessions, chat state, and continuity across encounters.",
    accent: "from-fuchsia-300/20 to-pink-500/10",
  },
  {
    title: "Admin",
    href: "/admin",
    description: "Users, roles, and clinic-level operational controls.",
    accent: "from-slate-300/25 to-slate-500/10",
  },
];

export const navigationItems = [
  { href: "/",            label: "Dashboard",    icon: LayoutDashboard, allowedRoles: ALL_ROLES },
  { href: "/booking",     label: "Booking",      icon: CalendarRange,   allowedRoles: ALL_ROLES },
  { href: "/patients",    label: "Patients",     icon: Users,           allowedRoles: ALL_ROLES },
  { href: "/queue",       label: "Queue board",  icon: ListOrdered,     allowedRoles: ALL_ROLES },
  {
    href: "/encounters",
    label: "Encounters",
    icon: ClipboardList,
    allowedRoles: ["Admin", "Doctor", "Nurse", "Receptionist"] as RoleName[],
  },
  {
    href: "/clinical",
    label: "Clinical",
    icon: Stethoscope,
    allowedRoles: ["Admin", "Doctor", "Nurse"] as RoleName[],
  },
  {
    href: "/laboratory",
    label: "Laboratory",
    icon: FlaskConical,
    allowedRoles: ["Admin", "Doctor", "Lab Technician"] as RoleName[],
  },
  {
    href: "/pharmacy",
    label: "Pharmacy",
    icon: Pill,
    allowedRoles: ["Admin", "Doctor", "Pharmacist"] as RoleName[],
  },
  {
    href: "/billing",
    label: "Billing",
    icon: CreditCard,
    allowedRoles: ["Admin", "Receptionist"] as RoleName[],
  },
  {
    href: "/telemedicine",
    label: "Telemedicine",
    icon: HeartPulse,
    allowedRoles: ["Admin", "Doctor", "Nurse"] as RoleName[],
  },
  { href: "/admin",       label: "Admin",        icon: Settings2,       allowedRoles: ["Admin"] as RoleName[] },
  { href: "/compliance",  label: "Compliance",   icon: ShieldCheck,     allowedRoles: ["Admin"] as RoleName[] },
  { href: "/policies",    label: "Policies",     icon: FileText,        allowedRoles: ["Admin"] as RoleName[] },
  { href: "/logout",      label: "Sign out",     icon: Activity,        allowedRoles: ALL_ROLES },
];
