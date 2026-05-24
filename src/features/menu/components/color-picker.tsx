"use client";

import { Check } from "lucide-react";

import { MENU_COLORS, type MenuColorSlug } from "@/lib/menu-presets";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  value: MenuColorSlug;
  onChange: (color: MenuColorSlug) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {MENU_COLORS.map((c) => (
        <button
          key={c.slug}
          type="button"
          onClick={() => onChange(c.slug)}
          title={c.label}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full ring-offset-2 transition-all",
            c.badge,
            value === c.slug
              ? "ring-2 ring-foreground"
              : "hover:ring-2 hover:ring-foreground/40",
          )}
        >
          {value === c.slug && <Check className="h-4 w-4 text-white" />}
        </button>
      ))}
    </div>
  );
}
