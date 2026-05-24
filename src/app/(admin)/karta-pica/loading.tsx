import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-44" />
      </div>

      {/* Dva placeholder-a kategorije */}
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-xl border-2 border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-[10.5rem] w-36 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
