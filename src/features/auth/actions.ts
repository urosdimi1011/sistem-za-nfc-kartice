"use server";

import { AuthError } from "next-auth";
import { signIn, signOut, auth } from "@/auth";
import { loginSchema } from "./schemas";

export type LoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Neispravni podaci" };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, error: "Pogrešan email ili lozinka" };
    }
    throw e;
  }

  const session = await auth();
  const redirectTo = session?.user?.role === "BARTENDER" ? "/terminal" : "/dashboard";
  return { ok: true, redirectTo };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
