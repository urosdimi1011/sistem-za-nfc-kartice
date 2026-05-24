"use client";

import { useEffect, useState, useTransition } from "react";
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

import { itemFormSchema, type ItemFormInput } from "../schemas";
import { createItemAction, updateItemAction } from "../actions";
import { IconPicker } from "./icon-picker";

interface ItemFormDialogProps {
  trigger: React.ReactElement;
  categoryId: string;
  categoryName: string;
  item?: {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    creditPrice: number;
    isAvailable: boolean;
    trackStock?: boolean;
    stock?: number;
    lowStockThreshold?: number;
  };
}

export function ItemFormDialog({
  trigger,
  categoryId,
  categoryName,
  item,
}: ItemFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<ItemFormInput>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      categoryId,
      name: item?.name ?? "",
      description: item?.description ?? "",
      icon: (item?.icon as ItemFormInput["icon"]) ?? null,
      creditPrice: item?.creditPrice ?? 0,
      isAvailable: item?.isAvailable ?? true,
      trackStock: item?.trackStock ?? false,
      stock: item?.stock ?? 0,
      lowStockThreshold: item?.lowStockThreshold ?? 5,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        categoryId,
        name: item?.name ?? "",
        description: item?.description ?? "",
        icon: (item?.icon as ItemFormInput["icon"]) ?? null,
        creditPrice: item?.creditPrice ?? 0,
        isAvailable: item?.isAvailable ?? true,
        // BITNO: ova tri polja moraju biti u reset-u, inače postaju undefined
        // kad se dialog ponovo otvori → Zod baca "expected number, received undefined".
        trackStock: item?.trackStock ?? false,
        stock: item?.stock ?? 0,
        lowStockThreshold: item?.lowStockThreshold ?? 5,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isEdit = !!item;
  const trackStock = form.watch("trackStock");
  const wasTrackingBefore = item?.trackStock ?? false;

  const onSubmit = (values: ItemFormInput) => {
    startTransition(async () => {
      const result = isEdit
        ? await updateItemAction(item!.id, values)
        : await createItemAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "Stavka ažurirana" : "Stavka dodata");
      setOpen(false);
      if (!isEdit) form.reset();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Izmeni stavku" : "Nova stavka"}</DialogTitle>
          <DialogDescription>
            Kategorija: <strong>{categoryName}</strong>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Naziv</FormLabel>
                    <FormControl>
                      <Input placeholder="npr. Espresso" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="creditPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cena (RSD)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? 0 : Number(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opis (opciono)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="npr. dupli espresso sa malo mleka..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ikona</FormLabel>
                  <p className="text-xs text-zinc-500">
                    Možeš ostaviti "Nasleđuj" da koristi ikonu kategorije.
                  </p>
                  <FormControl>
                    <IconPicker
                      value={field.value ?? null}
                      onChange={(i) => field.onChange(i)}
                      allowInherit
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isAvailable"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4"
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Dostupno u baru</FormLabel>
                </FormItem>
              )}
            />

            {/* INVENTAR */}
            <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
              <FormField
                control={form.control}
                name="trackStock"
                render={({ field }) => (
                  <FormItem className="flex items-start gap-3 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="mt-0.5 h-4 w-4"
                      />
                    </FormControl>
                    <div>
                      <FormLabel className="!mt-0">
                        Prati stanje zaliha
                      </FormLabel>
                      <p className="text-xs text-zinc-500">
                        Korisno za boce, snack-ove, sve sa fizičkom količinom.
                        Espresso, čaj — ne treba.
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              {trackStock && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {wasTrackingBefore
                            ? "Trenutno stanje"
                            : "Početno stanje"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={field.value}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value),
                              )
                            }
                            disabled={wasTrackingBefore}
                          />
                        </FormControl>
                        {wasTrackingBefore && (
                          <p className="text-xs text-zinc-500">
                            Stanje se menja preko "Dopuni" / "Otpiši" akcija
                            (zbog praćenja radnji).
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lowStockThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prag za upozorenje</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={field.value}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value),
                              )
                            }
                          />
                        </FormControl>
                        <p className="text-xs text-zinc-500">
                          Crveni badge kada stanje padne ispod ovog broja.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
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
