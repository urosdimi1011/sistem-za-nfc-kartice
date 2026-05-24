import "server-only";
import { prisma } from "@/lib/prisma";
import { parseTenantSettings, type TenantSettings } from "./schemas";

/**
 * Učitava i parsira tenant settings JSON.
 * Ako fali ili je polje invalidno, vraća default-e (parseTenantSettings to radi).
 *
 * Koristi se iz biznis servisa (credits, orders, people) da primene pravila.
 */
export async function getTenantSettings(tenantId: string): Promise<TenantSettings> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });
  return parseTenantSettings(tenant?.settings);
}
