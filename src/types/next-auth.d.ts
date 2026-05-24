import "next-auth";
import type { SystemRole } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface User {
    id: string;
    role: SystemRole;
    personId: string | null;
    tenantId: string;
    tenantSlug: string;
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
  }
}
