import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableHeader } from "@/components/ui/sortable-header";

import type { CardListItem } from "../../queries";
import { CardsTableRow } from "./cards-table-row";

interface CardsTableProps {
  items: CardListItem[];
}

export function CardsTable({ items }: CardsTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-16 text-center text-sm text-zinc-500">
        Nema kartica. Klikni &quot;Registruj karticu&quot; da dodaš prvu.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Osoba</TableHead>
            <TableHead>UID</TableHead>
            <TableHead>
              <SortableHeader
                field="isActive"
                defaultSort="registeredAt"
                defaultOrder="desc"
              >
                Status
              </SortableHeader>
            </TableHead>
            <TableHead className="text-right">Porudžbine</TableHead>
            <TableHead>
              <SortableHeader
                field="registeredAt"
                defaultSort="registeredAt"
                defaultOrder="desc"
              >
                Registrovana
              </SortableHeader>
            </TableHead>
            <TableHead>Registrovao</TableHead>
            <TableHead className="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((c) => (
            <CardsTableRow key={c.id} card={c} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
