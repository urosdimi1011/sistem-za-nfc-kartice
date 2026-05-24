import { format, formatDistanceToNowStrict } from "date-fns";
import { sr } from "date-fns/locale";
import { KeyRound, Pencil, Shield, ShieldCheck, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SystemRoleLabel, type SystemRole } from "@/lib/enums";

import type { AccountListItem } from "../../queries";
import { EditAccountDialog } from "../edit-account-dialog";
import { ResetPasswordDialog } from "../reset-password-dialog";

interface AccountsTableProps {
  items: AccountListItem[];
  currentAccountId: string;
}

function roleBadgeVariant(
  role: SystemRole,
): "default" | "secondary" | "outline" {
  if (role === "ADMIN") return "default";
  if (role === "MANAGER") return "secondary";
  return "outline";
}

function RoleIcon({ role }: { role: SystemRole }) {
  if (role === "ADMIN") return <ShieldCheck className="h-3 w-3" />;
  if (role === "MANAGER") return <Shield className="h-3 w-3" />;
  return <User className="h-3 w-3" />;
}

export function AccountsTable({ items, currentAccountId }: AccountsTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-16 text-center text-sm text-zinc-500">
        Nema naloga. Klikni &quot;Novi nalog&quot; da dodaš prvog.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Uloga</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Vezana osoba</TableHead>
            <TableHead>Poslednja prijava</TableHead>
            <TableHead>Lozinka</TableHead>
            <TableHead className="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((a) => {
            const isSelf = a.id === currentAccountId;
            return (
              <TableRow key={a.id} className={!a.isActive ? "opacity-60" : ""}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {a.email}
                    {isSelf && (
                      <Badge variant="outline" className="text-[10px]">
                        Ti
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={roleBadgeVariant(a.role)}
                    className="gap-1"
                  >
                    <RoleIcon role={a.role} />
                    {SystemRoleLabel[a.role]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {a.isActive ? (
                    <Badge
                      variant="outline"
                      className="border-green-500/40 text-green-700 dark:text-green-400"
                    >
                      Aktivan
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-zinc-500">
                      Neaktivan
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs text-zinc-500">
                  {a.person ? (
                    <span>
                      {a.person.lastName} {a.person.firstName}
                    </span>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-zinc-500">
                  {a.lastLoginAt ? (
                    <span title={format(a.lastLoginAt, "dd.MM.yyyy. HH:mm", { locale: sr })}>
                      {formatDistanceToNowStrict(a.lastLoginAt, {
                        locale: sr,
                        addSuffix: true,
                      })}
                    </span>
                  ) : (
                    <span className="text-zinc-400">Nikad</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-zinc-500">
                  Promenjena{" "}
                  {formatDistanceToNowStrict(a.passwordChangedAt, {
                    locale: sr,
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <EditAccountDialog
                      account={{
                        id: a.id,
                        email: a.email,
                        role: a.role,
                        isActive: a.isActive,
                      }}
                      trigger={
                        <Button variant="ghost" size="sm" title="Izmeni">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <ResetPasswordDialog
                      accountId={a.id}
                      email={a.email}
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Promeni lozinku"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
