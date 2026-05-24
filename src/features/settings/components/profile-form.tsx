"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SystemRoleLabel, type SystemRole } from "@/lib/enums";
import { Badge } from "@/components/ui/badge";

import {
  profileSchema,
  changePasswordSchema,
  type ProfileInput,
  type ChangePasswordInput,
} from "../schemas";
import {
  updateProfileAction,
  changeOwnPasswordAction,
} from "../actions";

interface ProfileFormProps {
  initialEmail: string;
  role: SystemRole;
  tenantName: string;
  lastLoginAt: Date | null;
}

function PasswordInput({
  value,
  onChange,
  ...props
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
} & React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function ProfileForm({
  initialEmail,
  role,
  tenantName,
  lastLoginAt,
}: ProfileFormProps) {
  const [isPendingEmail, startEmailTransition] = useTransition();
  const [isPendingPw, startPwTransition] = useTransition();

  const emailForm = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { email: initialEmail },
  });

  const pwForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onEmailSubmit = (values: ProfileInput) => {
    startEmailTransition(async () => {
      const result = await updateProfileAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Email ažuriran");
    });
  };

  const onPwSubmit = (values: ChangePasswordInput) => {
    startPwTransition(async () => {
      const result = await changeOwnPasswordAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Lozinka promenjena");
      pwForm.reset();
    });
  };

  return (
    <div className="space-y-6">
      {/* Info */}
      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-base font-semibold">Tvoj nalog</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Uloga
            </div>
            <Badge variant="outline" className="mt-1">
              {SystemRoleLabel[role]}
            </Badge>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Organizacija
            </div>
            <p className="mt-1">{tenantName}</p>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Poslednja prijava
            </div>
            <p className="mt-1">
              {lastLoginAt
                ? lastLoginAt.toLocaleString("sr-RS")
                : "—"}
            </p>
          </div>
        </div>
      </section>

      {/* Email */}
      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-base font-semibold">Email</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Email se koristi za prijavu. Ako ga promeniš, sledeća prijava ide na novi email.
        </p>
        <Form {...emailForm}>
          <form
            onSubmit={emailForm.handleSubmit(onEmailSubmit)}
            className="mt-4 space-y-3"
          >
            <FormField
              control={emailForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email adresa</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isPendingEmail}>
              {isPendingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sačuvaj email
            </Button>
          </form>
        </Form>
      </section>

      {/* Lozinka */}
      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-base font-semibold">Promena lozinke</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Najmanje 8 znakova. Posle promene, sve postojeće prijave ostaju aktivne.
        </p>
        <Form {...pwForm}>
          <form
            onSubmit={pwForm.handleSubmit(onPwSubmit)}
            className="mt-4 space-y-3"
          >
            <FormField
              control={pwForm.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trenutna lozinka</FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoComplete="current-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={pwForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova lozinka</FormLabel>
                    <FormControl>
                      <PasswordInput
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={pwForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Potvrdi novu lozinku</FormLabel>
                    <FormControl>
                      <PasswordInput
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={isPendingPw}>
              {isPendingPw && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Promeni lozinku
            </Button>
          </form>
        </Form>
      </section>
    </div>
  );
}
