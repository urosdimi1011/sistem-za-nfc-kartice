import { Skeleton } from "@/components/ui/skeleton";

interface PageSkeletonProps {
  /** Da li prikazati red filtera (search + selectovi). */
  withFilters?: boolean;
  /** Broj redova "tabele" — default 8. */
  rows?: number;
}

/**
 * Generički page-level skeleton za admin sekcije.
 * Imitira tipičnu strukturu: naslov + button gore, filteri ispod, tabela.
 */
export function PageSkeleton({ withFilters = true, rows = 8 }: PageSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Filteri */}
      {withFilters && (
        <div className="flex gap-3">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
        </div>
      )}

      {/* Tabela */}
      <div className="rounded-md border border-zinc-200 dark:border-zinc-800">
        <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="ml-auto h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
