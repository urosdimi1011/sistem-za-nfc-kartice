import { auth } from "@/auth";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default async function BarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex h-screen flex-col bg-zinc-100 dark:bg-zinc-950">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <h1 className="text-lg font-bold">Bar terminal</h1>
          <p className="text-[11px] text-zinc-500">Dositej Kartice</p>
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
