import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { SystemRole } from "@/generated/prisma/enums";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const ADMIN_IDLE_SECONDS = 10 * 60;
const DEFAULT_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
// Na koliko se sekundi token revalidira protiv baze (deaktivacija naloga,
// promena lozinke/uloge, deaktivacija tenanta). JWT bez ovoga važi do isteka
// (30 dana za konobare) čak i kad admin ugasi nalog.
const REVALIDATE_SECONDS = 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: DEFAULT_MAX_AGE_SECONDS,
    updateAge: 0,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Lozinka", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const account = await prisma.systemAccount.findUnique({
          where: { email },
          include: {
            tenant: { select: { id: true, slug: true, isActive: true } },
          },
        });

        if (!account || !account.isActive) return null;
        if (!account.tenant.isActive) return null;

        const valid = await bcrypt.compare(password, account.passwordHash);
        if (!valid) return null;

        prisma.systemAccount
          .update({
            where: { id: account.id },
            data: { lastLoginAt: new Date() },
          })
          .catch(() => {});

        return {
          id: account.id,
          email: account.email,
          role: account.role,
          personId: account.personId,
          tenantId: account.tenantId,
          tenantSlug: account.tenant.slug,
          passwordChangedAt: account.passwordChangedAt.getTime(),
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.personId = user.personId;
        token.tenantId = user.tenantId;
        token.tenantSlug = user.tenantSlug;
        token.pwdAt = user.passwordChangedAt;
        token.checkedAt = Date.now();
      }

      // Periodična revalidacija protiv baze — bez ovoga izdati JWT važi do
      // isteka i posle deaktivacije naloga / promene lozinke / gašenja tenanta.
      const lastChecked = (token.checkedAt as number | undefined) ?? 0;
      if (Date.now() - lastChecked > REVALIDATE_SECONDS * 1000) {
        const account = await prisma.systemAccount.findUnique({
          where: { id: token.id as string },
          select: {
            isActive: true,
            role: true,
            passwordChangedAt: true,
            tenant: { select: { isActive: true } },
          },
        });
        if (!account || !account.isActive || !account.tenant.isActive) {
          return null; // sesija se poništava — korisnik ide na login
        }
        if (
          typeof token.pwdAt === "number" &&
          account.passwordChangedAt.getTime() > token.pwdAt
        ) {
          return null; // lozinka resetovana posle izdavanja tokena
        }
        token.role = account.role; // promena uloge važi odmah, ne tek na re-login
        token.checkedAt = Date.now();
      }

      if (token.role === "ADMIN" || token.role === "MANAGER") {
        token.exp = Math.floor(Date.now() / 1000) + ADMIN_IDLE_SECONDS;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as SystemRole;
        session.user.personId = token.personId as string | null;
        session.user.tenantId = token.tenantId as string;
        session.user.tenantSlug = token.tenantSlug as string;
      }
      return session;
    },
  },
});
