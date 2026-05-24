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

import { groupFormSchema, type GroupFormInput } from "../schemas";
import { createGroupAction, updateGroupAction } from "../actions";

interface GroupFormDialogProps {
  trigger: React.ReactElement;
  groupLabel: string; // npr. "Škola"
  group?: {
    id: string;
    name: string;
    shortName: string | null;
    isActive: boolean;
  };
}

export function GroupFormDialog({
  trigger,
  groupLabel,
  group,
}: GroupFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<GroupFormInput>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: group?.name ?? "",
      shortName: group?.shortName ?? "",
      isActive: group?.isActive ?? true,
    },
  });

  useEffect(() => {
    if (open && group) {
      form.reset({
        name: group.name,
        shortName: group.shortName ?? "",
        isActive: group.isActive,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isEdit = !!group;
  const lc = groupLabel.toLowerCase();

  const onSubmit = (values: GroupFormInput) => {
    startTransition(async () => {
      const result = isEdit
        ? await updateGroupAction(group!.id, values)
        : await createGroupAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? `${groupLabel} ažurirana` : `${groupLabel} dodata`);
      setOpen(false);
      if (!isEdit) form.reset();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Izmeni — ${groupLabel}` : `Nova ${lc}`}
          </DialogTitle>
          <DialogDescription>
            Osobe (učenici i zaposleni) mogu biti dodeljene jednoj {lc}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Naziv</FormLabel>
                  <FormControl>
                    <Input placeholder={`npr. Gimnazija Dositej`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="shortName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kratak naziv (opciono)</FormLabel>
                  <FormControl>
                    <Input placeholder="npr. Gimnazija" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
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
                  <FormLabel className="!mt-0">Aktivna</FormLabel>
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
