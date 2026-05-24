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

import { reorderGroupsAction } from "../actions";
import type { GroupRow as GroupRowData } from "../queries";
import { GroupRow } from "./group-row";

interface GroupsBoardProps {
  groups: GroupRowData[];
  groupLabel: string;
}

export function GroupsBoard({ groups, groupLabel }: GroupsBoardProps) {
  const [, startTransition] = useTransition();

  // Lokalno ogledalo — optimistic update.
  // Kad korisnik pusti miš, odmah primenjujemo novi redosled na ekranu,
  // pa tek onda zovemo server. Bez ovoga, parent ostaje sa starim redom dok
  // server action + revalidacija ne završe, pa kartica "skoči" nazad na sekund.
  const [items, setItems] = useState(groups);

  // Sinhronizuj sa prop-ovima kad parent dobije nove podatke (npr. nova grupa,
  // brisanje, refresh). Ali NE tokom našeg optimističkog update-a — tada
  // ignorišemo dolazni "stari" prop jer znamo da je naš state svežiji.
  const pendingRef = useRef(false);
  useEffect(() => {
    if (!pendingRef.current) setItems(groups);
  }, [groups]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((g) => g.id === active.id);
    const newIndex = items.findIndex((g) => g.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = items;
    const newOrder = arrayMove(items, oldIndex, newIndex);
    setItems(newOrder); // optimistic — odmah na ekranu

    const ids = newOrder.map((g) => g.id);
    pendingRef.current = true;
    startTransition(async () => {
      const r = await reorderGroupsAction({ ids });
      pendingRef.current = false;
      if (!r.ok) {
        // rollback
        setItems(previous);
        toast.error(r.error);
      }
    });
  };

  const ids = items.map((g) => g.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((g) => (
            <GroupRow key={g.id} group={g} groupLabel={groupLabel} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
