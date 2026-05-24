import { z } from "zod";

export const orderItemInputSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});

export const createOrderSchema = z.object({
  cardId: z.string().min(1, "Kartica je obavezna"),
  items: z.array(orderItemInputSchema).min(1, "Korpa je prazna"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
