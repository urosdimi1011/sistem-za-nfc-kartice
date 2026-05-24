import { z } from "zod";
import { TRANSACTION_TYPES } from "@/lib/enums";

const positiveAmount = z.coerce
  .number()
  .int("Iznos mora biti ceo broj")
  .positive("Iznos mora biti veći od 0")
  .max(10_000_000, "Iznos je prevelik");

const optionalNote = z
  .string()
  .trim()
  .max(500, "Napomena je preduga")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const topUpSchema = z.object({
  personId: z.string().min(1, "Izaberi osobu"),
  amount: positiveAmount,
  note: optionalNote,
});

export type TopUpInput = z.infer<typeof topUpSchema>;

export const deductSchema = z.object({
  personId: z.string().min(1, "Izaberi osobu"),
  amount: positiveAmount,
  note: z
    .string()
    .trim()
    .min(3, "Napomena za skidanje je obavezna (min 3 znaka)")
    .max(500, "Napomena je preduga"),
});

export type DeductInput = z.infer<typeof deductSchema>;

export const transactionsQuerySchema = z.object({
  search: z.string().trim().optional(),
  personId: z.string().optional(),
  type: z.enum([...TRANSACTION_TYPES, "ALL"]).default("ALL"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(5).max(100).default(20),
  sort: z.enum(["createdAt", "amount"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type TransactionsQuery = z.infer<typeof transactionsQuerySchema>;

/**
 * Predefinisani razlozi za ručno skidanje kredita.
 * Admin može da klikne chip ili da kuca svoj razlog.
 */
export const DEDUCT_REASONS = [
  "Ispravka greške konobara",
  "Pogrešno upisana porudžbina",
  "Vraćanje proizvoda",
  "Korekcija stanja",
  "Naplaćeno gotovinom",
] as const;
