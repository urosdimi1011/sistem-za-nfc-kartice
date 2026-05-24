"use client";

import { useTransition } from "react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { Eye, EyeOff, GripVertical, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import type { GroupRow as GroupRowData } from "../queries";
import { deleteGroupAction } from "../actions";
import { GroupFormDialog } from "./group-form-dialog";

interface GroupRowProps {
  group: GroupRowData;
  groupLabel: string;
}

export function GroupRow({ group, groupLabel }: GroupRowProps) {
  const [, startTransition] = useTransition();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: group.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const handleDelete = () => {
    if (!confirm(`Obriši "${group.name}"?`)) return;
    startTransition(async () => {
      const r = await deleteGroupAction(group.id);
      if (!r.ok) toast.error(r.error);
      else toast.success(`${groupLabel} obrisana`);
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2.5 dark:bg-zinc-900 dark:border-zinc-800",
        isDragging && "shadow-lg",
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab rounded p-1 text-zinc-400 hover:text-zinc-700 active:cursor-grabbing dark:hover:text-zinc-300"
          title="Pomeri"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{group.name}</span>
            {group.shortName && (
              <span className="text-xs text-zinc-500">· {group.shortName}</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" /> {group.peopleCount} osoba
            </span>
            {group.isActive ? (
              <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400">
                <Eye className="h-3 w-3" /> Aktivna
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-zinc-500">
                <EyeOff className="h-3 w-3" /> Neaktivna
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <GroupFormDialog
          groupLabel={groupLabel}
          group={{
            id: group.id,
            name: group.name,
            shortName: group.shortName,
            isActive: group.isActive,
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
          disabled={group.peopleCount > 0}
        >
          <Trash2
            className={cn(
              "h-3.5 w-3.5",
              group.peopleCount > 0 ? "text-zinc-400" : "text-red-600",
            )}
          />
        </Button>
      </div>
    </div>
  );
}
