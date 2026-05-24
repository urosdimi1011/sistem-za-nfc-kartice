"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTHS_SR = [
  "Januar",
  "Februar",
  "Mart",
  "April",
  "Maj",
  "Jun",
  "Jul",
  "Avgust",
  "Septembar",
  "Oktobar",
  "Novembar",
  "Decembar",
];

interface PeriodPickerProps {
  year: number;
  month: number;
  personType: "STUDENT" | "EMPLOYEE" | "ALL";
}

const PERSON_LABELS: Record<string, string> = {
  STUDENT: "Učenici",
  EMPLOYEE: "Zaposleni",
  ALL: "Svi",
};

export function PeriodPicker({ year, month, personType }: PeriodPickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const nav = (newYear: number, newMonth: number, newType?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(newYear));
    params.set("month", String(newMonth));
    if (newType) params.set("personType", newType);
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  const prev = () => {
    const d = new Date(year, month - 2, 1);
    nav(d.getFullYear(), d.getMonth() + 1);
  };

  const next = () => {
    const d = new Date(year, month, 1);
    nav(d.getFullYear(), d.getMonth() + 1);
  };

  const nowDate = new Date();
  const currentYear = nowDate.getFullYear();
  const years = Array.from({ length: 4 }).map((_, i) => currentYear - i);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={prev} disabled={isPending}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Select
        value={String(month)}
        onValueChange={(v) => v && nav(year, Number(v))}
      >
        <SelectTrigger className="w-36">
          <SelectValue>
            {(v: string | null) => MONTHS_SR[Number(v ?? month) - 1]}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {MONTHS_SR.map((m, i) => (
            <SelectItem key={i} value={String(i + 1)}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(year)}
        onValueChange={(v) => v && nav(Number(v), month)}
      >
        <SelectTrigger className="w-24">
          <SelectValue>{(v: string | null) => v ?? String(year)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" onClick={next} disabled={isPending}>
        <ChevronRight className="h-4 w-4" />
      </Button>

      <div className="mx-2 h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

      <Select
        value={personType}
        onValueChange={(v) => v && nav(year, month, v)}
      >
        <SelectTrigger className="w-44">
          <SelectValue>
            {(v: string | null) => PERSON_LABELS[v ?? "EMPLOYEE"] ?? "Zaposleni"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="EMPLOYEE">Zaposleni</SelectItem>
          <SelectItem value="STUDENT">Učenici</SelectItem>
          <SelectItem value="ALL">Svi</SelectItem>
        </SelectContent>
      </Select>

      {isPending && (
        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
      )}
    </div>
  );
}
