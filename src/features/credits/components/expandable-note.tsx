"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpandableNoteProps {
  note: string | null;
  /** Tip transakcije — za ORDER pokazujemo lepu listu stavki. */
  isOrder?: boolean;
}

/**
 * Note koji se proširuje na klik.
 * Za ORDER tip parsira "Espresso × 2, Coca Cola × 1" i prikazuje kao listu kad je proširen.
 */
export function ExpandableNote({ note, isOrder }: ExpandableNoteProps) {
  const [expanded, setExpanded] = useState(false);

  if (!note) return <span className="text-zinc-400">—</span>;

  // Heurističko: ako je note kratak (do ~40 karaktera) i nema zarez, ne treba expand
  const isShort = note.length <= 40 && !note.includes(",");

  if (isShort) {
    return <span className="text-zinc-600 dark:text-zinc-400">{note}</span>;
  }

  // Parse stavki ako je ORDER
  const items = isOrder
    ? note.split(",").map((s) => s.trim()).filter(Boolean)
    : null;

  return (
    <div className="max-w-xs">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className={cn(
          "flex w-full items-start gap-1 text-left text-xs text-zinc-600 hover:text-foreground dark:text-zinc-400",
        )}
      >
        <span className="flex-1 min-w-0">
          {expanded ? (
            items ? (
              <ul className="space-y-0.5">
                {items.map((line, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-current opacity-60" />
                    {line}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="whitespace-pre-wrap">{note}</span>
            )
          ) : (
            <span className="line-clamp-1">{note}</span>
          )}
        </span>
        <span className="mt-0.5 shrink-0 text-zinc-400">
          {expanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </span>
      </button>
    </div>
  );
}
