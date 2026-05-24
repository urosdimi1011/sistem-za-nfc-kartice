"use client";

import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

import type { BarMenuLayout } from "./bar-menu";

interface LayoutToggleProps {
  value: BarMenuLayout;
  onChange: (l: BarMenuLayout) => void;
}

export function LayoutToggle({ value, onChange }: LayoutToggleProps) {
  return (
    <div className="inline-flex rounded-md border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => onChange("grid")}
        title="Grid prikaz"
        className={cn(
          "flex h-7 w-9 items-center justify-center rounded transition-colors",
          value === "grid"
            ? "bg-primary text-primary-foreground"
            : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800",
        )}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        title="Lista"
        className={cn(
          "flex h-7 w-9 items-center justify-center rounded transition-colors",
          value === "list"
            ? "bg-primary text-primary-foreground"
            : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800",
        )}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}
