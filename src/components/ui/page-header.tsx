import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Ikona (lucide) — prikazuje se u zaobljenom kvadratu levo od naslova */
  icon?: React.ReactNode;
  /** Akcije desno (dugmad, dialozi). Na mobilnom se prelamaju ispod. */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Jedinstveni header svih admin stranica.
 *   • Ikona u primary-obojenom kvadratu (opciono)
 *   • Naslov + opis sa konzistentnom tipografijom
 *   • Akcije desno — responsive (stack na mobilnom)
 *   • Donja linija razdvaja header od sadržaja
 */
export function PageHeader({
  title,
  description,
  icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-0.5 text-sm text-zinc-500">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
