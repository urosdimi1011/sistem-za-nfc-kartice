import "server-only";
import { auth } from "@/auth";
import type { SystemRole } from "@/lib/enums";

export interface ActiveSession {
  accountId: string;
  email: string;
  role: SystemRole;
  personId: string | null;
  tenantId: string;
  tenantSlug: string;
}

/**
 * Vraća session ili baca grešku ako nije prijavljen.
 * Koristi se na svim "trusted" mestima (queries, services, server akcije) — garantuje da uvek imamo tenantId.
 */
export async function requireSession(): Promise<ActiveSession> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("UNAUTHORIZED: niste prijavljeni");
  }
  return {
    accountId: session.user.id,
    email: session.user.email,
    role: session.user.role,
    personId: session.user.personId,
    tenantId: session.user.tenantId,
    tenantSlug: session.user.tenantSlug,
  };
}

/** Kao requireSession, ali baca grešku ako rola nije među dozvoljenima. */
export async function requireRole(
  ...allowed: SystemRole[]
): Promise<ActiveSession> {
  const s = await requireSession();
  if (!allowed.includes(s.role)) {
    throw new Error("FORBIDDEN: nemate pristup");
  }
  return s;
}

/** Kratak helper kad ti treba samo tenantId. */
export async function requireTenantId(): Promise<string> {
  const s = await requireSession();
  return s.tenantId;
}
