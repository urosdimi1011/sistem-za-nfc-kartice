import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseTenantSettings } from "@/features/settings/schemas";
import { RulesForm } from "@/features/settings/components/rules-form";

export const dynamic = "force-dynamic";

export default async function PravilaPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/podesavanja/profil");

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { settings: true },
  });
  if (!tenant) redirect("/login");

  const settings = parseTenantSettings(tenant.settings);

  return <RulesForm initial={settings} />;
}
