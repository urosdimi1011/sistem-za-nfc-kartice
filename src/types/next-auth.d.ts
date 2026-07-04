import "next-auth";
import type { SystemRole } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface User {
    id: string;
    role: SystemRole;
    personId: string | null;
    tenantId: string;
    tenantSlug: string;
    /** epoch ms — koristi se za poništavanje sesije posle reset-a lozinke */
    passwordChangedAt: number;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      role: SystemRole;
      personId: string | null;
      tenantId: string;
      tenantSlug: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: SystemRole;
    personId: string | null;
    tenantId: string;
    tenantSlug: string;
    /** passwordChangedAt naloga u trenutku izdavanja tokena (epoch ms) */
    pwdAt?: number;
    /** poslednja revalidacija tokena protiv baze (epoch ms) */
    checkedAt?: number;
  }
}
