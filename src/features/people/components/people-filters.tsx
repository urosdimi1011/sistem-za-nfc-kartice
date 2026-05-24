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
import { PERSON_TYPES, PersonTypeLabelPlural } from "@/lib/enums";

const typeLabels: Record<string, string> = {
  ALL: "Svi tipovi",
  ...Object.fromEntries(PERSON_TYPES.map((t) => [t, PersonTypeLabelPlural[t]])),
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Aktivni",
  INACTIVE: "Neaktivni",
  ALL: "Svi statusi",
};

// Default vrednost iz peopleQuerySchema — kad korisnik izabere default, brišemo param iz URL-a
const FILTER_DEFAULTS: Record<string, string> = {
  type: "ALL",
  status: "ACTIVE",
  groupId: "",
};

interface PeopleFiltersProps {
  groups: { id: string; name: string; shortName: string | null }[];
  groupLabelPlural: string;
}

export function PeopleFilters({ groups, groupLabelPlural }: PeopleFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const type = searchParams.get("type") ?? "ALL";
  const status = searchParams.get("status") ?? "ACTIVE";
  const groupId = searchParams.get("groupId") ?? "__all__";

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search.trim()) {
        params.set("search", search.trim());
      } else {
        params.delete("search");
      }
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
    const isDefault = value === FILTER_DEFAULTS[key] || value === "__all__";
    if (value && !isDefault) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  const groupValueLabel = (v: string | null) => {
    const val = v ?? groupId;
    if (val === "__all__") return `Sve ${groupLabelPlural.toLowerCase()}`;
    if (val === "__none__") return "Bez dodele";
    const g = groups.find((x) => x.id === val);
    return g ? g.name : `Sve ${groupLabelPlural.toLowerCase()}`;
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          placeholder="Pretraga po imenu, prezimenu ili JMBG-u..."
          className="pl-9 pr-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {isPending && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-400" />
        )}
      </div>
      <Select value={type} onValueChange={(v) => updateParam("type", v ?? "")}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue>
            {(v: string | null) => typeLabels[v ?? "ALL"] ?? "Svi tipovi"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Svi tipovi</SelectItem>
          {PERSON_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {PersonTypeLabelPlural[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {groups.length > 0 && (
        <Select
          value={groupId}
          onValueChange={(v) => updateParam("groupId", v ?? "")}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue>{groupValueLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">
              Sve {groupLabelPlural.toLowerCase()}
            </SelectItem>
            <SelectItem value="__none__">Bez dodele</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select value={status} onValueChange={(v) => updateParam("status", v ?? "")}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue>
            {(v: string | null) => statusLabels[v ?? "ACTIVE"] ?? "Aktivni"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ACTIVE">Aktivni</SelectItem>
          <SelectItem value="INACTIVE">Neaktivni</SelectItem>
          <SelectItem value="ALL">Svi statusi</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
