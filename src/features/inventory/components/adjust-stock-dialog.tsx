"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, SlidersHorizontal } from "lucide-react";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { adjustStockSchema, type AdjustStockInput } from "../schemas";
import { adjustStockAction } from "../actions";

interface AdjustStockDialogProps {
  trigger: React.ReactElement;
  menuItemId: string;
  itemName: string;
  currentStock: number;
}

export function AdjustStockDialog({
  trigger,
  menuItemId,
  itemName,
  currentStock,
}: AdjustStockDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<AdjustStockInput>({
    resolver: zodResolver(adjustStockSchema),
    defaultValues: { menuItemId, newStock: currentStock, note: "" },
  });

  const newStock = form.watch("newStock") || 0;
  const delta = newStock - currentStock;

  const onSubmit = (values: AdjustStockInput) => {
    startTransition(async () => {
      const r = await adjustStockAction(values);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Stanje postavljeno: ${itemName} = ${r.data?.newStock}`);
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            Ručna korekcija stanja
          </DialogTitle>
          <DialogDescription>
            <strong>{itemName}</strong> · trenutno: {currentStock}.
            Koristi kad sistemsko stanje ne odgovara fizičkom (npr. nakon
            inventure).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newStock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Novo stvarno stanje</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      autoFocus
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? 0 : Number(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                  {delta !== 0 && (
                    <p
                      className={
                        delta > 0
                          ? "text-xs text-green-600"
                          : "text-xs text-red-600"
                      }
                    >
                      Razlika: {delta > 0 ? `+${delta}` : delta}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razlog (obavezno)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="npr. inventura — nestale 2 boce, krađa..."
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
              <Button type="submit" disabled={isPending || delta === 0}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sačuvaj
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
