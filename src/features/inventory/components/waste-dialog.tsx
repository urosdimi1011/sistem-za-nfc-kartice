"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Trash2 } from "lucide-react";
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

import { wasteSchema, type WasteInput } from "../schemas";
import { recordWasteAction } from "../actions";

const PRESET_REASONS = [
  "Proliveno",
  "Isteklo",
  "Polomljeno",
  "Pokvareno",
  "Konobar otpisao",
];

interface WasteDialogProps {
  trigger: React.ReactElement;
  menuItemId: string;
  itemName: string;
  currentStock: number;
}

export function WasteDialog({
  trigger,
  menuItemId,
  itemName,
  currentStock,
}: WasteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<WasteInput>({
    resolver: zodResolver(wasteSchema),
    defaultValues: { menuItemId, quantity: 1, note: "" },
  });

  const onSubmit = (values: WasteInput) => {
    startTransition(async () => {
      const r = await recordWasteAction(values);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Otpisano: ${itemName} −${values.quantity} (novo stanje: ${r.data?.newStock})`);
      setOpen(false);
      form.reset({ menuItemId, quantity: 1, note: "" });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            Otpiši zalihu
          </DialogTitle>
          <DialogDescription>
            <strong>{itemName}</strong> · trenutno na stanju: {currentStock}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Količina za otpis</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={currentStock}
                      autoFocus
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
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razlog</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Razlog otpisa..."
                      {...field}
                    />
                  </FormControl>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {PRESET_REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => field.onChange(r)}
                        className="rounded-full border border-zinc-300 px-2 py-0.5 text-[11px] text-zinc-600 hover:border-primary hover:text-primary dark:border-zinc-700 dark:text-zinc-400"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
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
              <Button
                type="submit"
                variant="destructive"
                disabled={isPending}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Otpiši
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
