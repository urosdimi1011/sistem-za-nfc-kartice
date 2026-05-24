"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { PERSON_TYPES, PersonTypeLabel, type PersonType } from "@/lib/enums";
import { personFormSchema, type PersonFormInput } from "../schemas";
import { createPersonAction, updatePersonAction } from "../actions";

interface PersonFormDialogProps {
  trigger: React.ReactElement;
  groups: { id: string; name: string; shortName: string | null }[];
  groupLabel: string; // npr "Škola"
  requireGroup?: boolean;
  person?: {
    id: string;
    firstName: string;
    lastName: string;
    personType: PersonType;
    jmbg: string | null;
    phone: string | null;
    email: string | null;
    dateOfBirth: Date | null;
    note: string | null;
    groupId?: string | null;
  };
}

function toDateInput(d: Date | null): string {
  if (!d) return "";
  const iso = d.toISOString();
  return iso.slice(0, 10);
}

export function PersonFormDialog({
  trigger,
  groups,
  groupLabel,
  requireGroup,
  person,
}: PersonFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<PersonFormInput>({
    resolver: zodResolver(personFormSchema),
    defaultValues: {
      firstName: person?.firstName ?? "",
      lastName: person?.lastName ?? "",
      personType: person?.personType ?? "STUDENT",
      jmbg: person?.jmbg ?? "",
      phone: person?.phone ?? "",
      email: person?.email ?? "",
      dateOfBirth: toDateInput(person?.dateOfBirth ?? null),
      note: person?.note ?? "",
      groupId: person?.groupId ?? "__none__",
    },
  });

  const isEdit = !!person;

  const onSubmit = (values: PersonFormInput) => {
    startTransition(async () => {
      const result = isEdit
        ? await updatePersonAction(person!.id, values)
        : await createPersonAction(values);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "Osoba ažurirana" : "Osoba dodata");
      setOpen(false);
      if (!isEdit) form.reset();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Izmeni osobu" : "Nova osoba"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Ažuriraj podatke o osobi."
              : "Unesite osnovne podatke. Kartica se dodeljuje posebno."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ime</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prezime</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="personType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tip</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {(v: string | null) =>
                            v ? PersonTypeLabel[v as PersonType] : ""
                          }
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PERSON_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {PersonTypeLabel[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="jmbg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>JMBG</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        maxLength={13}
                        placeholder="13 cifara"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Datum rođenja</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+381..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="primer@email.rs" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {groups.length > 0 && (
              <FormField
                control={form.control}
                name="groupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {groupLabel}
                      {!requireGroup && (
                        <span className="ml-1 text-xs font-normal text-zinc-500">
                          (opciono)
                        </span>
                      )}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {(v: string | null) => {
                              if (!v || v === "__none__")
                                return <span className="text-zinc-500">— nije dodeljena —</span>;
                              const g = groups.find((x) => x.id === v);
                              return g ? g.name : v;
                            }}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {!requireGroup && (
                          <SelectItem value="__none__">
                            — nije dodeljena —
                          </SelectItem>
                        )}
                        {groups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Napomena</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Razred, smer, pozicija, sve što je korisno..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Otkaži
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Sačuvaj" : "Dodaj"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
