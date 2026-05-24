"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { categoryFormSchema, itemFormSchema, reorderSchema } from "./schemas";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  createItem,
  updateItem,
  deleteItem,
  setItemAvailable,
  reorderItems,
  MenuServiceError,
} from "./service";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function requireAdmin(): Promise<
  | { denied: true; result: { ok: false; error: string } }
  | { denied: false; tenantId: string }
> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { denied: true, result: { ok: false, error: "Nemate pristup" } };
  }
  return { denied: false, tenantId: session.user.tenantId };
}

function fail(e: unknown, fallback: string): { ok: false; error: string } {
  if (e instanceof MenuServiceError) return { ok: false, error: e.message };
  console.error(e);
  return { ok: false, error: fallback };
}

// ─── KATEGORIJE ───

export async function createCategoryAction(raw: unknown): Promise<ActionResult> {
  const check = await requireAdmin();
  if (check.denied) return check.result;
  const parsed = categoryFormSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neispravno" };
  try {
    await createCategory(check.tenantId, parsed.data);
    revalidatePath("/karta-pica");
    return { ok: true };
  } catch (e) {
    return fail(e, "Greška pri kreiranju kategorije");
  }
}

export async function updateCategoryAction(
  id: string,
  raw: unknown,
): Promise<ActionResult> {
  const check = await requireAdmin();
  if (check.denied) return check.result;
  const parsed = categoryFormSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neispravno" };
  try {
    await updateCategory(check.tenantId, id, parsed.data);
    revalidatePath("/karta-pica");
    return { ok: true };
  } catch (e) {
    return fail(e, "Greška pri izmeni kategorije");
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const check = await requireAdmin();
  if (check.denied) return check.result;
  try {
    await deleteCategory(check.tenantId, id);
    revalidatePath("/karta-pica");
    return { ok: true };
  } catch (e) {
    return fail(e, "Greška pri brisanju kategorije");
  }
}

export async function reorderCategoriesAction(raw: unknown): Promise<ActionResult> {
  const check = await requireAdmin();
  if (check.denied) return check.result;
  const parsed = reorderSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Neispravan redosled" };
  try {
    await reorderCategories(check.tenantId, parsed.data.ids);
    revalidatePath("/karta-pica");
    return { ok: true };
  } catch (e) {
    return fail(e, "Greška pri pomeranju");
  }
}

// ─── STAVKE ───

export async function createItemAction(raw: unknown): Promise<ActionResult> {
  const check = await requireAdmin();
  if (check.denied) return check.result;
  const parsed = itemFormSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neispravno" };
  try {
    await createItem(check.tenantId, parsed.data);
    revalidatePath("/karta-pica");
    return { ok: true };
  } catch (e) {
    return fail(e, "Greška pri kreiranju stavke");
  }
}

export async function updateItemAction(
  id: string,
  raw: unknown,
): Promise<ActionResult> {
  const check = await requireAdmin();
  if (check.denied) return check.result;
  const parsed = itemFormSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neispravno" };
  try {
    await updateItem(check.tenantId, id, parsed.data);
    revalidatePath("/karta-pica");
    return { ok: true };
  } catch (e) {
    return fail(e, "Greška pri izmeni stavke");
  }
}

export async function deleteItemAction(id: string): Promise<ActionResult> {
  const check = await requireAdmin();
  if (check.denied) return check.result;
  try {
    await deleteItem(check.tenantId, id);
    revalidatePath("/karta-pica");
    return { ok: true };
  } catch (e) {
    return fail(e, "Greška pri brisanju stavke");
  }
}

export async function setItemAvailableAction(
  id: string,
  isAvailable: boolean,
): Promise<ActionResult> {
  const check = await requireAdmin();
  if (check.denied) return check.result;
  try {
    await setItemAvailable(check.tenantId, id, isAvailable);
    revalidatePath("/karta-pica");
    return { ok: true };
  } catch (e) {
    return fail(e, "Greška pri promeni dostupnosti");
  }
}

export async function reorderItemsAction(
  categoryId: string,
  raw: unknown,
): Promise<ActionResult> {
  const check = await requireAdmin();
  if (check.denied) return check.result;
  const parsed = reorderSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Neispravan redosled" };
  try {
    await reorderItems(check.tenantId, categoryId, parsed.data.ids);
    revalidatePath("/karta-pica");
    return { ok: true };
  } catch (e) {
    return fail(e, "Greška pri pomeranju");
  }
}
