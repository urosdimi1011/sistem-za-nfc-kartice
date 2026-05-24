import { Eye, Pencil, Power, PowerOff, CreditCard, StickyNote } from "lucide-react";
import { format } from "date-fns";
import { sr } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { PersonTypeLabel } from "@/lib/enums";

import type { PersonListItem } from "../../queries";
import { PersonFormDialog } from "../person-form-dialog";
import { ToggleActiveDialog } from "../toggle-active-dialog";
import { PersonDetailsDialog } from "../person-details-dialog";

interface PeopleTableRowProps {
  person: PersonListItem;
  groups: { id: string; name: string; shortName: string | null }[];
  groupLabel: string;
  requireGroup?: boolean;
}

function formatBalance(n: number) {
  return new Intl.NumberFormat("sr-RS").format(n);
}

export function PeopleTableRow({
  person: p,
  groups,
  groupLabel,
  requireGroup,
}: PeopleTableRowProps) {
  return (
    <TableRow className={!p.isActive ? "opacity-60" : ""}>
      <TableCell className="font-medium">
        <div className="flex items-center gap-1.5">
          {p.lastName} {p.firstName}
          {p.note && (
            <span title="Ima napomenu">
              <StickyNote className="h-3.5 w-3.5 text-amber-500" />
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={p.personType === "EMPLOYEE" ? "default" : "secondary"}>
          {PersonTypeLabel[p.personType]}
        </Badge>
      </TableCell>
      <TableCell className="font-mono text-xs text-zinc-500">
        {p.jmbg ?? "—"}
      </TableCell>
      <TableCell className="text-xs text-zinc-600 dark:text-zinc-400">
        {p.groupShortName ?? p.groupName ?? "—"}
      </TableCell>
      <TableCell className="text-zinc-500">{p.phone ?? "—"}</TableCell>
      <TableCell className="text-right tabular-nums">
        <span
          className={
            p.balance < 0
              ? "text-red-600 dark:text-red-400"
              : p.balance === 0
                ? "text-zinc-400"
                : ""
          }
        >
          {formatBalance(p.balance)}
        </span>
      </TableCell>
      <TableCell>
        {p.hasCard ? (
          <Badge variant="outline" className="gap-1">
            <CreditCard className="h-3 w-3" />
            Da
          </Badge>
        ) : (
          <span className="text-xs text-zinc-400">Nema</span>
        )}
      </TableCell>
      <TableCell>
        {p.isActive ? (
          <Badge
            variant="outline"
            className="border-green-500/40 text-green-700 dark:text-green-400"
          >
            Aktivan
          </Badge>
        ) : (
          <Badge variant="outline" className="border-zinc-400/40 text-zinc-500">
            Neaktivan
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-xs text-zinc-500">
        {format(p.createdAt, "dd.MM.yyyy.", { locale: sr })}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <PersonDetailsDialog
            person={p}
            trigger={
              <Button variant="ghost" size="sm" title="Detalji">
                <Eye className="h-4 w-4" />
              </Button>
            }
          />
          <PersonFormDialog
            groups={groups}
            groupLabel={groupLabel}
            requireGroup={requireGroup}
            person={{
              id: p.id,
              firstName: p.firstName,
              lastName: p.lastName,
              personType: p.personType,
              jmbg: p.jmbg,
              phone: p.phone,
              email: p.email,
              dateOfBirth: p.dateOfBirth,
              note: p.note,
              groupId: p.groupId,
            }}
            trigger={
              <Button variant="ghost" size="sm" title="Izmeni">
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
          <ToggleActiveDialog
            personId={p.id}
            personName={`${p.firstName} ${p.lastName}`}
            isCurrentlyActive={p.isActive}
            trigger={
              <Button
                variant="ghost"
                size="sm"
                title={p.isActive ? "Deaktiviraj" : "Aktiviraj"}
              >
                {p.isActive ? (
                  <PowerOff className="h-4 w-4 text-red-600" />
                ) : (
                  <Power className="h-4 w-4 text-green-600" />
                )}
              </Button>
            }
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
