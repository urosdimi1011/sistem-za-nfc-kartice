"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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

import {
  tenantSettingsSchema,
  type TenantSettings,
} from "../schemas";
import { updateTenantSettingsAction } from "../actions";

interface RulesFormProps {
  initial: TenantSettings;
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        {description && (
          <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
        )}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0"
      />
    </label>
  );
}

export function RulesForm({ initial }: RulesFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<TenantSettings>({
    resolver: zodResolver(tenantSettingsSchema),
    defaultValues: initial,
  });

  const maxNeg = form.watch("maxNegativeBalanceEmployee");

  const onSubmit = (values: TenantSettings) => {
    startTransition(async () => {
      const result = await updateTenantSettingsAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Pravila ažurirana");
    });
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Krediti */}
          <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-base font-semibold">Pravila kredita</h2>
            <FormField
              control={form.control}
              name="allowStudentNegativeBalance"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Toggle
                      label="Učenici mogu u minus"
                      description="Default: ne. Ako uključiš, učenici takođe mogu kupiti i kad nemaju kredita."
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="requireDeductNote"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Toggle
                      label="Obavezna napomena pri skidanju kredita"
                      description="Admin mora da unese razlog kad ručno skida kredite (audit trag)."
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxNegativeBalanceEmployee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maksimalni minus zaposlenog</FormLabel>
                  <p className="text-xs text-zinc-500">
                    Prazno = neograničeno. Inače max negativno stanje koje zaposleni
                    može imati.
                  </p>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      value={field.value === null ? "" : field.value}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                      placeholder="Neograničeno"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          {/* Defaultne vrednosti */}
          <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-base font-semibold">Default vrednosti</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="defaultStudentInitialBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Početni kredit učenika</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultEmployeeInitialBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Početni kredit zaposlenog</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          {/* Osobe */}
          <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-base font-semibold">Podaci o osobama</h2>
            <FormField
              control={form.control}
              name="requireJmbg"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Toggle
                      label="JMBG obavezan"
                      description="Kad je uključeno, JMBG mora da se unese pri kreiranju nove osobe."
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </section>

          {/* Sigurnost / anti-zloupotreba */}
          <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-base font-semibold">Sigurnost</h2>
            <FormField
              control={form.control}
              name="maxDailySpendPerPerson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maks. dnevna potrošnja po osobi</FormLabel>
                  <p className="text-xs text-zinc-500">
                    Anti-zloupotreba klonirane kartice. Ako neko prekorači ovaj
                    iznos u jednom danu (uplate + naplate), bar terminal odbija
                    naplatu. Prazno = bez limita.
                  </p>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      value={field.value === null ? "" : field.value}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                      placeholder="npr. 2000 (bez limita ako je prazno)"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allowPhotos"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Toggle
                      label="Dozvoli slike osoba"
                      description="Konobar prepoznaje lice pri naplati — anti-zloupotreba klonirane kartice. Postavlja se per-osoba, opciono. Isključi ako iz pravnih razloga ne želiš biometrijske podatke."
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </section>

          {/* Mesečno zatvaranje */}
          <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-base font-semibold">Mesečno zatvaranje</h2>
            <FormField
              control={form.control}
              name="monthlyResetDay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dan u mesecu za zatvaranje</FormLabel>
                  <p className="text-xs text-zinc-500">
                    Dan kad se generišu mesečni izveštaji (1-28). Tek za pripremu —
                    automatsko zatvaranje će biti implementirano sa Izveštaji modulom.
                  </p>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={28}
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(Number(e.target.value) || 1)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          {/* Email obaveštenja */}
          <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-base font-semibold">Email obaveštenja</h2>
            <p className="text-xs text-zinc-500">
              Zahteva podešen email nalog (GMAIL_USER / GMAIL_APP_PASSWORD).
              Ako email nije konfigurisan, obaveštenja se tiho preskaču.
            </p>
            <FormField
              control={form.control}
              name="notifyLowBalance"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Toggle
                      label="Obavesti osobu kad joj stanje padne ispod praga"
                      description="Mejl se šalje osobi (ako ima upisan email) samo u trenutku kad stanje pređe prag — ne na svaku kupovinu."
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {form.watch("notifyLowBalance") && (
              <FormField
                control={form.control}
                name="lowBalanceNotifyThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prag za obaveštenje o niskom stanju</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value) || 1)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="notifyLowStock"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Toggle
                      label="Obavesti admine kad zalihe padnu ispod praga"
                      description="Mejl svim aktivnim admin nalozima kad artikal sa praćenjem zaliha padne ispod svog praga (podešava se po artiklu)."
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </section>

          {/* Valuta */}
          <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-base font-semibold">Valuta</h2>
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem className="mt-3">
                  <FormLabel>Skraćenica valute</FormLabel>
                  <FormControl>
                    <Input maxLength={5} placeholder="RSD" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <div className="sticky bottom-0 -mx-2 flex justify-end gap-2 bg-zinc-50/80 px-2 py-3 backdrop-blur dark:bg-zinc-950/80">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sačuvaj pravila
            </Button>
          </div>

          {/* Debug: pomocna napomena za maxNeg */}
          {maxNeg !== null && maxNeg > 0 && (
            <p className="text-xs text-zinc-400">
              Zaposleni mogu maksimalno u minus do {maxNeg} kredita.
            </p>
          )}
        </form>
      </Form>
    </div>
  );
}
