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

interface ReportsFiltersProps {
  totalPeopleInScope: number;
  withActivityCount: number;
  onlyWithActivity: boolean;
  groups: { id: string; name: string; shortName: string | null }[];
  groupLabel: string;
  groupLabelPlural: string;
}

export function ReportsFilters({
  totalPeopleInScope,
  withActivityCount,
  onlyWithActivity,
  groups,
  groupLabelPlural,
}: ReportsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const groupId = searchParams.get("groupId") ?? "__all__";

  const setGroupId = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!val || val === "__all__") params.delete("groupId");
    else params.set("groupId", val);
    params.delete("page");
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  // Debounced search → URL
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

  const toggleOnlyActivity = (checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (checked) {
      params.delete("onlyWithActivity"); // default je true
    } else {
      params.set("onlyWithActivity", "false");
    }
    params.delete("page");
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative max-w-sm flex-1">
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

      {groups.length > 0 && (
        <Select value={groupId} onValueChange={(v) => setGroupId(v ?? "")}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue>
              {(v: string | null) => {
                const val = v ?? groupId;
                if (val === "__all__")
                  return `Sve ${groupLabelPlural.toLowerCase()}`;
                if (val === "__none__") return "Bez dodele";
                const g = groups.find((x) => x.id === val);
                return g ? g.name : `Sve ${groupLabelPlural.toLowerCase()}`;
              }}
            </SelectValue>
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

      <label className="flex shrink-0 cursor-pointer select-none items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={onlyWithActivity}
          onChange={(e) => toggleOnlyActivity(e.target.checked)}
          className="h-4 w-4"
        />
        <span>
          Samo osobe sa aktivnošću u mesecu{" "}
          <span className="text-xs text-zinc-500">
            ({withActivityCount} od {totalPeopleInScope})
          </span>
        </span>
      </label>
    </div>
  );
}
