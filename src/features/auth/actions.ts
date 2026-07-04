"use server";

import { AuthError } from "next-auth";
import { signIn, signOut, auth } from "@/auth";
import { loginSchema } from "./schemas";
import {
  checkLoginBlocked,
  recordLoginFailure,
  recordLoginSuccess,
} from "@/lib/login-rate-limit";

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

  const blockedFor = checkLoginBlocked(parsed.data.email);
  if (blockedFor > 0) {
    return {
      ok: false,
      error: `Previše neuspešnih pokušaja. Pokušaj ponovo za ${Math.ceil(blockedFor / 60)} min.`,
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    recordLoginSuccess(parsed.data.email);
  } catch (e) {
    if (e instanceof AuthError) {
      recordLoginFailure(parsed.data.email);
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
