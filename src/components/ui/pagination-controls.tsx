"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
}

export function PaginationControls({
  page,
  totalPages,
  total,
  perPage,
}: PaginationControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const goTo = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p === 1) params.delete("page");
    else params.set("page", String(p));
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
      <div>
        Prikazano <span className="font-medium">{from}-{to}</span> od{" "}
        <span className="font-medium">{total}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Prethodna
        </Button>
        <span className="px-2 text-xs">
          Strana {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
        >
          Sledeća
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
