import Image from "next/image";
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { LoginForm } from "@/features/auth/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Single-tenant deployment: prikaži ime i logo tenanta na login ekranu.
  // U multi-tenant scenariju (kasnije) bi se izvlačilo iz subdomena/env-a.
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { name: true },
  });
  const tenantName = tenant?.name ?? "Bar sistem";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-50 p-4 dark:bg-zinc-950">
      {/* Suptilni gradijent u pozadini — daje dubinu bez zatrpavanja */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        {/* Brand header — logo + tenant name */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700">
            <Image
              src="/img/logo.png"
              alt={`${tenantName} logo`}
              width={160}
              height={160}
              className="h-full w-full object-contain p-3"
              priority
            />
          </div>
          <h1
            className="mt-4 text-2xl font-extrabold tracking-tight"
            title={tenantName}
          >
            {tenantName}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Sistem za upravljanje karticama</p>
        </div>

        {/* Login kartica */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Prijava na nalog</span>
          </div>

          {/* Suspense je obavezan jer LoginForm koristi useSearchParams.
              Bez ovoga Next bail-uje iz static pre-render-a → build error. */}
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>

          {/* Mini info za korisnike — admin i konobar koriste isti login */}
          <div className="mt-5 border-t border-zinc-100 pt-4 text-center text-xs text-zinc-500 dark:border-zinc-800">
            Administratori, menadžeri i konobari koriste isti ekran za prijavu.
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[11px] text-zinc-400">
          © {new Date().getFullYear()} {tenantName}
        </p>
      </div>
    </div>
  );
}
