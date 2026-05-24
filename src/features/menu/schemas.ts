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
  // Inventar. trackStock je u dijalogu uvek prikazan (checkbox), stock i prag
  // se renderuju samo kad je trackStock=true. Forma ih uvek inicijalizuje
  // (vidi item-form-dialog.tsx) — defaults: trackStock=false, stock=0, threshold=5.
  // Srpske custom poruke da bismo izbegli Zod-ove engleske default-e.
  trackStock: z.boolean({ message: "Označi da li se prati stanje" }),
  stock: z
    .number({ message: "Stanje mora biti broj" })
    .int("Stanje mora biti ceo broj")
    .nonnegative("Stanje ne sme biti negativno")
    .max(100000, "Stanje je preveliko"),
  lowStockThreshold: z
    .number({ message: "Prag upozorenja mora biti broj" })
    .int("Prag mora biti ceo broj")
    .nonnegative("Prag ne sme biti negativan")
    .max(10000, "Prag je preveliki"),
});

export type ItemFormInput = z.infer<typeof itemFormSchema>;

export const reorderSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export type ReorderInput = z.infer<typeof reorderSchema>;
