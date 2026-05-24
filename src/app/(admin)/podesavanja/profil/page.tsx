import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/features/settings/components/profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Stara JWT cookie pre tenant refactor-a → forsiraj re-login
  if (!session.user.tenantId) redirect("/login");

  const account = await prisma.systemAccount.findUnique({
    where: { id: session.user.id },
    include: { tenant: { select: { name: true } } },
  });
  if (!account) redirect("/login");

  return (
    <ProfileForm
      initialEmail={account.email}
      role={account.role}
      tenantName={account.tenant.name}
      lastLoginAt={account.lastLoginAt}
    />
  );
}
