"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface SidebarNavLinkProps {
  href: string;
  label: string;
  icon: React.ReactNode;
}

/**
 * useLinkStatus radi samo unutar deteta <Link>. Render-uje spinner umesto ikone
 * dok navigacija traje (next/link pending state).
 */
function LinkIcon({ icon }: { icon: React.ReactNode }) {
  const { pending } = useLinkStatus();
  if (pending) {
    return <Loader2 className="h-4 w-4 animate-spin" />;
  }
  return <>{icon}</>;
}

export function SidebarNavLink({ href, label, icon }: SidebarNavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
      )}
    >
      <LinkIcon icon={icon} />
      <span className="flex-1">{label}</span>
    </Link>
  );
}
