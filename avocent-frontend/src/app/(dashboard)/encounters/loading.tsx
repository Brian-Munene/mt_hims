import { Skeleton } from "@/components/ui/skeleton";

export default function EncountersLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <Skeleton className="h-[420px] rounded-[2rem]" />
    </div>
  );
}
