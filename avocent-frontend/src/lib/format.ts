import { format, formatDistanceToNowStrict } from "date-fns";

export function formatDate(value?: string | null, pattern = "dd MMM yyyy") {
  if (!value) {
    return "Not recorded";
  }

  try {
    return format(new Date(value), pattern);
  } catch {
    return value;
  }
}

export function formatDateTime(value?: string | null) {
  return formatDate(value, "dd MMM yyyy, HH:mm");
}

export function formatRelative(value?: string | null) {
  if (!value) {
    return "No recent activity";
  }

  try {
    return formatDistanceToNowStrict(new Date(value), { addSuffix: true });
  } catch {
    return value;
  }
}

export function formatCurrency(value: string | number) {
  const amount = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatName(first?: string, last?: string) {
  return [first, last].filter(Boolean).join(" ") || "Unknown";
}

export function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return new Date().toISOString().slice(0, 16);
  return iso.slice(0, 16);
}
