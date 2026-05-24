"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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

import { categoryFormSchema, type CategoryFormInput } from "../schemas";
import { createCategoryAction, updateCategoryAction } from "../actions";
import { IconPicker } from "./icon-picker";
import { ColorPicker } from "./color-picker";
import { DEFAULT_ICON } from "@/lib/menu-presets";

interface CategoryFormDialogProps {
  trigger: React.ReactElement;
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
    isVisible: boolean;
  };
}

export function CategoryFormDialog({ trigger, category }: CategoryFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<CategoryFormInput>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name ?? "",
      icon: (category?.icon as CategoryFormInput["icon"]) ?? DEFAULT_ICON,
      color: (category?.color as CategoryFormInput["color"]) ?? "zinc",
      isVisible: category?.isVisible ?? true,
    },
  });

  // Resetuj formu kad se dialog otvori (za edit)
  useEffect(() => {
    if (open && category) {
      form.reset({
        name: category.name,
        icon: category.icon as CategoryFormInput["icon"],
        color: category.color as CategoryFormInput["color"],
        isVisible: category.isVisible,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isEdit = !!category;

  const onSubmit = (values: CategoryFormInput) => {
    startTransition(async () => {
      const result = isEdit
        ? await updateCategoryAction(category!.id, values)
        : await createCategoryAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "Kategorija ažurirana" : "Kategorija dodata");
      setOpen(false);
      if (!isEdit) form.reset();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Izmeni kategoriju" : "Nova kategorija"}</DialogTitle>
          <DialogDescription>
            Kategorija grupiše stavke. Boja i ikona se vide u baru.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Naziv</FormLabel>
                  <FormControl>
                    <Input placeholder="npr. Topli napici" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Boja</FormLabel>
                  <FormControl>
                    <ColorPicker value={field.value} onChange={field.onChange} />
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
                  <FormControl>
                    <IconPicker value={field.value} onChange={(i) => field.onChange(i ?? DEFAULT_ICON)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isVisible"
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
                  <FormLabel className="!mt-0">
                    Vidljiva u baru
                  </FormLabel>
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
