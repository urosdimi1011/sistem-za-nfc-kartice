import { Building2, Info, ScrollText, UserCircle } from "lucide-react";

import { auth } from "@/auth";
import { SidebarNavLink } from "@/components/layout/sidebar-nav-link";

const iconCls = "h-4 w-4";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    href: "/podesavanja/profil",
    label: "Moj profil",
    icon: <UserCircle className={iconCls} />,
  },
  {
    href: "/podesavanja/organizacija",
    label: "Organizacija",
    icon: <Building2 className={iconCls} />,
    adminOnly: true,
  },
  {
    href: "/podesavanja/pravila",
    label: "Pravila",
    icon: <ScrollText className={iconCls} />,
    adminOnly: true,
  },
  {
    href: "/podesavanja/o-sistemu",
    label: "O sistemu",
    icon: <Info className={iconCls} />,
  },
];

export default async function PodesavanjaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const visible = navItems.filter((i) => !i.adminOnly || isAdmin);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Podešavanja</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Konfiguracija sistema i tvog naloga
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[14rem_1fr]">
        <nav className="flex flex-col gap-1">
          {visible.map((item) => (
            <SidebarNavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
            />
          ))}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
