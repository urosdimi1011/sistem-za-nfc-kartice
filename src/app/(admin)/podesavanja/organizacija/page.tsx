import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { OrganizationForm } from "@/features/settings/components/organization-form";

export const dynamic = "force-dynamic";

export default async function OrganizacijaPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/podesavanja/profil");

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
  });
  if (!tenant) redirect("/login");

  return (
    <OrganizationForm
      initial={{
        name: tenant.name,
        address: tenant.address,
        phone: tenant.phone,
        email: tenant.email,
        primaryColor: tenant.primaryColor,
        slug: tenant.slug,
      }}
    />
  );
}
