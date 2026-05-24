import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton koji menja MonthlyReportTable dok server filtrira/učitava nove podatke.
 * Prikaže se kroz <Suspense fallback> kad se searchParams promene.
 */
export function MonthlyReportSkeleton() {
  return (
    <div className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
      {/* 8 rows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-zinc-50 px-4 py-3 last:border-0 dark:border-zinc-900"
        >
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
