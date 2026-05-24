"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PersonType } from "@/lib/enums";

export interface SearchPersonResult {
  id: string;
  firstName: string;
  lastName: string;
  jmbg: string | null;
  personType: PersonType;
  activeCard: { id: string; uid: string } | null;
}

interface SearchResponse {
  items: SearchPersonResult[];
  hasMore: boolean;
  nextCursor: string | null;
}

export function usePeopleSearch(query: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: ["people-search", query],
    queryFn: ({ pageParam }: { pageParam: string | null }) => {
      const params = new URLSearchParams({ q: query });
      if (pageParam) params.set("cursor", pageParam);
      return api<SearchResponse>(`/api/people/search?${params.toString()}`);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    enabled,
    staleTime: 30 * 1000,
  });
}
