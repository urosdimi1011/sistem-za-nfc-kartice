"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusLabels: Record<string, string> = {
  ACTIVE: "Aktivne",
  BLOCKED: "Blokirane",
  ALL: "Sve",
};

const FILTER_DEFAULTS: Record<string, string> = {
  status: "ACTIVE",
};

export function CardsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const status = searchParams.get("status") ?? "ACTIVE";

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

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
      <Select value={status} onValueChange={(v) => updateParam("status", v ?? "")}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue>
            {(v: string | null) => statusLabels[v ?? "ACTIVE"] ?? "Aktivne"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ACTIVE">Aktivne</SelectItem>
          <SelectItem value="BLOCKED">Blokirane</SelectItem>
          <SelectItem value="ALL">Sve</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
