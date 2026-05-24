"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import {
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from "date-fns";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  TRANSACTION_TYPES,
  TransactionTypeLabel,
} from "@/lib/enums";

const typeLabels: Record<string, string> = {
  ALL: "Sve transakcije",
  ...Object.fromEntries(TRANSACTION_TYPES.map((t) => [t, TransactionTypeLabel[t]])),
};

const FILTER_DEFAULTS: Record<string, string> = {
  type: "ALL",
};

const ISO = (d: Date) => format(d, "yyyy-MM-dd");

interface DatePreset {
  key: string;
  label: string;
  from: () => string;
  to: () => string;
}

const DATE_PRESETS: DatePreset[] = [
  {
    key: "current",
    label: "Tekući mesec",
    from: () => ISO(startOfMonth(new Date())),
    to: () => ISO(endOfMonth(new Date())),
  },
  {
    key: "previous",
    label: "Prethodni mesec",
    from: () => ISO(startOfMonth(subMonths(new Date(), 1))),
    to: () => ISO(endOfMonth(subMonths(new Date(), 1))),
  },
];

export function CreditsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const type = searchParams.get("type") ?? "ALL";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const isPersonFiltered = !!searchParams.get("personId");

  // Koji preset je trenutno aktivan?
  const activePresetKey =
    DATE_PRESETS.find((p) => p.from() === dateFrom && p.to() === dateTo)?.key ??
    (!dateFrom && !dateTo ? "all" : null);

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search.trim()) params.set("search", search.trim());
      else params.delete("search");
      params.delete("page");
      startTransition(() => {
        router.replace(`?${params.toString()}`, { scroll: false });
      });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const isDefault = value === FILTER_DEFAULTS[key];
    if (value && !isDefault) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  const applyPreset = (preset: DatePreset | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (preset) {
      params.set("dateFrom", preset.from());
      params.set("dateTo", preset.to());
    } else {
      params.delete("dateFrom");
      params.delete("dateTo");
    }
    params.delete("page");
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-xs transition-all",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-zinc-300 text-zinc-600 hover:border-primary dark:border-zinc-700 dark:text-zinc-400",
    );

  return (
    <div className="space-y-3">
      {/* Pretraga + tip */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        {!isPersonFiltered && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Pretraga po imenu osobe..."
              className="pl-9 pr-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {isPending && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-400" />
            )}
          </div>
        )}
        <Select value={type} onValueChange={(v) => updateParam("type", v ?? "")}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue>
              {(v: string | null) => typeLabels[v ?? "ALL"] ?? "Sve transakcije"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Sve transakcije</SelectItem>
            {TRANSACTION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {TransactionTypeLabel[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date presets + custom range */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-500">Period:</span>
        {DATE_PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => applyPreset(p)}
            className={chip(activePresetKey === p.key)}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => applyPreset(null)}
          className={chip(activePresetKey === "all")}
        >
          Sve
        </button>
        <span className="mx-2 hidden text-xs text-zinc-400 sm:inline">·</span>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>Od</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => updateParam("dateFrom", e.target.value)}
            className="w-40"
          />
          <span>do</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => updateParam("dateTo", e.target.value)}
            className="w-40"
          />
        </div>
      </div>
    </div>
  );
}
