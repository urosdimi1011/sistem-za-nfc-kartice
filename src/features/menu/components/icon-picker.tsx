"use client";

import { MENU_ICONS, type MenuIconName } from "@/lib/menu-presets";
import { MenuIcon } from "@/components/ui/menu-icon";
import { cn } from "@/lib/utils";

interface IconPickerProps {
  value: MenuIconName | null | undefined;
  onChange: (icon: MenuIconName | null) => void;
  /** Ako true, pokazuje opciju "nasleđuj od kategorije" (null). */
  allowInherit?: boolean;
}

export function IconPicker({ value, onChange, allowInherit }: IconPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {allowInherit && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            "flex h-12 items-center justify-center rounded-md border px-3 text-xs transition-all",
            value === null
              ? "border-primary bg-primary text-primary-foreground"
              : "border-zinc-200 hover:border-primary dark:border-zinc-700",
          )}
          title="Koristi ikonu kategorije"
        >
          Nasleđuj
        </button>
      )}
      {MENU_ICONS.map((icon) => (
        <button
          key={icon}
          type="button"
          onClick={() => onChange(icon)}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-md border transition-all",
            value === icon
              ? "border-primary bg-primary text-primary-foreground"
              : "border-zinc-200 hover:border-primary dark:border-zinc-700",
          )}
          title={icon}
        >
          <MenuIcon name={icon} className="h-5 w-5" />
        </button>
      ))}
    </div>
  );
}
