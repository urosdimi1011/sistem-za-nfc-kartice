import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { PersonFilterBadge } from "@/components/ui/person-filter-badge";
import { cardsQuerySchema } from "@/features/cards/schemas";
import { listCards, getPersonForFilter } from "@/features/cards/queries";
import { CardsFilters } from "@/features/cards/components/cards-filters";
import { CardsTable } from "@/features/cards/components/table/cards-table";
import { RegisterCardDialog } from "@/features/cards/components/register-card-dialog";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function KarticePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = cardsQuerySchema.parse({
    search: params.search,
    personId: params.personId,
    status: params.status,
    page: params.page,
    perPage: params.perPage,
    sort: params.sort,
    order: params.order,
  });

  // Ako je personId aktivan filter, dohvati osobu za badge.
  // Takođe kad je personId set, hoćemo da prikažemo SVE kartice (i blokirane).
  const effectiveQuery = query.personId
    ? { ...query, status: "ALL" as const }
    : query;

  const [data, filterPerson] = await Promise.all([
    listCards(effectiveQuery),
    query.personId ? getPersonForFilter(query.personId) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kartice</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Registrovane kartice učenika i zaposlenih
          </p>
        </div>
        <RegisterCardDialog
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Registruj karticu
            </Button>
          }
        />
      </div>

      {filterPerson && <PersonFilterBadge person={filterPerson} />}

      {!filterPerson && <CardsFilters />}

      <CardsTable items={data.items} />

      <PaginationControls
        page={data.page}
        totalPages={data.totalPages}
        total={data.total}
        perPage={data.perPage}
      />
    </div>
  );
}
