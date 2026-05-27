import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  Wine,
  FileBarChart,
  Settings,
  UserCog,
  School,
  Package,
} from "lucide-react";
import { auth } from "@/auth";
import { IdleLogoutWatcher } from "@/features/auth/components/idle-logout-watcher";
import { SystemRole } from "@/lib/enums";
import { getTenantSettings } from "@/features/settings/queries";
import { prisma } from "@/lib/prisma";
import { AdminShell, type AdminNavItem } from "@/components/layout/admin-shell";

const iconCls = "h-4 w-4";

interface NavItem extends AdminNavItem {
  adminOnly?: boolean;
}

function buildNavItems(groupLabelPlural: string): NavItem[] {
  return [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className={iconCls} />,
    },
    { href: "/osobe", label: "Osobe", icon: <Users className={iconCls} /> },
    {
      href: "/grupe",
      label: groupLabelPlural,
      icon: <School className={iconCls} />,
    },
    {
      href: "/kartice",
      label: "Kartice",
      icon: <CreditCard className={iconCls} />,
    },
    {
      href: "/transakcije",
      label: "Transakcije",
      icon: <Receipt className={iconCls} />,
    },
    {
      href: "/karta-pica",
      label: "Karta pića",
      icon: <Wine className={iconCls} />,
    },
    {
      href: "/stanje",
      label: "Stanje",
      icon: <Package className={iconCls} />,
    },
    {
      href: "/izvestaji",
      label: "Izveštaji",
      icon: <FileBarChart className={iconCls} />,
    },
    {
      href: "/nalozi",
      label: "Nalozi",
      icon: <UserCog className={iconCls} />,
      adminOnly: true,
    },
    {
      href: "/podesavanja",
      label: "Podešavanja",
      icon: <Settings className={iconCls} />,
    },
  ];
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAdmin = session?.user?.role === SystemRole.ADMIN;
  const role = session?.user?.role;
  const tenantId = session?.user?.tenantId;
  const [settings, tenant] = await Promise.all([
    tenantId ? getTenantSettings(tenantId) : Promise.resolve(null),
    tenantId
      ? prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { name: true },
        })
      : Promise.resolve(null),
  ]);
  const groupLabelPlural = settings?.groupLabelPlural ?? "Grupe";
  const tenantName = tenant?.name ?? "Admin";

  // Filtriraj nav items po roli i strip adminOnly iz tipa (shell ne treba da zna)
  const visibleItems: AdminNavItem[] = buildNavItems(groupLabelPlural)
    .filter((i) => !i.adminOnly || isAdmin)
    .map(({ href, label, icon }) => ({ href, label, icon }));

  return (
    <>
      <AdminShell
        navItems={visibleItems}
        tenantName={tenantName}
        userEmail={session?.user?.email ?? ""}
      >
        {children}
      </AdminShell>
      {/* Auto-logout posle 10 min neaktivnosti (samo admin/manager) */}
      {(role === "ADMIN" || role === "MANAGER") && <IdleLogoutWatcher />}
    </>
  );
}
