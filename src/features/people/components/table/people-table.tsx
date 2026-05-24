import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableHeader } from "@/components/ui/sortable-header";

import type { PersonListItem } from "../../queries";
import { PeopleTableRow } from "./people-table-row";

interface PeopleTableProps {
  items: PersonListItem[];
  groups: { id: string; name: string; shortName: string | null }[];
  groupLabel: string;
  requireGroup?: boolean;
}

export function PeopleTable({ items, groups, groupLabel, requireGroup }: PeopleTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-16 text-center text-sm text-zinc-500">
        Nema rezultata. Promeni filtere ili dodaj prvu osobu.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortableHeader field="lastName" defaultSort="lastName">
                Ime i prezime
              </SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="personType" defaultSort="lastName">
                Tip
              </SortableHeader>
            </TableHead>
            <TableHead>JMBG</TableHead>
            <TableHead>{groupLabel}</TableHead>
            <TableHead>Telefon</TableHead>
            <TableHead className="text-right">Stanje</TableHead>
            <TableHead>Kartica</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>
              <SortableHeader field="createdAt" defaultSort="lastName">
                Dodato
              </SortableHeader>
            </TableHead>
            <TableHead className="w-40"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((p) => (
            <PeopleTableRow
              key={p.id}
              person={p}
              groups={groups}
              groupLabel={groupLabel}
              requireGroup={requireGroup}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
