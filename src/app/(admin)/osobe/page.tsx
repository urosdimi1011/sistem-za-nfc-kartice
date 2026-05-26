import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { peopleQuerySchema } from "@/features/people/schemas";
import { listPeople } from "@/features/people/queries";
import { PeopleFilters } from "@/features/people/components/people-filters";
import { PeopleTable } from "@/features/people/components/table/people-table";
import { PersonFormDialog } from "@/features/people/components/person-form-dialog";
import { listActiveGroupsLite } from "@/features/groups/queries";
import { getTenantSettings } from "@/features/settings/queries";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OsobePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = peopleQuerySchema.parse({
    search: params.search,
    type: params.type,
    status: params.status,
    groupId: params.groupId,
    page: params.page,
    perPage: params.perPage,
    sort: params.sort,
    order: params.order,
  });

  const session = await auth();
  const tenantId = session?.user.tenantId;
  const [data, groups, settings] = await Promise.all([
    listPeople(query),
    listActiveGroupsLite(),
    tenantId ? getTenantSettings(tenantId) : Promise.resolve(null),
  ]);
  const groupLabel = settings?.groupLabel ?? "Grupa";
  const groupLabelPlural = settings?.groupLabelPlural ?? "Grupe";
  const requireGroup = settings?.requireGroup ?? false;
  const allowPhotos = settings?.allowPhotos ?? true;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Osobe</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Učenici i zaposleni akademije
          </p>
        </div>
        <PersonFormDialog
          groups={groups}
          groupLabel={groupLabel}
          requireGroup={requireGroup}
          allowPhotos={allowPhotos}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova osoba
            </Button>
          }
        />
      </div>

      <PeopleFilters
        groups={groups}
        groupLabelPlural={groupLabelPlural}
      />

      <PeopleTable
        items={data.items}
        groups={groups}
        groupLabel={groupLabel}
        requireGroup={requireGroup}
        allowPhotos={allowPhotos}
      />

      <PaginationControls
        page={data.page}
        totalPages={data.totalPages}
        total={data.total}
        perPage={data.perPage}
      />
    </div>
  );
}
