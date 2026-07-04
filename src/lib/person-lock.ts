import "server-only";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Zaključava red osobe (`SELECT ... FOR UPDATE`) unutar tekuće transakcije.
 *
 * Sve operacije koje menjaju CreditBalance rade read-modify-write (pročitaj
 * stanje → izračunaj novo → upiši). Bez zaključavanja, dve istovremene
 * operacije nad istom osobom (dupli klik, dva terminala, cron + admin) mogu
 * obe da pročitaju isto početno stanje i jedna izmena se tiho izgubi.
 *
 * Lock na Person redu serijalizuje sve balance operacije po osobi — druga
 * transakcija čeka da prva završi, pa tek onda čita svеže stanje. Lock se
 * otpušta automatski na COMMIT/ROLLBACK.
 *
 * MORA se pozvati PRE čitanja CreditBalance-a u istoj transakciji.
 */
export async function lockPersonRow(
  tx: Prisma.TransactionClient,
  personId: string,
): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "Person" WHERE id = ${personId} FOR UPDATE`;
}
