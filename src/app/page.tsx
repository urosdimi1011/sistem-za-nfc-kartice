import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 p-8 dark:bg-zinc-950">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Dositej Kartice</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Sistem za upravljanje karticama u baru akademije
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/dashboard"
          className="rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Admin portal
        </Link>
        <Link
          href="/terminal"
          className="rounded-md border border-zinc-300 px-6 py-3 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Bar terminal
        </Link>
      </div>
    </div>
  );
}
