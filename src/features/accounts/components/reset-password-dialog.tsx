"use client";

import { useState, useTransition } from "react";
import { Copy, Eye, EyeOff, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { resetAccountPasswordAction } from "../actions";

function generatePassword() {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let pw = "";
  for (let i = 0; i < 12; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)];
  }
  return pw;
}

interface ResetPasswordDialogProps {
  trigger: React.ReactElement;
  accountId: string;
  email: string;
}

export function ResetPasswordDialog({
  trigger,
  accountId,
  email,
}: ResetPasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    if (password.length < 8) {
      toast.error("Lozinka mora imati bar 8 znakova");
      return;
    }
    startTransition(async () => {
      const r = await resetAccountPasswordAction(accountId, { password });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Lozinka promenjena. Saopšti je korisniku.`);
      setOpen(false);
      setPassword("");
    });
  };

  const copy = () => {
    navigator.clipboard.writeText(password).then(
      () => toast.success("Lozinka kopirana"),
      () => toast.error("Ne mogu da kopiram"),
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setPassword("");
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Promeni lozinku</DialogTitle>
          <DialogDescription>
            Postavi novu lozinku za <strong>{email}</strong>. Stara lozinka prestaje da važi odmah.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block text-sm font-medium">Nova lozinka</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="min 8 znakova"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPassword(generatePassword())}
              title="Generiši"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={copy}
              disabled={!password}
              title="Kopiraj"
            >
              <Copy className="h-4 w-4" />
            </Button>
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
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isPending || password.length < 8}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Postavi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
