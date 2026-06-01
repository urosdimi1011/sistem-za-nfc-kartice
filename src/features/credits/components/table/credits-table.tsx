import { format } from "date-fns";
import { sr } from "date-fns/locale";
import {
  ArrowDownRight,
  ArrowUpRight,
  RotateCcw,
  ShoppingCart,
  Undo2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableHeader } from "@/components/ui/sortable-header";
import { cn } from "@/lib/utils";
import { PersonTypeLabel, TransactionTypeLabel } from "@/lib/enums";

import type { TransactionListItem } from "../../queries";
import { ExpandableNote } from "../expandable-note";
import { ReverseTransactionButton } from "../reverse-transaction-button";

function formatAmount(n: number) {
  const abs = new Intl.NumberFormat("sr-RS").format(Math.abs(n));
  return n >= 0 ? `+${abs}` : `−${abs}`;
}

function TypeBadge({ type }: { type: TransactionListItem["type"] }) {
  const map = {
    TOPUP: {
      icon: <ArrowUpRight className="h-3 w-3" />,
      cls: "border-green-500/40 text-green-700 dark:text-green-400",
    },
    MANUAL_DEDUCT: {
      icon: <ArrowDownRight className="h-3 w-3" />,
      cls: "border-red-500/40 text-red-700 dark:text-red-400",
    },
    ORDER: {
      icon: <ShoppingCart className="h-3 w-3" />,
      cls: "border-zinc-400/40 text-zinc-700 dark:text-zinc-300",
    },
    MONTHLY_RESET: {
      icon: <RotateCcw className="h-3 w-3" />,
      cls: "border-amber-500/40 text-amber-700 dark:text-amber-400",
    },
    REVERSAL: {
      icon: <Undo2 className="h-3 w-3" />,
      cls: "border-amber-500/40 text-amber-700 dark:text-amber-400",
    },
  } as const;
  const cfg = map[type];
  return (
    <Badge variant="outline" className={cn("gap-1", cfg.cls)}>
      {cfg.icon}
      {TransactionTypeLabel[type]}
    </Badge>
  );
}

interface CreditsTableProps {
  items: TransactionListItem[];
}

export function CreditsTable({ items }: CreditsTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-16 text-center text-sm text-zinc-500">
        Nema transakcija. Klikni "Dodaj kredite" gore.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortableHeader field="createdAt" defaultSort="createdAt" defaultOrder="desc">
                Datum
              </SortableHeader>
            </TableHead>
            <TableHead>Osoba</TableHead>
            <TableHead>Tip</TableHead>
            <TableHead className="text-right">
              <SortableHeader field="amount" defaultSort="createdAt" defaultOrder="desc">
                Iznos
              </SortableHeader>
            </TableHead>
            <TableHead className="text-right">Stanje posle</TableHead>
            <TableHead>Napomena</TableHead>
            <TableHead>Operater</TableHead>
            <TableHead className="w-12 text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((t) => {
            const isReversed = !!t.reversedAt;
            const isReversal = t.type === "REVERSAL";
            const canReverse =
              !isReversed && !isReversal && t.type !== "MONTHLY_RESET";
            return (
            <TableRow
              key={t.id}
              className={cn(isReversed && "opacity-60")}
            >
              <TableCell className="whitespace-nowrap text-xs text-zinc-500">
                {format(t.createdAt, "dd.MM.yyyy. HH:mm", { locale: sr })}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 font-medium">
                  {t.person.lastName} {t.person.firstName}
                  <Badge
                    variant={t.person.personType === "EMPLOYEE" ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {PersonTypeLabel[t.person.personType]}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <TypeBadge type={t.type} />
              </TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums font-medium",
                  t.amount > 0
                    ? "text-green-700 dark:text-green-400"
                    : "text-red-700 dark:text-red-400",
                  isReversed && "line-through",
                )}
              >
                {formatAmount(t.amount)}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums text-zinc-500",
                  t.balanceAfter < 0 && "text-red-600",
                )}
              >
                {new Intl.NumberFormat("sr-RS").format(t.balanceAfter)}
              </TableCell>
              <TableCell className="text-xs">
                <div className="space-y-1">
                  <ExpandableNote note={t.note} isOrder={t.type === "ORDER"} />
                  {isReversed && (
                    <div className="flex items-start gap-1 text-[11px] text-amber-700 dark:text-amber-400">
                      <Undo2 className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>
                        Stornirao {t.reversedBy?.email ?? "—"}:{" "}
                        <em>{t.reversalReason ?? "—"}</em>
                      </span>
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-xs text-zinc-500">
                {t.performedBy.email}
              </TableCell>
              <TableCell className="text-right">
                {canReverse && <ReverseTransactionButton tx={t} />}
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
