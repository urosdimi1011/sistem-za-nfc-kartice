import { z } from "zod";

export const restockSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z
    .number()
    .int("Količina mora biti ceo broj")
    .positive("Količina mora biti veća od 0")
    .max(100000, "Količina je prevelika"),
  note: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type RestockInput = z.infer<typeof restockSchema>;

/** Ručna korekcija — admin kucnuo "trenutno je stvarno 7, ne 9". */
export const adjustStockSchema = z.object({
  menuItemId: z.string().min(1),
  newStock: z
    .number()
    .int("Stanje mora biti ceo broj")
    .nonnegative("Stanje ne sme biti negativno")
    .max(100000),
  note: z
    .string()
    .trim()
    .min(3, "Razlog korekcije je obavezan (min 3 znaka)")
    .max(200),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

/** Otpis — proliveno, isteklo, polomljeno. */
export const wasteSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z
    .number()
    .int()
    .positive("Količina mora biti veća od 0")
    .max(100000),
  note: z
    .string()
    .trim()
    .min(3, "Razlog otpisa je obavezan (min 3 znaka)")
    .max(200),
});

export type WasteInput = z.infer<typeof wasteSchema>;

export const inventoryQuerySchema = z.object({
  status: z.enum(["ALL", "OK", "LOW", "OUT"]).default("ALL"),
  search: z.string().trim().optional(),
});

export type InventoryQuery = z.infer<typeof inventoryQuerySchema>;
