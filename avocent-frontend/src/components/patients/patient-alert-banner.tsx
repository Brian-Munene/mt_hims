import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import type { PatientAlert } from "@/lib/types";

const SEVERITY_CONFIG = {
  critical: {
    banner: "bg-rose-50 border-rose-200 text-rose-800",
    icon: ShieldAlert,
    iconClass: "text-rose-600",
    label: "Critical",
  },
  warning: {
    banner: "bg-amber-50 border-amber-200 text-amber-800",
    icon: AlertTriangle,
    iconClass: "text-amber-600",
    label: "Warning",
  },
  info: {
    banner: "bg-sky-50 border-sky-200 text-sky-800",
    icon: Info,
    iconClass: "text-sky-600",
    label: "Info",
  },
};

export function PatientAlertBanner({ alerts }: { alerts: PatientAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const config = SEVERITY_CONFIG[alert.severity];
        const Icon = config.icon;
        return (
          <div key={alert.id} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${config.banner}`}>
            <Icon className={`mt-0.5 size-4 shrink-0 ${config.iconClass}`} />
            <div className="space-y-0.5">
              <p className="text-sm font-semibold">
                {config.label} · <span className="capitalize">{alert.alert_type}</span>
              </p>
              <p className="text-sm">{alert.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
