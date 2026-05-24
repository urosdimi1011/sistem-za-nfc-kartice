"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface SortableHeaderProps {
  field: string;
  defaultSort?: string;
  defaultOrder?: "asc" | "desc";
  children: React.ReactNode;
  className?: string;
}

export function SortableHeader({
  field,
  defaultSort,
  defaultOrder = "asc",
  children,
  className,
}: SortableHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSort = searchParams.get("sort") ?? defaultSort;
  const currentOrder = (searchParams.get("order") ?? defaultOrder) as "asc" | "desc";

  const isActive = currentSort === field;
  const nextOrder: "asc" | "desc" =
    isActive && currentOrder === "asc" ? "desc" : "asc";

  const handleClick = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", field);
    params.set("order", nextOrder);
    params.delete("page");
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "flex items-center gap-1 text-left transition-colors hover:text-foreground disabled:cursor-wait",
        isActive ? "font-semibold text-foreground" : "text-zinc-500",
        className,
      )}
    >
      {children}
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isActive ? (
        currentOrder === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5" />
        )
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
      )}
    </button>
  );
}
