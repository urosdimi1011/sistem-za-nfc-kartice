"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { sr } from "date-fns/locale";
import { CreditCard, Loader2, Minus, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PersonTypeLabel } from "@/lib/enums";
import { RegisterCardDialog } from "@/features/cards/components/register-card-dialog";
import { CreditDialog } from "@/features/credits/components/credit-dialog";
import { PersonCreditHistory } from "@/features/credits/components/person-credit-history";
import { usePersonHistory } from "@/features/credits/hooks/use-person-history";
import { personCreditsHref } from "@/features/credits/lib/links";

import type { PersonListItem } from "../queries";
import { PersonAvatar } from "./person-avatar";

interface PersonDetailsDialogProps {
  trigger: React.ReactElement;
  person: PersonListItem;
}

function formatBalance(n: number) {
  return new Intl.NumberFormat("sr-RS").format(n);
}

function fmtDate(d: Date | null, withTime = false) {
  if (!d) return "—";
  return format(d, withTime ? "dd.MM.yyyy. HH:mm" : "dd.MM.yyyy.", { locale: sr });
}

interface RowProps {
  label: string;
  children: React.ReactNode;
}

function Row({ label, children }: RowProps) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

interface SectionProps {
  title: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}

function Section({ title, right, children }: SectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          {title}
        </h3>
        {right}
      </div>
      {children}
    </section>
  );
}

export function PersonDetailsDialog({ trigger, person }: PersonDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  // Stanja child dijaloga — držimo ih ovde, renderujemo child dijaloge VAN
  // PersonDetailsDialog-ovog DialogContent-a. Time:
  //   1. Kad parent zatvorimo, child ne unmount-uje sa parentom
  //   2. Nikad nema 2 modala vidljiva istovremeno
  //   3. Posle zatvaranja child-a, parent se NE reopen-uje automatski
  //      (čista završena akcija; korisnik ponovo klikne osobu ako želi)
  const [topupOpen, setTopupOpen] = useState(false);
  const [deductOpen, setDeductOpen] = useState(false);
  const [registerCardOpen, setRegisterCardOpen] = useState(false);

  // Pomoćnik: zatvori parent pa otvori child (sledeći tick da React commitne oba)
  const switchToChild = (setter: (b: boolean) => void) => {
    setOpen(false);
    setter(true);
  };

  // Isti queryKey kao u PersonCreditHistory — React Query dedup-uje, samo 1 request
  const { isLoading: historyLoading } = usePersonHistory(person.id, open);

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <div className="flex items-start gap-3">
            <PersonAvatar
              personId={person.id}
              firstName={person.firstName}
              lastName={person.lastName}
              hasPhoto={person.hasPhoto}
              size={64}
              cacheKey={person.updatedAt.getTime()}
            />
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl">
                {person.firstName} {person.lastName}
              </DialogTitle>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge
                  variant={person.personType === "EMPLOYEE" ? "default" : "secondary"}
                >
                  {PersonTypeLabel[person.personType]}
                </Badge>
                {!person.isActive && (
                  <Badge
                    variant="outline"
                    className="border-zinc-400/40 text-zinc-500"
                  >
                    Neaktivan
                  </Badge>
                )}
                {person.hasCard && (
                  <Badge variant="outline" className="gap-1">
                    <CreditCard className="h-3 w-3" />
                    Ima karticu
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-2 space-y-6">
          <Section title="Osnovni podaci">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Row label="JMBG">
                {person.jmbg ? (
                  <span className="font-mono">{person.jmbg}</span>
                ) : (
                  <span className="text-zinc-400">—</span>
                )}
              </Row>
              <Row label="Datum rođenja">{fmtDate(person.dateOfBirth)}</Row>
              <Row label="Telefon">
                {person.phone ?? <span className="text-zinc-400">—</span>}
              </Row>
              <Row label="Email">
                {person.email ? (
                  <a
                    href={`mailto:${person.email}`}
                    className="text-primary hover:underline"
                  >
                    {person.email}
                  </a>
                ) : (
                  <span className="text-zinc-400">—</span>
                )}
              </Row>
            </div>
          </Section>

          <Section
            title="Kartica i krediti"
            right={
              <Link
                href={`/kartice?personId=${person.id}`}
                className="text-xs text-primary hover:underline"
              >
                Sve kartice →
              </Link>
            }
          >
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Row label="Kartica">
                {person.hasCard ? (
                  <Badge variant="outline" className="gap-1">
                    <CreditCard className="h-3 w-3" />
                    Aktivna
                  </Badge>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400">Nema</span>
                    {person.isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        onClick={() => switchToChild(setRegisterCardOpen)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Dodeli
                      </Button>
                    )}
                  </div>
                )}
              </Row>
              <Row label="Trenutno stanje">
                <span
                  className={`font-medium tabular-nums ${
                    person.balance < 0
                      ? "text-red-600 dark:text-red-400"
                      : person.balance === 0
                        ? "text-zinc-400"
                        : ""
                  }`}
                >
                  {formatBalance(person.balance)} kredita
                </span>
              </Row>
            </div>
            {person.isActive && (
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => switchToChild(setTopupOpen)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Dodaj kredite
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => switchToChild(setDeductOpen)}
                >
                  <Minus className="mr-1 h-3 w-3" />
                  Skini kredite
                </Button>
              </div>
            )}
          </Section>

          <Section
            title={
              <span className="flex items-center gap-2">
                Poslednje transakcije
                {historyLoading && (
                  <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
                )}
              </span>
            }
            right={
              <Link
                href={personCreditsHref(person.id)}
                className="text-xs text-primary hover:underline"
              >
                Vidi sve →
              </Link>
            }
          >
            <PersonCreditHistory personId={person.id} />
          </Section>

          {person.note && (
            <Section title="Napomena">
              <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm whitespace-pre-wrap dark:border-zinc-800 dark:bg-zinc-900">
                {person.note}
              </p>
            </Section>
          )}

          <Section title="Meta podaci">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <Row label="Dodato">{fmtDate(person.createdAt, true)}</Row>
              <Row label="Izmenjeno">{fmtDate(person.updatedAt, true)}</Row>
            </div>
          </Section>
        </div>
      </DialogContent>
    </Dialog>

    {/* CHILD DIJALOZI van DialogContent-a — nezavisni od parent state-a.
        Kad parent zatvorimo, ovi ostaju u tree-u i mogu da se otvore čisto. */}
    <CreditDialog
      mode="TOPUP"
      open={topupOpen}
      onOpenChange={setTopupOpen}
      preselectedPerson={{
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        jmbg: person.jmbg,
        personType: person.personType,
        activeCard: null,
        currentBalance: person.balance,
        hasCard: person.hasCard,
      }}
    />
    <CreditDialog
      mode="DEDUCT"
      open={deductOpen}
      onOpenChange={setDeductOpen}
      preselectedPerson={{
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        jmbg: person.jmbg,
        personType: person.personType,
        activeCard: null,
        currentBalance: person.balance,
        hasCard: person.hasCard,
      }}
    />
    <RegisterCardDialog
      open={registerCardOpen}
      onOpenChange={setRegisterCardOpen}
      preselectedPerson={{
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        jmbg: person.jmbg,
        personType: person.personType,
        activeCard: null,
      }}
    />
    </>
  );
}
