"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ExportExcelButtonProps {
  /** API endpoint koji vraća fajl, npr. "/api/reports/monthly/xlsx" */
  endpoint: string;
  /** Query parametri — null/undefined/prazno se preskače */
  params: Record<string, string | number | null | undefined>;
  label?: string;
}

/**
 * Dugme za preuzimanje exporta (Excel). Navigacija na endpoint sa
 * Content-Disposition: attachment ne napušta stranicu — browser samo
 * skine fajl, pa je običan window.location dovoljan (nema fetch/blob).
 */
export function ExportExcelButton({
  endpoint,
  params,
  label = "Preuzmi Excel",
}: ExportExcelButtonProps) {
  const handleClick = () => {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined || value === "") continue;
      qs.set(key, String(value));
    }
    window.location.href = `${endpoint}?${qs.toString()}`;
  };

  return (
    <Button variant="outline" onClick={handleClick}>
      <Download className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
