import { Plus } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { auth } from "@/auth";
import { accountsQuerySchema } from "@/features/accounts/schemas";
import { listAccounts } from "@/features/accounts/queries";
import { AccountsFilters } from "@/features/accounts/components/accounts-filters";
import { AccountsTable } from "@/features/accounts/components/table/accounts-table";
import { CreateAccountDialog } from "@/features/accounts/components/create-account-dialog";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NaloziPage({ searchParams }: PageProps) {
  // Druga linija odbrane pored middleware-a — samo ADMIN smije
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const query = accountsQuerySchema.parse({
    search: params.search,
    role: params.role,
    status: params.status,
    page: params.page,
    perPage: params.perPage,
  });

  const data = await listAccounts(query);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Korisnički nalozi</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Admin, menadžer i konobari koji imaju pristup sistemu
          </p>
        </div>
        <CreateAccountDialog
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novi nalog
            </Button>
          }
        />
      </div>

      <AccountsFilters />

      <AccountsTable items={data.items} currentAccountId={session.user.id} />

      <PaginationControls
        page={data.page}
        totalPages={data.totalPages}
        total={data.total}
        perPage={data.perPage}
      />
    </div>
  );
}
