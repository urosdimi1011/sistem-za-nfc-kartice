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
import { ColorPicker } from "@/features/menu/components/color-picker";
import type { MenuColorSlug } from "@/lib/menu-presets";

import { organizationSchema, type OrganizationInput } from "../schemas";
import { updateOrganizationAction } from "../actions";

interface OrganizationFormProps {
  initial: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    primaryColor: string | null;
    slug: string;
  };
}

export function OrganizationForm({ initial }: OrganizationFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<OrganizationInput>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: initial.name,
      address: initial.address ?? "",
      phone: initial.phone ?? "",
      email: initial.email ?? "",
      primaryColor: (initial.primaryColor as OrganizationInput["primaryColor"]) ?? "",
    },
  });

  const onSubmit = (values: OrganizationInput) => {
    startTransition(async () => {
      const result = await updateOrganizationAction(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Organizacija ažurirana");
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-base font-semibold">Organizacija</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Naziv i kontakt prikazani u izveštajima i printovima.
        </p>
        <div className="mt-2 text-xs text-zinc-400">
          Slug: <span className="font-mono">{initial.slug}</span>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-4 space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Naziv</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresa</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="primaryColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primarna boja (priprema za brending)</FormLabel>
                  <p className="text-xs text-zinc-500">
                    Trenutno se ne primenjuje u UI-u — biće aktivno kad uvedemo
                    brendiranje po organizaciji.
                  </p>
                  <FormControl>
                    <ColorPicker
                      value={(field.value || "zinc") as MenuColorSlug}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sačuvaj
            </Button>
          </form>
        </Form>
      </section>
    </div>
  );
}
