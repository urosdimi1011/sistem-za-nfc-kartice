import { z } from "zod";
import { PERSON_TYPES } from "@/lib/enums";

const trimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max);

const optionalString = (max: number) =>
  trimmed(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

export const personFormSchema = z.object({
  firstName: trimmed(50).min(1, "Ime je obavezno"),
  lastName: trimmed(50).min(1, "Prezime je obavezno"),
  personType: z.enum(PERSON_TYPES),
  jmbg: trimmed(13)
    .regex(/^\d{13}$/, "JMBG mora imati tačno 13 cifara")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  phone: optionalString(30),
  email: trimmed(120)
    .email("Unesi validan email")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu yyyy-mm-dd")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  note: optionalString(500),
  groupId: z
    .string()
    .min(1)
    .optional()
    .or(z.literal("").transform(() => undefined))
    .or(z.literal("__none__").transform(() => undefined)),
});

export type PersonFormInput = z.infer<typeof personFormSchema>;

export const peopleQuerySchema = z.object({
  search: z.string().trim().optional(),
  type: z.enum([...PERSON_TYPES, "ALL"]).default("ALL"),
  status: z.enum(["ACTIVE", "INACTIVE", "ALL"]).default("ACTIVE"),
  groupId: z
    .string()
    .trim()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(5).max(100).default(20),
  sort: z
    .enum(["lastName", "firstName", "personType", "createdAt"])
    .default("lastName"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

export type PeopleQuery = z.infer<typeof peopleQuerySchema>;
