"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navigationItems } from "@/lib/navigation";
import type { SessionUser } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SidebarNav({ user, compact = false }: { user: SessionUser; compact?: boolean }) {
  const pathname = usePathname();

  const items = navigationItems.filter((item) => user.role_names.some((role) => item.allowedRoles.includes(role)));

  return (
    <nav className={cn("flex flex-col gap-1.5", compact && "gap-2")}>
      {items.map((item) => {
        const active = item.href === "/"
          ? pathname === "/"
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-slate-950 text-white"
                : "text-slate-600 hover:bg-white/80 hover:text-slate-950",
            )}
          >
            <Icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

