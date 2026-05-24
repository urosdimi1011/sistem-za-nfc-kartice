import { z } from "zod";
import { MENU_ICONS, COLOR_SLUGS } from "@/lib/menu-presets";

const trimmed = (max: number) => z.string().trim().max(max);

export const categoryFormSchema = z.object({
  name: trimmed(50).min(1, "Ime je obavezno"),
  icon: z.enum(MENU_ICONS),
  color: z.enum(COLOR_SLUGS),
  isVisible: z.boolean(),
});

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;

export const itemFormSchema = z.object({
  categoryId: z.string().min(1, "Kategorija je obavezna"),
  name: trimmed(60).min(1, "Ime je obavezno"),
  description: trimmed(200)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  icon: z
    .enum(MENU_ICONS)
    .nullable()
    .optional(),
  creditPrice: z
    .number()
    .int("Cena mora biti ceo broj")
    .nonnegative("Cena ne može biti negativna")
    .max(1_000_000, "Cena je prevelika"),
  isAvailable: z.boolean(),
  // Inventar — opciono
  trackStock: z.boolean(),
  stock: z.number().int().nonnegative().max(100000),
  lowStockThreshold: z.number().int().nonnegative().max(10000),
});

export type ItemFormInput = z.infer<typeof itemFormSchema>;

export const reorderSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export type ReorderInput = z.infer<typeof reorderSchema>;
