"use client";

import { useState, useTransition } from "react";
import { Loader2, Mail, Send } from "lucide-react";
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
import { sendReportEmailAction } from "../actions";

interface SendReportEmailButtonProps {
  personId: string;
  fullName: string;
  email: string | null;
  periodLabel: string;
  year: number;
  month: number;
}

export function SendReportEmailButton({
  personId,
  fullName,
  email,
  periodLabel,
  year,
  month,
}: SendReportEmailButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const hasEmail = !!email;

  const handleSend = () => {
    startTransition(async () => {
      const r = await sendReportEmailAction(personId, year, month);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Izveštaj poslat na ${r.data?.sentTo}`);
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={!hasEmail}
            title={
              hasEmail
                ? "Pošalji izveštaj na email"
                : "Osoba nema upisan email"
            }
          >
            <Mail className="h-3.5 w-3.5" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Pošalji izveštaj na email</DialogTitle>
              <DialogDescription className="mt-1">
                PDF izveštaj će biti poslat kao prilog.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex justify-between gap-3">
            <span className="text-zinc-500">Osoba</span>
            <span className="font-medium">{fullName}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-zinc-500">Email</span>
            <span className="font-mono text-xs">{email}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-zinc-500">Period</span>
            <span className="font-medium">{periodLabel}</span>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Otkaži
          </Button>
          <Button type="button" onClick={handleSend} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Pošalji
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
