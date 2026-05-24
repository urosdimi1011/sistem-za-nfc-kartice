"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, PackagePlus } from "lucide-react";
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

import { restockSchema, type RestockInput } from "../schemas";
import { restockAction } from "../actions";

interface RestockDialogProps {
  trigger: React.ReactElement;
  menuItemId: string;
  itemName: string;
  currentStock: number;
}

export function RestockDialog({
  trigger,
  menuItemId,
  itemName,
  currentStock,
}: RestockDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<RestockInput>({
    resolver: zodResolver(restockSchema),
    defaultValues: { menuItemId, quantity: 10, note: "" },
  });

  const quantity = form.watch("quantity") || 0;
  const newTotal = currentStock + quantity;

  const onSubmit = (values: RestockInput) => {
    startTransition(async () => {
      const r = await restockAction(values);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Dopunjeno: ${itemName} +${values.quantity} (novo stanje: ${r.data?.newStock})`);
      setOpen(false);
      form.reset({ menuItemId, quantity: 10, note: "" });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-green-600" />
            Dopuni zalihu
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
                  <FormLabel>Količina dopune</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      autoFocus
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? 0 : Number(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <p className="text-xs text-zinc-500">
                    Novo stanje će biti: <strong>{newTotal}</strong>
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Napomena (opciono)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="npr. dostava 24.05, dobavljač X..."
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
                Dopuni
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
