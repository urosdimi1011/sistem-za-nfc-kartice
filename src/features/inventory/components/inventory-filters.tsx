"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STATUS_TABS: { key: string; label: string }[] = [
  { key: "ALL", label: "Sve" },
  { key: "OUT", label: "Nestalo" },
  { key: "LOW", label: "Niska zaliha" },
  { key: "OK", label: "OK" },
];

interface InventoryFiltersProps {
  counts: { ALL: number; OUT: number; LOW: number; OK: number };
}

export function InventoryFilters({ counts }: InventoryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const status = searchParams.get("status") ?? "ALL";

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search.trim()) params.set("search", search.trim());
      else params.delete("search");
      startTransition(() => {
        router.replace(`?${params.toString()}`, { scroll: false });
      });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const setStatus = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "ALL") params.delete("status");
    else params.set("status", key);
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative max-w-sm flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          placeholder="Pretraga po nazivu..."
          className="pl-9 pr-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {isPending && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-400" />
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {STATUS_TABS.map((t) => {
          const count = counts[t.key as keyof typeof counts];
          const active = status === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setStatus(t.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-zinc-300 text-zinc-600 hover:border-primary dark:border-zinc-700 dark:text-zinc-400",
              )}
            >
              {t.label}{" "}
              <span className={active ? "opacity-80" : "text-zinc-400"}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
