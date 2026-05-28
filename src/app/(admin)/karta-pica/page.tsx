import { Plus, Wine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { listFullMenu } from "@/features/menu/queries";
import { CategoryFormDialog } from "@/features/menu/components/category-form-dialog";
import { MenuBoard } from "@/features/menu/components/menu-board";

export const dynamic = "force-dynamic";

export default async function KartaPicaPage() {
  const categories = await listFullMenu();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Karta pića"
        description="Kategorije i stavke — povlači za promenu redosleda, klikni za izmene"
        icon={<Wine className="h-5 w-5" />}
        actions={
          <CategoryFormDialog
            trigger={
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Nova kategorija
              </Button>
            }
          />
        }
      />

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
