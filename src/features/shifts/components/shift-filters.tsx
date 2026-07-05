"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BartenderOption } from "../queries";

interface ShiftFiltersProps {
  bartenders: BartenderOption[];
  bartenderId: string | null;
  from: string; // datetime-local format
  to: string;
}

/** Filteri preseka: konobar + od/do + prečice (danas, juče). */
export function ShiftFilters({
  bartenders,
  bartenderId,
  from,
  to,
}: ShiftFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const update = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  const pad = (n: number) => String(n).padStart(2, "0");
  const toLocal = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const setToday = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    update({ from: toLocal(start), to: toLocal(new Date()) });
  };

  const setYesterday = () => {
    const start = new Date();
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 0, 0);
    update({ from: toLocal(start), to: toLocal(end) });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end dark:border-zinc-800 dark:bg-zinc-900">
      <div className="space-y-1">
        <label className="text-xs text-zinc-500">Konobar</label>
        <Select
          value={bartenderId ?? "__all__"}
          onValueChange={(v) =>
            update({ bartenderId: !v || v === "__all__" ? null : v })
          }
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue>
              {(v: string | null) => {
                const val = v ?? bartenderId ?? "__all__";
                if (val === "__all__") return "Svi konobari";
                return bartenders.find((b) => b.id === val)?.email ?? "Svi konobari";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Svi konobari</SelectItem>
            {bartenders.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-zinc-500">Od</label>
        <Input
          type="datetime-local"
          value={from}
          onChange={(e) => update({ from: e.target.value })}
          className="w-full sm:w-52"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-zinc-500">Do</label>
        <Input
          type="datetime-local"
          value={to}
          onChange={(e) => update({ to: e.target.value })}
          className="w-full sm:w-52"
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={setToday}>
          Danas
        </Button>
        <Button variant="outline" size="sm" onClick={setYesterday}>
          Juče
        </Button>
        {isPending && (
          <Loader2 className="mt-2 h-4 w-4 animate-spin text-zinc-400" />
        )}
      </div>
    </div>
  );
}
