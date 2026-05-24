"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  profileSchema,
  changePasswordSchema,
  organizationSchema,
  tenantSettingsSchema,
} from "./schemas";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const SALT_ROUNDS = 10;

// ─── PROFIL (svaki user može sebi) ──────────────────────

export async function updateProfileAction(raw: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "Niste prijavljeni" };

  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neispravno" };
  }

  const emailLower = parsed.data.email.toLowerCase();

  // Provera da email nije zauzet
  if (emailLower !== session.user.email) {
    const taken = await prisma.systemAccount.findUnique({
      where: { email: emailLower },
      select: { id: true },
    });
    if (taken && taken.id !== session.user.id) {
      return { ok: false, error: "Email je već zauzet" };
    }
  }

  try {
    await prisma.systemAccount.update({
      where: { id: session.user.id },
      data: { email: emailLower },
    });
    revalidatePath("/podesavanja/profil");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Greška pri izmeni profila" };
  }
}

export async function changeOwnPasswordAction(
  raw: unknown,
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "Niste prijavljeni" };

  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neispravno" };
  }

  const account = await prisma.systemAccount.findUnique({
    where: { id: session.user.id },
  });
  if (!account) return { ok: false, error: "Nalog ne postoji" };

  const valid = await bcrypt.compare(
    parsed.data.currentPassword,
    account.passwordHash,
  );
  if (!valid) return { ok: false, error: "Trenutna lozinka nije tačna" };

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, SALT_ROUNDS);
  try {
    await prisma.systemAccount.update({
      where: { id: session.user.id },
      data: { passwordHash, passwordChangedAt: new Date() },
    });
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Greška pri promeni lozinke" };
  }
}

// ─── ORGANIZACIJA (admin only) ──────────────────────────

export async function updateOrganizationAction(
  raw: unknown,
): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { ok: false, error: "Nemate pristup" };
  }

  const parsed = organizationSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neispravno" };
  }

  try {
    await prisma.tenant.update({
      where: { id: session.user.tenantId },
      data: {
        name: parsed.data.name,
        address: parsed.data.address || null,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        primaryColor: parsed.data.primaryColor || null,
      },
    });
    revalidatePath("/podesavanja/organizacija");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Greška pri izmeni organizacije" };
  }
}

// ─── PRAVILA (admin only) ───────────────────────────────

export async function updateTenantSettingsAction(
  raw: unknown,
): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { ok: false, error: "Nemate pristup" };
  }

  const parsed = tenantSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neispravno" };
  }

  try {
    await prisma.tenant.update({
      where: { id: session.user.tenantId },
      data: { settings: parsed.data },
    });
    revalidatePath("/podesavanja/pravila");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Greška pri izmeni pravila" };
  }
}
