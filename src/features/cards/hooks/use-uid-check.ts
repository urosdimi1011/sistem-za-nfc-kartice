"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { UID_PATTERN } from "../schemas";

interface UidCheckResponse {
  takenBy: string | null;
}

export function useUidCheck(uid: string) {
  const isValidShape = UID_PATTERN.test(uid);

  return useQuery({
    queryKey: ["uid-check", uid],
    queryFn: () =>
      api<UidCheckResponse>(`/api/cards/check?uid=${encodeURIComponent(uid)}`),
    enabled: isValidShape,
    staleTime: 60 * 1000, // cache 1 min — UID check je deterministički
  });
}
