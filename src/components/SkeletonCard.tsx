import { Skeleton } from "@/components/ui/skeleton";

export const SkeletonListCard = () => (
  <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
    <div className="flex items-start gap-3">
      <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-3 w-20" />
    </div>
  </div>
);

export const SkeletonGrid = ({ count = 6 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonListCard key={i} />
    ))}
  </div>
);

export const SkeletonOrderCard = () => (
  <div className="bg-card rounded-2xl border border-border p-4">
    <div className="flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-5 w-14" />
    </div>
  </div>
);
