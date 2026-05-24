import { inventoryQuerySchema } from "@/features/inventory/schemas";
import { listInventory } from "@/features/inventory/queries";
import { InventoryTable } from "@/features/inventory/components/inventory-table";
import { InventoryFilters } from "@/features/inventory/components/inventory-filters";

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
  const all = await listInventory({ status: "ALL", search: query.search });
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
      <div>
        <h1 className="text-2xl font-bold">Stanje zaliha</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Pregled svih praćenih stavki — gazda vidi šta treba da naruči.
          Stavke se ovde pojavljuju kada se na <strong>Karti pića</strong>{" "}
          uključi opcija "Prati stanje zaliha".
        </p>
      </div>

      <InventoryFilters counts={counts} />

      <InventoryTable rows={filtered} />
    </div>
  );
}
