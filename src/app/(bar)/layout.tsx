import Image from "next/image";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default async function BarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const tenantId = session?.user?.tenantId;
  const tenant = tenantId
    ? await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      })
    : null;
  const tenantName = tenant?.name ?? "Bar";

  return (
    <div className="flex h-screen flex-col bg-zinc-100 dark:bg-zinc-950">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700">
            <Image
              src="/img/logo.png"
              alt={`${tenantName} logo`}
              width={40}
              height={40}
              className="h-full w-full object-contain p-0.5"
              priority
            />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight" title={tenantName}>
              {tenantName}
            </h1>
            <p className="text-[11px] text-zinc-500">Bar terminal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-zinc-600 sm:inline dark:text-zinc-400">
            {session?.user?.email}
          </span>
          <ThemeToggle variant="outline" />
          <LogoutButton variant="outline" />
        </div>
      </header>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
