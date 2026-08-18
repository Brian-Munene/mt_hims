import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AdminCreateButton({ href, label }: { href: string; label: string }) {
  return (
    <div className="flex justify-end">
      <Button nativeButton={false} render={<Link href={href} />}>
        <Plus className="size-4" />
        {label}
      </Button>
    </div>
  );
}
