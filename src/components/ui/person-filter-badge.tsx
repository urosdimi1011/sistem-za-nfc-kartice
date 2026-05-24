"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PersonTypeLabel, type PersonType } from "@/lib/enums";

interface PersonFilterBadgeProps {
  person: {
    firstName: string;
    lastName: string;
    personType: PersonType;
  };
  label?: string;
}

/**
 * Prikazuje "Filter za: Petar Petrović ✕" kad je personId filter aktivan.
 * Klik na ✕ uklanja personId iz URL-a.
 */
export function PersonFilterBadge({
  person,
  label = "Filter za osobu:",
}: PersonFilterBadgeProps) {
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  params.delete("personId");
  params.delete("page");
  const removeHref = `?${params.toString()}`;

  return (
    <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <span className="font-medium">
        {person.lastName} {person.firstName}
      </span>
      <Badge
        variant={person.personType === "EMPLOYEE" ? "default" : "secondary"}
        className="text-[10px]"
      >
        {PersonTypeLabel[person.personType]}
      </Badge>
      <Link
        href={removeHref}
        replace
        scroll={false}
        title="Ukloni filter"
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded hover:bg-primary/15"
      >
        <X className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
