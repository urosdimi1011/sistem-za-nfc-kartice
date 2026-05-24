"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { toast } from "sonner";

import { reorderCategoriesAction } from "../actions";
import type { MenuCategoryWithItems } from "../queries";
import { CategoryCard } from "./category-card";

interface MenuBoardProps {
  categories: MenuCategoryWithItems[];
}

export function MenuBoard({ categories }: MenuBoardProps) {
  const [, startTransition] = useTransition();

  // Optimistic mirror — vidi groups-board.tsx za detalje
  const [items, setItems] = useState(categories);
  const pendingRef = useRef(false);
  useEffect(() => {
    if (!pendingRef.current) setItems(categories);
  }, [categories]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((c) => c.id === active.id);
    const newIndex = items.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = items;
    const newOrder = arrayMove(items, oldIndex, newIndex);
    setItems(newOrder); // optimistic

    const ids = newOrder.map((c) => c.id);
    pendingRef.current = true;
    startTransition(async () => {
      const r = await reorderCategoriesAction({ ids });
      pendingRef.current = false;
      if (!r.ok) {
        setItems(previous);
        toast.error(r.error);
      }
    });
  };

  const ids = items.map((c) => c.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {items.map((cat) => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
