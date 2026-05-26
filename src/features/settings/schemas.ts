import { z } from "zod";
import { COLOR_SLUGS } from "@/lib/menu-presets";

// ─── PROFIL ─────────────────────────────────────────────

export const profileSchema = z.object({
  email: z.string().trim().email("Unesi validan email").max(120),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Trenutna lozinka je obavezna"),
    newPassword: z.string().min(8, "Nova lozinka mora imati bar 8 znakova"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Lozinke se ne poklapaju",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ─── ORGANIZACIJA ───────────────────────────────────────

export const organizationSchema = z.object({
  name: z.string().trim().min(1, "Naziv je obavezan").max(100),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Unesi validan email")
    .optional()
    .or(z.literal("")),
  primaryColor: z.enum(COLOR_SLUGS).optional().or(z.literal("")),
});

export type OrganizationInput = z.infer<typeof organizationSchema>;

// ─── PRAVILA (tenant settings JSON) ─────────────────────

export const tenantSettingsSchema = z.object({
  allowStudentNegativeBalance: z.boolean(),
  maxNegativeBalanceEmployee: z.number().int().nonnegative().nullable(),
  defaultStudentInitialBalance: z.number().int().nonnegative(),
  defaultEmployeeInitialBalance: z.number().int().nonnegative(),
  requireJmbg: z.boolean(),
  requireDeductNote: z.boolean(),
  monthlyResetDay: z.number().int().min(1).max(28),
  currency: z.string().min(2).max(5),
  // Maksimalna dnevna potrošnja po osobi (anti-zloupotreba klonirane kartice).
  // null = nema limita.
  maxDailySpendPerPerson: z.number().int().positive().nullable(),
  // Da li je dozvoljen upload slike za osobu (anti-zloupotreba klonirane kartice).
  // Neki tenanti ne žele biometrijske podatke — mogu da isključe.
  allowPhotos: z.boolean(),
  // Grupa (npr. škola, smer, smena) — per-tenant konfigurabilno
  groupLabel: z.string().trim().min(1).max(30),
  groupLabelPlural: z.string().trim().min(1).max(30),
  requireGroup: z.boolean(),
});

export type TenantSettings = z.infer<typeof tenantSettingsSchema>;

export const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  allowStudentNegativeBalance: false,
  maxNegativeBalanceEmployee: null,
  defaultStudentInitialBalance: 0,
  defaultEmployeeInitialBalance: 0,
  requireJmbg: false,
  requireDeductNote: true,
  monthlyResetDay: 1,
  currency: "RSD",
  maxDailySpendPerPerson: null,
  allowPhotos: true,
  groupLabel: "Grupa",
  groupLabelPlural: "Grupe",
  requireGroup: false,
};

export function parseTenantSettings(raw: unknown): TenantSettings {
  const result = tenantSettingsSchema.safeParse(raw);
  return result.success ? result.data : DEFAULT_TENANT_SETTINGS;
}
