"use client";

import { useState, useTransition } from "react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { GripVertical, Pencil, Trash2, EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MenuIcon } from "@/components/ui/menu-icon";
import { getColorPreset } from "@/lib/menu-presets";

import {
  deleteItemAction,
  setItemAvailableAction,
} from "../actions";
import { ItemFormDialog } from "./item-form-dialog";

interface MenuItemTileProps {
  item: {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    creditPrice: number;
    isAvailable: boolean;
    trackStock: boolean;
    stock: number;
    lowStockThreshold: number;
  };
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("sr-RS").format(n);
}

export function MenuItemTile({
  item,
  categoryId,
  categoryName,
  categoryIcon,
  categoryColor,
}: MenuItemTileProps) {
  const [, startTransition] = useTransition();
  const [isHovering, setIsHovering] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const preset = getColorPreset(categoryColor);
  const iconToShow = item.icon ?? categoryIcon;

  const toggleAvailable = () => {
    startTransition(async () => {
      const r = await setItemAvailableAction(item.id, !item.isAvailable);
      if (!r.ok) toast.error(r.error);
    });
  };

  const handleDelete = () => {
    if (!confirm(`Obriši stavku "${item.name}"?`)) return;
    startTransition(async () => {
      const r = await deleteItemAction(item.id);
      if (!r.ok) toast.error(r.error);
      else toast.success("Stavka obrisana");
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={cn(
        "group relative flex w-36 flex-col items-center rounded-lg border-2 p-3 transition-all",
        preset.border,
        preset.bg,
        !item.isAvailable && "opacity-50 grayscale",
        isDragging && "shadow-lg",
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className={cn(
          "absolute left-1 top-1 cursor-grab rounded p-1 transition-opacity active:cursor-grabbing",
          isHovering ? "opacity-60 hover:opacity-100" : "opacity-0",
        )}
        title="Pomeri"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* Akcije gore desno (hover) */}
      <div
        className={cn(
          "absolute right-1 top-1 flex gap-0.5 transition-opacity",
          isHovering ? "opacity-100" : "opacity-0",
        )}
      >
        <ItemFormDialog
          categoryId={categoryId}
          categoryName={categoryName}
          item={item}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              title="Izmeni"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          }
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleDelete}
          title="Obriši"
        >
          <Trash2 className="h-3 w-3 text-red-600" />
        </Button>
      </div>

      <MenuIcon name={iconToShow} className={cn("h-8 w-8", preset.text)} />
      <p
        className="mt-2 line-clamp-2 text-center text-xs font-medium leading-tight"
        title={item.description ?? item.name}
      >
        {item.name}
      </p>
      <p className={cn("mt-1 text-sm font-bold tabular-nums", preset.text)}>
        {formatPrice(item.creditPrice)}
      </p>

      {/* Stock badge (samo za praćene stavke) — inline iznad dugmeta dostupnosti */}
      {item.trackStock && (
        <span
          className={cn(
            "mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold",
            item.stock <= 0
              ? "bg-red-500/20 text-red-700 dark:text-red-400"
              : item.stock <= item.lowStockThreshold
                ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
          )}
          title={`Stanje: ${item.stock}`}
        >
          {item.stock <= 0 ? "Nestalo" : `${item.stock} kom`}
        </span>
      )}

      {/* Available toggle */}
      <button
        type="button"
        onClick={toggleAvailable}
        className={cn(
          "mt-2 flex w-full items-center justify-center gap-1 rounded-md py-1 text-[10px] transition-colors",
          item.isAvailable
            ? "bg-green-500/20 text-green-700 hover:bg-green-500/30 dark:text-green-400"
            : "bg-zinc-200 text-zinc-500 hover:bg-zinc-300 dark:bg-zinc-800",
        )}
      >
        {item.isAvailable ? (
          <>
            <Eye className="h-3 w-3" /> Dostupno
          </>
        ) : (
          <>
            <EyeOff className="h-3 w-3" /> Skriveno
          </>
        )}
      </button>
    </div>
  );
}
