// Centralno mesto za enume domena.
// Re-eksportujemo Prisma enume (izvor istine) + dajemo srpske labele i nizove
// za iteraciju u UI komponentama (selectovi, filteri, badge-evi).

import {
  PersonType,
  SystemRole,
  TransactionType,
} from "@/generated/prisma/enums";

export { PersonType, SystemRole, TransactionType };

// ─── PersonType ──────────────────────────────────────────

export const PersonTypeLabel: Record<PersonType, string> = {
  STUDENT: "Učenik",
  EMPLOYEE: "Zaposleni",
};

export const PersonTypeLabelPlural: Record<PersonType, string> = {
  STUDENT: "Učenici",
  EMPLOYEE: "Zaposleni",
};

export const PERSON_TYPES = ["STUDENT", "EMPLOYEE"] as const satisfies readonly PersonType[];

// ─── SystemRole ──────────────────────────────────────────

export const SystemRoleLabel: Record<SystemRole, string> = {
  ADMIN: "Admin",
  MANAGER: "Menadžer",
  BARTENDER: "Konobar",
};

export const SystemRoleDescription: Record<SystemRole, string> = {
  ADMIN: "Pun pristup. Pravi i briše druge naloge.",
  MANAGER: "Operativni pristup. Ne može da pravi/briše naloge.",
  BARTENDER: "Samo bar terminal.",
};

export const SYSTEM_ROLES = [
  "ADMIN",
  "MANAGER",
  "BARTENDER",
] as const satisfies readonly SystemRole[];

// ─── TransactionType ─────────────────────────────────────

export const TransactionTypeLabel: Record<TransactionType, string> = {
  TOPUP: "Uplata",
  MANUAL_DEDUCT: "Ručno skidanje",
  ORDER: "Porudžbina",
  MONTHLY_RESET: "Mesečno zatvaranje",
};

export const TRANSACTION_TYPES = [
  "TOPUP",
  "MANUAL_DEDUCT",
  "ORDER",
  "MONTHLY_RESET",
] as const satisfies readonly TransactionType[];
