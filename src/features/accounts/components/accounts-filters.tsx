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
import { SYSTEM_ROLES, SystemRoleLabel } from "@/lib/enums";

const roleLabels: Record<string, string> = {
  ALL: "Sve uloge",
  ...Object.fromEntries(SYSTEM_ROLES.map((r) => [r, SystemRoleLabel[r]])),
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Aktivni",
  INACTIVE: "Neaktivni",
  ALL: "Svi",
};

const FILTER_DEFAULTS: Record<string, string> = {
  role: "ALL",
  status: "ACTIVE",
};

export function AccountsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const role = searchParams.get("role") ?? "ALL";
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
          placeholder="Pretraga po email-u..."
          className="pl-9 pr-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {isPending && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-400" />
        )}
      </div>
      <Select value={role} onValueChange={(v) => updateParam("role", v ?? "")}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue>
            {(v: string | null) => roleLabels[v ?? "ALL"] ?? "Sve uloge"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Sve uloge</SelectItem>
          {SYSTEM_ROLES.map((r) => (
            <SelectItem key={r} value={r}>
              {SystemRoleLabel[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={(v) => updateParam("status", v ?? "")}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue>
            {(v: string | null) => statusLabels[v ?? "ACTIVE"] ?? "Aktivni"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ACTIVE">Aktivni</SelectItem>
          <SelectItem value="INACTIVE">Neaktivni</SelectItem>
          <SelectItem value="ALL">Svi</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
