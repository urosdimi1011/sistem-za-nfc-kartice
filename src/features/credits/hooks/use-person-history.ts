"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TransactionType } from "@/lib/enums";

export interface PersonHistoryItem {
  id: string;
  amount: number;
  balanceAfter: number;
  type: TransactionType;
  note: string | null;
  createdAt: string;
  performedBy: { email: string };
}

export function usePersonHistory(personId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["person-history", personId],
    queryFn: () =>
      api<{ items: PersonHistoryItem[] }>(
        `/api/credits/person-history?personId=${encodeURIComponent(personId!)}`,
      ),
    enabled: enabled && !!personId,
    staleTime: 10 * 1000,
  });
}
