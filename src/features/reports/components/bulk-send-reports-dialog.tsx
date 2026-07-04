"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Mail, Send, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { PersonType } from "@/lib/enums";
import {
  listReportEmailRecipientsAction,
  sendReportEmailsBatchAction,
  type BulkEmailRecipient,
} from "../actions";

interface BulkSendReportsDialogProps {
  year: number;
  month: number;
  monthLabel: string;
  personType: PersonType | "ALL";
  groupId: string | null;
}

const BATCH_SIZE = 4;

type Phase = "idle" | "loading" | "ready" | "sending" | "done";

interface SendFailure {
  name: string;
  error: string;
}

/**
 * Bulk slanje PDF izveštaja na email — svima sa aktivnošću u mesecu koji
 * imaju upisan email. Šalje u malim batch-evima (serverless timeout) sa
 * progress prikazom; greške po osobi se skupljaju i prikažu na kraju.
 */
export function BulkSendReportsDialog({
  year,
  month,
  monthLabel,
  personType,
  groupId,
}: BulkSendReportsDialogProps) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [recipients, setRecipients] = useState<BulkEmailRecipient[]>([]);
  const [noEmailCount, setNoEmailCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [failures, setFailures] = useState<SendFailure[]>([]);
  const [, startTransition] = useTransition();

  const loadRecipients = () => {
    setPhase("loading");
    startTransition(async () => {
      const r = await listReportEmailRecipientsAction(
        year,
        month,
        personType,
        groupId,
      );
      if (!r.ok || !r.data) {
        toast.error(r.ok ? "Greška" : r.error);
        setPhase("idle");
        setOpen(false);
        return;
      }
      setRecipients(r.data.recipients);
      setNoEmailCount(r.data.noEmailCount);
      setSentCount(0);
      setFailures([]);
      setPhase("ready");
    });
  };

  const handleOpenChange = (next: boolean) => {
    // Ne dozvoli zatvaranje usred slanja — batch petlja je u toku
    if (!next && phase === "sending") return;
    setOpen(next);
    if (next) loadRecipients();
    else setPhase("idle");
  };

  const handleSend = () => {
    setPhase("sending");
    startTransition(async () => {
      const byId = new Map(recipients.map((r) => [r.personId, r]));
      const allFailures: SendFailure[] = [];
      let sent = 0;

      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE);
        const r = await sendReportEmailsBatchAction(
          batch.map((b) => b.personId),
          year,
          month,
        );
        if (!r.ok || !r.data) {
          // Ceo batch pao (npr. mailer nije konfigurisan) — prekid
          for (const b of batch) {
            allFailures.push({ name: b.name, error: r.ok ? "Greška" : r.error });
          }
          setFailures([...allFailures]);
          break;
        }
        for (const res of r.data.results) {
          if (res.ok) {
            sent++;
          } else {
            allFailures.push({
              name: byId.get(res.personId)?.name ?? res.personId,
              error: res.error ?? "Greška",
            });
          }
        }
        setSentCount(sent);
        setFailures([...allFailures]);
      }

      setPhase("done");
      if (allFailures.length === 0) {
        toast.success(`Poslato ${sent} izveštaja`);
      } else {
        toast.warning(`Poslato ${sent}, neuspešno ${allFailures.length}`);
      }
    });
  };

  const total = recipients.length;
  const progressPct = total > 0 ? Math.round(((sentCount + failures.length) / total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <Mail className="mr-2 h-4 w-4" />
            Pošalji svima
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pošalji izveštaje na email</DialogTitle>
          <DialogDescription>
            PDF izveštaj za {monthLabel} šalje se svim osobama iz trenutnog
            filtera koje imaju aktivnost u mesecu i upisan email.
          </DialogDescription>
        </DialogHeader>

        {phase === "loading" && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Učitavam primaoce…
          </div>
        )}

        {phase !== "loading" && phase !== "idle" && (
          <div className="space-y-3">
            <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex justify-between gap-3">
                <span className="text-zinc-500">Primalaca sa emailom</span>
                <span className="font-medium">{total}</span>
              </div>
              {noEmailCount > 0 && (
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-500">Bez emaila (preskaču se)</span>
                  <span className="font-medium">{noEmailCount}</span>
                </div>
              )}
            </div>

            {(phase === "sending" || phase === "done") && (
              <div className="space-y-2">
                <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="flex items-center gap-2 text-xs text-zinc-500">
                  {phase === "sending" && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {phase === "done" && failures.length === 0 && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  )}
                  Poslato {sentCount} od {total}
                  {failures.length > 0 && ` · neuspešno ${failures.length}`}
                </p>
              </div>
            )}

            {failures.length > 0 && (
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-3 text-xs dark:border-red-900 dark:bg-red-950">
                {failures.map((f, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
                    <span>
                      <span className="font-medium">{f.name}</span> — {f.error}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={phase === "sending"}
          >
            {phase === "done" ? "Zatvori" : "Otkaži"}
          </Button>
          {phase === "ready" && (
            <Button type="button" onClick={handleSend} disabled={total === 0}>
              <Send className="mr-2 h-4 w-4" />
              Pošalji ({total})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
