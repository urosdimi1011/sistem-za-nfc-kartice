import { z } from "zod";

export const groupFormSchema = z.object({
  name: z.string().trim().min(1, "Naziv je obavezan").max(100),
  shortName: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal("")),
  isActive: z.boolean(),
});

export type GroupFormInput = z.infer<typeof groupFormSchema>;

export const reorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});
