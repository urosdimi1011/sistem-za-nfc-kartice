import { z } from "zod";
import { PERSON_TYPES } from "@/lib/enums";

export const monthQuerySchema = z.object({
  year: z.coerce.number().int().min(2024).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  personType: z.enum([...PERSON_TYPES, "ALL"]).optional(),
  search: z.string().trim().optional(),
  /** Po default-u prikazujemo samo osobe koje su imale neku transakciju u mesecu. */
  onlyWithActivity: z.coerce.boolean().optional().default(true),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(10).max(200).default(50),
});

export type MonthQuery = z.infer<typeof monthQuerySchema>;

export const closeMonthSchema = z.object({
  year: z.coerce.number().int().min(2024).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export type CloseMonthInput = z.infer<typeof closeMonthSchema>;
