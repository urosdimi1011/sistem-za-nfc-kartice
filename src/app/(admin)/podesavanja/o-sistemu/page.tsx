import { format } from "date-fns";
import { sr } from "date-fns/locale";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OSistemuPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tenantId = session.user.tenantId;

  const [tenant, peopleCount, cardsCount, transactionsCount, ordersCount] =
    await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.person.count({ where: { tenantId } }),
      prisma.card.count({ where: { tenantId } }),
      prisma.creditTransaction.count({ where: { tenantId } }),
      prisma.order.count({ where: { tenantId } }),
    ]);

  const stats = [
    { label: "Osobe", value: peopleCount },
    { label: "Kartice", value: cardsCount },
    { label: "Transakcije", value: transactionsCount },
    { label: "Porudžbine", value: ordersCount },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-base font-semibold">O sistemu</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Verzija i informacije o vašoj organizaciji.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Aplikacija
            </div>
            <p className="mt-1 font-medium">Dositej Kartice v1.0</p>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Organizacija
            </div>
            <p className="mt-1 font-medium">{tenant?.name ?? "—"}</p>
            <p className="text-xs text-zinc-500">
              <span className="font-mono">{tenant?.slug}</span>
            </p>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Aktivirano
            </div>
            <p className="mt-1">
              {tenant?.createdAt
                ? format(tenant.createdAt, "dd.MM.yyyy.", { locale: sr })
                : "—"}
            </p>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Status
            </div>
            <p className="mt-1">{tenant?.isActive ? "Aktivna" : "Neaktivna"}</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-base font-semibold">Statistike</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Sažeti pregled obima podataka u vašoj organizaciji.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                {s.label}
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
