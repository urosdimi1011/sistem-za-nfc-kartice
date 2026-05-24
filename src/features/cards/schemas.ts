import { z } from "zod";

export const UID_PATTERN = /^[a-zA-Z0-9:\- ]{4,64}$/;

export const cardRegisterSchema = z.object({
  personId: z.string().min(1, "Izaberi osobu"),
  uid: z
    .string()
    .trim()
    .min(4, "UID je prekratak")
    .max(64, "UID je predugačak")
    .regex(UID_PATTERN, "UID sadrži neispravne znakove"),
  replaceExisting: z.boolean().default(false),
});

export type CardRegisterInput = z.infer<typeof cardRegisterSchema>;

export const cardsQuerySchema = z.object({
  search: z.string().trim().optional(),
  personId: z.string().optional(),
  status: z.enum(["ACTIVE", "BLOCKED", "ALL"]).default("ACTIVE"),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(5).max(100).default(20),
  sort: z.enum(["registeredAt", "isActive"]).default("registeredAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type CardsQuery = z.infer<typeof cardsQuerySchema>;
