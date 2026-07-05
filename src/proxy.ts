import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { SystemRole } from "./lib/enums";
const ADMIN_PREFIXES = [
  "/dashboard",
  "/osobe",
  "/kartice",
  "/transakcije",
  "/karta-pica",
  "/izvestaji",
  "/smene",
  "/stanje",
  "/grupe",
  "/nalozi",
  "/podesavanja",
];
const ADMIN_ONLY_PREFIXES = ["/nalozi"];
const BARTENDER_PREFIXES = ["/terminal"];

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const path = nextUrl.pathname;
  const role = session?.user.role;

  const isAdminRoute = ADMIN_PREFIXES.some((p) => path.startsWith(p));
  const isAdminOnlyRoute = ADMIN_ONLY_PREFIXES.some((p) => path.startsWith(p));
  const isBartenderRoute = BARTENDER_PREFIXES.some((p) => path.startsWith(p));
  const isLoginRoute = path === "/login";

  if (!session && (isAdminRoute || isBartenderRoute)) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (session && isLoginRoute) {
    const target = role === SystemRole.BARTENDER ? "/terminal" : "/dashboard";
    return NextResponse.redirect(new URL(target, nextUrl));
  }

  if (role === SystemRole.BARTENDER && isAdminRoute) {
    return NextResponse.redirect(new URL("/terminal", nextUrl));
  }

  if (role === SystemRole.MANAGER && isAdminOnlyRoute) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
