import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { listFullMenu } from "@/features/menu/queries";
import { CategoryFormDialog } from "@/features/menu/components/category-form-dialog";
import { MenuBoard } from "@/features/menu/components/menu-board";

export const dynamic = "force-dynamic";

export default async function KartaPicaPage() {
  const categories = await listFullMenu();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Karta pića</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Kategorije i stavke — povlači za promenu redosleda, klikni za izmene
          </p>
        </div>
        <CategoryFormDialog
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova kategorija
            </Button>
          }
        />
      </div>

      {categories.length === 0 ? (
        <div className="rounded-md border border-dashed py-20 text-center">
          <p className="text-sm text-zinc-500">
            Još nema kategorija. Klikni "Nova kategorija" da kreneš.
          </p>
        </div>
      ) : (
        <MenuBoard categories={categories} />
      )}
    </div>
  );
}
