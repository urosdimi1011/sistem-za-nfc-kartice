"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTenantSettings } from "@/features/settings/queries";

const MAX_PHOTO_BYTES = 200 * 1024; // 200 KB hard limit (compressed sa client-a stiže <60KB)
const ALLOWED_MIME = ["image/webp", "image/jpeg", "image/png"];

export type PhotoActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireAdminOrManager() {
  const session = await auth();
  if (!session) return { denied: true as const, error: "Niste prijavljeni" };
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return { denied: true as const, error: "Nemate pristup" };
  }
  return { denied: false as const, tenantId: session.user.tenantId };
}

/**
 * Snima sliku za osobu. Prima base64 data URL stringa (klijent ga već smanji
 * i konvertuje u WebP preko canvas API-ja pre slanja).
 * Overwrite stare slike je atomski — Bytes kolona se prepiše.
 */
export async function uploadPersonPhotoAction(
  personId: string,
  dataUrl: string,
): Promise<PhotoActionResult> {
  const check = await requireAdminOrManager();
  if (check.denied) return { ok: false, error: check.error };

  // Tenant feature toggle
  const settings = await getTenantSettings(check.tenantId);
  if (!settings.allowPhotos) {
    return { ok: false, error: "Slike osoba nisu dozvoljene u podešavanjima" };
  }

  // Parse data URL
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return { ok: false, error: "Neispravan format slike" };
  const mime = match[1];
  if (!ALLOWED_MIME.includes(mime)) {
    return { ok: false, error: `Nepodržan format (${mime})` };
  }
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length === 0) return { ok: false, error: "Prazna slika" };
  if (buffer.length > MAX_PHOTO_BYTES) {
    return {
      ok: false,
      error: `Slika je prevelika (${Math.round(buffer.length / 1024)} KB, max ${MAX_PHOTO_BYTES / 1024} KB)`,
    };
  }

  // Tenant scope check
  const person = await prisma.person.findFirst({
    where: { id: personId, tenantId: check.tenantId },
    select: { id: true },
  });
  if (!person) return { ok: false, error: "Osoba ne postoji" };

  await prisma.person.update({
    where: { id: personId },
    data: { photo: buffer, photoMime: mime },
  });

  revalidatePath("/osobe");
  return { ok: true };
}

export async function removePersonPhotoAction(
  personId: string,
): Promise<PhotoActionResult> {
  const check = await requireAdminOrManager();
  if (check.denied) return { ok: false, error: check.error };

  const person = await prisma.person.findFirst({
    where: { id: personId, tenantId: check.tenantId },
    select: { id: true },
  });
  if (!person) return { ok: false, error: "Osoba ne postoji" };

  await prisma.person.update({
    where: { id: personId },
    data: { photo: null, photoMime: null },
  });

  revalidatePath("/osobe");
  return { ok: true };
}
