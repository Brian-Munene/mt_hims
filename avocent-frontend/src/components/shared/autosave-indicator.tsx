"use client";

import type { AutosaveStatus } from "@/hooks/use-autosave";
import { cn } from "@/lib/utils";

export function AutosaveIndicator({ status }: { status: AutosaveStatus }) {
  if (status === "idle") return null;

  return (
    <span
      className={cn("text-xs transition-colors", {
        "text-slate-400": status === "saving",
        "text-emerald-600": status === "saved",
        "text-rose-600": status === "error",
      })}
    >
      {status === "saving" && "Saving…"}
      {status === "saved" && "Saved"}
      {status === "error" && "Error saving"}
    </span>
  );
}
