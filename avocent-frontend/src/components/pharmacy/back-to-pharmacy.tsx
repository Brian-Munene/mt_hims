import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackToPharmacy({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-700 hover:bg-muted hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Back to pharmacy
    </Link>
  );
}
