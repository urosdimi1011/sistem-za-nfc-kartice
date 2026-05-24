"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  Eye,
  EyeOff,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MenuIcon } from "@/components/ui/menu-icon";
import { getColorPreset } from "@/lib/menu-presets";

import type { MenuCategoryWithItems } from "../queries";
import {
  deleteCategoryAction,
  reorderItemsAction,
} from "../actions";
import { CategoryFormDialog } from "./category-form-dialog";
import { ItemFormDialog } from "./item-form-dialog";
import { MenuItemTile } from "./menu-item-tile";

interface CategoryCardProps {
  category: MenuCategoryWithItems;
}

export function CategoryCard({ category }: CategoryCardProps) {
  const [, startTransition] = useTransition();

  // Optimistic mirror za stavke unutar kategorije
  const [itemsState, setItemsState] = useState(category.items);
  const pendingRef = useRef(false);
  useEffect(() => {
    if (!pendingRef.current) setItemsState(category.items);
  }, [category.items]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const preset = getColorPreset(category.color);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleItemDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = itemsState.findIndex((i) => i.id === active.id);
    const newIndex = itemsState.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = itemsState;
    const newOrder = arrayMove(itemsState, oldIndex, newIndex);
    setItemsState(newOrder); // optimistic

    const ids = newOrder.map((i) => i.id);
    pendingRef.current = true;
    startTransition(async () => {
      const r = await reorderItemsAction(category.id, { ids });
      pendingRef.current = false;
      if (!r.ok) {
        setItemsState(previous);
        toast.error(r.error);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`Obriši kategoriju "${category.name}"?`)) return;
    startTransition(async () => {
      const r = await deleteCategoryAction(category.id);
      if (!r.ok) toast.error(r.error);
      else toast.success("Kategorija obrisana");
    });
  };

  const itemIds = itemsState.map((i) => i.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border-2 transition-shadow",
        preset.border,
        isDragging && "shadow-xl",
      )}
    >
      {/* HEADER */}
      <div
        className={cn(
          "flex items-center justify-between gap-2 rounded-t-xl px-4 py-3",
          preset.bg,
        )}
      >
        <div className="flex items-center gap-3">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab rounded p-1 text-zinc-500 transition-opacity hover:opacity-100 active:cursor-grabbing"
            title="Pomeri kategoriju"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              preset.badge,
            )}
          >
            <MenuIcon name={category.icon} className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className={cn("text-base font-semibold", preset.text)}>
              {category.name}
            </h2>
            <p className="text-[11px] text-zinc-500">
              {itemsState.length} stavki
              {!category.isVisible && " · skrivena u baru"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!category.isVisible && (
            <span className="flex items-center gap-1 rounded-md bg-zinc-200 px-2 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800">
              <EyeOff className="h-3 w-3" /> Skrivena
            </span>
          )}
          {category.isVisible && (
            <span className="flex items-center gap-1 rounded-md bg-green-500/20 px-2 py-0.5 text-[10px] text-green-700 dark:text-green-400">
              <Eye className="h-3 w-3" /> Vidljiva
            </span>
          )}
          <CategoryFormDialog
            category={{
              id: category.id,
              name: category.name,
              icon: category.icon,
              color: category.color,
              isVisible: category.isVisible,
            }}
            trigger={
              <Button variant="ghost" size="sm" title="Izmeni">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            title="Obriši"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-600" />
          </Button>
        </div>
      </div>

      {/* ITEMS GRID */}
      <div className="p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleItemDragEnd}
        >
          <SortableContext items={itemIds} strategy={horizontalListSortingStrategy}>
            <div className="flex flex-wrap gap-3">
              {itemsState.map((item) => (
                <MenuItemTile
                  key={item.id}
                  item={item}
                  categoryId={category.id}
                  categoryName={category.name}
                  categoryIcon={category.icon}
                  categoryColor={category.color}
                />
              ))}
              <ItemFormDialog
                categoryId={category.id}
                categoryName={category.name}
                trigger={
                  <button
                    type="button"
                    className="flex h-[10.5rem] w-36 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 text-xs text-zinc-500 transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary dark:border-zinc-700"
                  >
                    <Plus className="h-6 w-6" />
                    Dodaj stavku
                  </button>
                }
              />
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
