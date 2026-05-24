import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  Wine,
  FileBarChart,
  Settings,
  User,
  UserCog,
  School,
  Package,
} from "lucide-react";
import { auth } from "@/auth";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { IdleLogoutWatcher } from "@/features/auth/components/idle-logout-watcher";
import { SidebarNavLink } from "@/components/layout/sidebar-nav-link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SystemRole } from "@/lib/enums";
import { getTenantSettings } from "@/features/settings/queries";

const iconCls = "h-4 w-4";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
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
  const tenantId = session?.user?.tenantId;
  const settings = tenantId ? await getTenantSettings(tenantId) : null;
  const groupLabelPlural = settings?.groupLabelPlural ?? "Grupe";

  const visibleItems = buildNavItems(groupLabelPlural).filter(
    (i) => !i.adminOnly || isAdmin,
  );

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <aside className="flex w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="p-6">
          <Link href="/dashboard" className="text-lg font-bold">
            Dositej Kartice
          </Link>
          <p className="mt-1 text-xs text-zinc-500">Admin portal</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {visibleItems.map((item) => (
            <SidebarNavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
            />
          ))}
        </nav>
        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          <div className="mb-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400">
            <User className="h-4 w-4" />
            <span className="truncate">{session?.user?.email ?? ""}</span>
          </div>
          <div className="flex items-center gap-2">
            <LogoutButton variant="outline" className="flex-1 justify-start" />
            <ThemeToggle variant="outline" />
          </div>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
      {/* Auto-logout posle 10 min neaktivnosti (samo admin portal) */}
      {(session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER") && (
        <IdleLogoutWatcher />
      )}
    </div>
  );
}
