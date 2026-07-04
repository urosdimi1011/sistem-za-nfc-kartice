import { Minus, Plus, Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ExportExcelButton } from "@/components/ui/export-excel-button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { PersonFilterBadge } from "@/components/ui/person-filter-badge";
import { transactionsQuerySchema } from "@/features/credits/schemas";
import { listTransactions } from "@/features/credits/queries";
import { CreditsFilters } from "@/features/credits/components/credits-filters";
import { CreditsTable } from "@/features/credits/components/table/credits-table";
import { CreditDialog } from "@/features/credits/components/credit-dialog";
import { getPersonForFilter } from "@/features/cards/queries";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function KreditiPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = transactionsQuerySchema.parse({
    search: params.search,
    personId: params.personId,
    type: params.type,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    page: params.page,
    perPage: params.perPage,
    sort: params.sort,
    order: params.order,
  });

  const [data, filterPerson] = await Promise.all([
    listTransactions(query),
    query.personId ? getPersonForFilter(query.personId) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transakcije"
        description="Sve transakcije: uplate, ručno skidanje, narudžbine"
        icon={<Receipt className="h-5 w-5" />}
        actions={
          <>
            <ExportExcelButton
              endpoint="/api/transactions/xlsx"
              params={{
                search: query.search,
                personId: query.personId,
                type: query.type,
                dateFrom: query.dateFrom,
                dateTo: query.dateTo,
              }}
            />
            <CreditDialog
              mode="DEDUCT"
              trigger={
                <Button variant="outline" className="flex-1 sm:flex-none">
                  <Minus className="mr-2 h-4 w-4" />
                  Skini kredite
                </Button>
              }
            />
            <CreditDialog
              mode="TOPUP"
              trigger={
                <Button className="flex-1 sm:flex-none">
                  <Plus className="mr-2 h-4 w-4" />
                  Dodaj kredite
                </Button>
              }
            />
          </>
        }
      />

      {filterPerson && <PersonFilterBadge person={filterPerson} />}

      {/* Filteri uvek vidljivi — pretraga je zamenjena PersonFilterBadge-om kad
          je personId aktivan, ali date/type filteri ostaju korisni */}
      <CreditsFilters />


      <CreditsTable items={data.items} />

      <PaginationControls
        page={data.page}
        totalPages={data.totalPages}
        total={data.total}
        perPage={data.perPage}
      />
    </div>
  );
}
