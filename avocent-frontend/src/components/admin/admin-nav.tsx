"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const adminNavItems = [
  { label: "Users", href: "/admin/view/users", createHref: "/admin/create/users" },
  { label: "Clinics", href: "/admin/view/clinics", createHref: "/admin/create/clinics" },
  { label: "Departments", href: "/admin/view/departments", createHref: "/admin/create/departments" },
  { label: "Roles", href: "/admin/view/roles", createHref: "/admin/create/roles" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Administration"
      className="sticky top-[5.5rem] z-10 -mx-2 rounded-2xl border border-slate-200/80 bg-white/85 px-3 py-2 shadow-[0_10px_40px_-24px_rgba(15,23,42,0.35)] backdrop-blur"
    >
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {adminNavItems.map((item) => {
          const active = [item.href, item.createHref].some(
            (href) => href && (pathname === href || pathname.startsWith(`${href}/`)),
          );
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
