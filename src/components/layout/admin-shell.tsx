"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, Menu, PanelLeftOpen, User, X } from "lucide-react";

import { LogoutButton } from "@/features/auth/components/logout-button";
import { SidebarNavLink } from "@/components/layout/sidebar-nav-link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface AdminShellProps {
  navItems: AdminNavItem[];
  tenantName: string;
  userEmail: string;
  children: React.ReactNode;
}

const COLLAPSE_STORAGE_KEY = "admin-sidebar-collapsed";

/**
 * Responsive layout shell za admin portal.
 *
 *   • Desktop (md+): sidebar static levo. Može se SAKRITI dugmetom (collapse)
 *     da stranica dobije pun ekran; vraća se floating dugmetom gore levo.
 *     Preferenca se pamti u localStorage.
 *   • Mobile (<md): sidebar je off-canvas, hamburger u top bar-u ga otvara.
 */
export function AdminShell({
  navItems,
  tenantName,
  userEmail,
  children,
}: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Desktop collapse — odvojeno od mobile open state-a
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const pathname = usePathname();

  // Hidratiraj collapse preferencu iz localStorage
  useEffect(() => {
    const saved = localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (saved === "1") setDesktopCollapsed(true);
  }, []);

  const toggleDesktop = () => {
    setDesktopCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  // Zatvori mobile sidebar pri navigaciji
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Blokiraj body scroll dok je mobile sidebar otvoren
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* ─── MOBILE TOP BAR ─── (samo na < md) */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white px-3 dark:border-zinc-800 dark:bg-zinc-900 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Otvori meni"
          className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex flex-1 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
            <Image
              src="/img/logo.png"
              alt={`${tenantName} logo`}
              width={32}
              height={32}
              className="h-full w-full object-contain p-0.5"
            />
          </div>
          <span className="truncate text-sm font-semibold" title={tenantName}>
            {tenantName}
          </span>
        </div>
      </header>

      {/* ─── DESKTOP "EXPAND" FLOATING DUGME ─── (vidljivo samo kad je collapsed na md+) */}
      {desktopCollapsed && (
        <button
          type="button"
          onClick={toggleDesktop}
          aria-label="Prikaži meni"
          title="Prikaži meni"
          className="fixed left-3 top-3 z-30 hidden h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white shadow-md transition-colors hover:bg-zinc-100 md:flex dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      )}

      {/* ─── MOBILE BACKDROP ─── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* ─── SIDEBAR ─── */}
      <aside
        className={cn(
          // Mobile (default): fixed off-canvas
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-zinc-200 bg-white shadow-xl transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-900",
          // Desktop: static, vidljiv, bez shadow-a
          "md:static md:w-64 md:translate-x-0 md:shadow-none",
          // Mobile open/closed
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          // Desktop collapsed — width 0, sadržaj skriven, off-screen
          desktopCollapsed &&
            "md:w-0 md:-translate-x-full md:overflow-hidden md:border-r-0",
        )}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
          <Link
            href="/dashboard"
            className="group flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <div className="flex h-[54px] w-[54px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700">
              <Image
                src="/img/logo.png"
                alt={`${tenantName} logo`}
                width={54}
                height={54}
                className="h-full w-full object-contain p-0.5"
                priority
              />
            </div>
            <div className="min-w-0">
              <p
                className="truncate text-sm font-bold leading-tight"
                title={tenantName}
              >
                {tenantName}
              </p>
              <p className="truncate text-[11px] text-zinc-500">Admin portal</p>
            </div>
          </Link>
          {/* Mobile close */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Zatvori meni"
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-zinc-100 md:hidden dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
          {/* Desktop collapse */}
          <button
            type="button"
            onClick={toggleDesktop}
            aria-label="Sakrij meni"
            title="Sakrij meni"
            className="hidden h-8 w-8 items-center justify-center rounded-md hover:bg-zinc-100 md:flex dark:hover:bg-zinc-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
          {navItems.map((item) => (
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
            <span className="truncate">{userEmail}</span>
          </div>
          <div className="flex items-center gap-2">
            <LogoutButton variant="outline" className="flex-1 justify-start" />
            <ThemeToggle variant="outline" />
          </div>
        </div>
      </aside>

      {/* ─── MAIN ─── pt na mobile za fixed top bar; pl na desktop kad je collapsed
          da floating expand dugme ne prekrije sadržaj */}
      <main
        className={cn(
          "flex-1 p-4 pt-[4.5rem] transition-all duration-200 md:p-8 md:pt-8",
          desktopCollapsed && "md:pl-16",
        )}
      >
        {children}
      </main>
    </div>
  );
}
