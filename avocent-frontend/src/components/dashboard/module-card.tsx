import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ModuleCard({
  title,
  href,
  description,
  accent,
}: {
  title: string;
  href: string;
  description: string;
  accent: string;
}) {
  return (
    <Link href={href}>
      <Card
        className={`group h-full overflow-hidden border-slate-200/70 bg-gradient-to-br ${accent} from-white via-white to-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md`}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-slate-950">{title}</CardTitle>
            <ArrowUpRight className="size-4 text-slate-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </div>
          <CardDescription className="text-sm leading-6 text-slate-600">{description}</CardDescription>
        </CardHeader>
        <CardContent className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          Open module
        </CardContent>
      </Card>
    </Link>
  );
}
