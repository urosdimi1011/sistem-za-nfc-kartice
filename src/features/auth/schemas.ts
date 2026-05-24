import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Unesi validan email"),
  password: z.string().min(1, "Lozinka je obavezna"),
});

export type LoginInput = z.infer<typeof loginSchema>;
