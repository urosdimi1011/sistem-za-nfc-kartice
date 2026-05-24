import Link from "next/link";
import { format } from "date-fns";
import { sr } from "date-fns/locale";
import { CreditCard, Receipt, Replace } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { PersonTypeLabel } from "@/lib/enums";
import { personCreditsHref } from "@/features/credits/lib/links";

import type { CardListItem } from "../../queries";
import {
  BlockCardButton,
  ReactivateCardButton,
} from "../card-action-buttons";

interface CardsTableRowProps {
  card: CardListItem;
}

export function CardsTableRow({ card: c }: CardsTableRowProps) {
  const transactionsHref = personCreditsHref(c.person.id);

  return (
    <TableRow className={!c.isActive ? "opacity-70" : ""}>
      <TableCell>
        <div className="flex items-center gap-2 font-medium">
          <Link
            href={transactionsHref}
            className="hover:text-primary hover:underline"
            title="Vidi transakcije ove osobe"
          >
            {c.person.lastName} {c.person.firstName}
          </Link>
          <Badge
            variant={c.person.personType === "EMPLOYEE" ? "default" : "secondary"}
            className="text-[10px]"
          >
            {PersonTypeLabel[c.person.personType]}
          </Badge>
          {!c.person.isActive && (
            <Badge variant="outline" className="text-[10px] text-zinc-500">
              Osoba neaktivna
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="font-mono text-xs">
        <Link
          href={transactionsHref}
          className="flex items-center gap-1.5 hover:text-primary"
          title="Vidi transakcije ove osobe"
        >
          <CreditCard className="h-3.5 w-3.5 text-zinc-400" />
          <span className="hover:underline">{c.uid}</span>
        </Link>
      </TableCell>
      <TableCell>
        {c.isActive ? (
          <Badge
            variant="outline"
            className="border-green-500/40 text-green-700 dark:text-green-400"
          >
            Aktivna
          </Badge>
        ) : c.isReplaced ? (
          <Badge
            variant="outline"
            className="gap-1 border-zinc-400/40 text-zinc-500"
          >
            <Replace className="h-3 w-3" />
            Zamenjena
          </Badge>
        ) : (
          <Badge variant="outline" className="border-red-500/40 text-red-600">
            Blokirana
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums text-zinc-500">
        <Link
          href={transactionsHref}
          className="inline-flex items-center gap-1 hover:text-primary hover:underline"
          title="Vidi sve transakcije"
        >
          <Receipt className="h-3 w-3" />
          {c.orderCount}
        </Link>
      </TableCell>
      <TableCell className="text-xs text-zinc-500">
        {format(c.registeredAt, "dd.MM.yyyy. HH:mm", { locale: sr })}
        {c.deactivatedAt && (
          <div className="mt-0.5 text-[10px] text-zinc-400">
            blokirana {format(c.deactivatedAt, "dd.MM.yyyy.", { locale: sr })}
          </div>
        )}
      </TableCell>
      <TableCell className="text-xs text-zinc-500">
        {c.registeredBy.email}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {c.isActive ? (
            <BlockCardButton
              cardId={c.id}
              uid={c.uid}
              personName={`${c.person.firstName} ${c.person.lastName}`}
            />
          ) : !c.isReplaced ? (
            <ReactivateCardButton
              cardId={c.id}
              uid={c.uid}
              personName={`${c.person.firstName} ${c.person.lastName}`}
            />
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}
