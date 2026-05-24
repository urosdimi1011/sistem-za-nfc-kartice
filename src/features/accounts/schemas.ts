import { z } from "zod";
import { SYSTEM_ROLES } from "@/lib/enums";

const passwordRule = z
  .string()
  .min(8, "Lozinka mora imati bar 8 znakova")
  .max(72, "Lozinka je preduga");

export const createAccountSchema = z.object({
  email: z.string().trim().email("Unesi validan email").max(120),
  password: passwordRule,
  role: z.enum(SYSTEM_ROLES),
  // Prazan string znači "nema vezane osobe" — service to normalizuje u null
  personId: z.string().optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const updateAccountSchema = z.object({
  email: z.string().trim().email("Unesi validan email").max(120),
  role: z.enum(SYSTEM_ROLES),
  isActive: z.boolean(),
});

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export const resetPasswordSchema = z.object({
  password: passwordRule,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const accountsQuerySchema = z.object({
  search: z.string().trim().optional(),
  role: z.enum([...SYSTEM_ROLES, "ALL"]).default("ALL"),
  status: z.enum(["ACTIVE", "INACTIVE", "ALL"]).default("ACTIVE"),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(5).max(100).default(20),
});

export type AccountsQuery = z.infer<typeof accountsQuerySchema>;
