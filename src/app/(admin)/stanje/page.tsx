import { Package } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { inventoryQuerySchema } from "@/features/inventory/schemas";
import { listInventory, listStockCounts } from "@/features/inventory/queries";
import { InventoryTable } from "@/features/inventory/components/inventory-table";
import { InventoryFilters } from "@/features/inventory/components/inventory-filters";
import { StockCountDialog } from "@/features/inventory/components/stock-count-dialog";
import { StockCountHistoryDialog } from "@/features/inventory/components/stock-count-history-dialog";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StanjePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = inventoryQuerySchema.parse({
    status: params.status,
    search: params.search,
  });

  // Učitaj sve da imamo tačne brojače za tabove, pa filtriraj per-status
  const [all, stockCounts] = await Promise.all([
    listInventory({ status: "ALL", search: query.search }),
    listStockCounts(),
  ]);
  const counts = {
    ALL: all.length,
    OUT: all.filter((r) => r.status === "OUT").length,
    LOW: all.filter((r) => r.status === "LOW").length,
    OK: all.filter((r) => r.status === "OK").length,
  };
  const filtered =
    query.status === "ALL"
      ? all
      : all.filter((r) => r.status === query.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stanje zaliha"
        description="Pregled svih praćenih stavki — šta treba da se naruči. Stavke se pojavljuju kada se na Karti pića uključi praćenje stanja."
        icon={<Package className="h-5 w-5" />}
        actions={
          <>
            <StockCountHistoryDialog counts={stockCounts} />
            <StockCountDialog
              items={all.map((r) => ({
                id: r.id,
                name: r.name,
                categoryName: r.categoryName,
              }))}
            />
          </>
        }
      />

      <InventoryFilters counts={counts} />

      <InventoryTable rows={filtered} />
    </div>
  );
}
