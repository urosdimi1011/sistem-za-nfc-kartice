import { Plus, School } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { auth } from "@/auth";
import { listGroups } from "@/features/groups/queries";
import { getTenantSettings } from "@/features/settings/queries";
import { GroupFormDialog } from "@/features/groups/components/group-form-dialog";
import { GroupsBoard } from "@/features/groups/components/groups-board";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const session = await auth();
  const tenantId = session?.user.tenantId;
  if (!tenantId) return null;

  const [groups, settings] = await Promise.all([
    listGroups(),
    getTenantSettings(tenantId),
  ]);

  const label = settings.groupLabel; // npr. "Škola"
  const labelPlural = settings.groupLabelPlural; // npr. "Škole"
  const lcSingular = label.toLowerCase();

  return (
    <div className="space-y-6">
      <PageHeader
        title={labelPlural}
        description="Grupe kojima osobe (učenici i zaposleni) mogu pripadati. Povlači za promenu redosleda."
        icon={<School className="h-5 w-5" />}
        actions={
          <GroupFormDialog
            groupLabel={label}
            trigger={
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Nova {lcSingular}
              </Button>
            }
          />
        }
      />

      {groups.length === 0 ? (
        <div className="rounded-md border border-dashed py-20 text-center">
          <p className="text-sm text-zinc-500">
            Još nema {labelPlural.toLowerCase()}. Klikni "Nova {lcSingular}" da
            dodaš prvu.
          </p>
        </div>
      ) : (
        <GroupsBoard groups={groups} groupLabel={label} />
      )}
    </div>
  );
}
