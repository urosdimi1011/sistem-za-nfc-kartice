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
