/**
 * Benchmark kritičnih query-jeva sa load test podacima.
 * Pokretanje: tsx prisma/bench.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { startOfMonth, startOfDay, subDays } from "date-fns";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

async function time<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t = Date.now();
  const result = await fn();
  const elapsed = Date.now() - t;
  const icon = elapsed < 100 ? "🟢" : elapsed < 300 ? "🟡" : "🔴";
  console.log(`${icon} ${label}: ${elapsed}ms`);
  return result;
}

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "dositej" } });
  if (!tenant) throw new Error("Nema tenanta");
  const tenantId = tenant.id;
  const now = new Date();
  const startToday = startOfDay(now);
  const startMonth = startOfMonth(now);

  console.log("\n📊 BENCHMARK kritičnih query-jeva");
  console.log("───────────────────────────────────────────\n");

  // ─── DASHBOARD ───────────────────────────────────
  console.log("Dashboard:");
  await time("  KPI: todayRevenue agregacija", () =>
    prisma.creditTransaction.aggregate({
      where: { tenantId, type: "ORDER", createdAt: { gte: startToday } },
      _sum: { amount: true },
    }),
  );
  await time("  KPI: monthRevenue agregacija", () =>
    prisma.creditTransaction.aggregate({
      where: { tenantId, type: "ORDER", createdAt: { gte: startMonth } },
      _sum: { amount: true },
    }),
  );
  await time("  KPI: activePeople count", () =>
    prisma.person.count({ where: { tenantId, isActive: true } }),
  );
  await time("  KPI: activeCards count", () =>
    prisma.card.count({ where: { tenantId, isActive: true } }),
  );
  await time("  Top 5 stavki ovog meseca (groupBy)", () =>
    prisma.orderItem.groupBy({
      by: ["menuItemId"],
      where: { order: { tenantId, createdAt: { gte: startMonth } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  );
  await time("  Top 5 zaposlenih u minusu", () =>
    prisma.creditBalance.findMany({
      where: {
        tenantId,
        balance: { lt: 0 },
        person: { isActive: true, personType: "EMPLOYEE" },
      },
      orderBy: { balance: "asc" },
      take: 5,
      include: { person: true },
    }),
  );
  await time("  Daily revenue zadnjih 7 dana", () =>
    prisma.creditTransaction.findMany({
      where: {
        tenantId,
        type: "ORDER",
        createdAt: { gte: startOfDay(subDays(now, 6)) },
      },
      select: { amount: true, createdAt: true },
    }),
  );
  await time("  Recent 8 transakcija", () =>
    prisma.creditTransaction.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { person: true },
    }),
  );

  console.log("\nListe (paginirane, 20 redova):");
  await time("  Osobe page 1 (sa balance + cards)", () =>
    prisma.person.findMany({
      where: { tenantId, isActive: true },
      include: { creditBalance: true, cards: { where: { isActive: true }, take: 1 } },
      orderBy: { lastName: "asc" },
      take: 20,
    }),
  );
  await time("  Osobe — search by lastName ILIKE 'P%'", () =>
    prisma.person.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [{ lastName: { contains: "P", mode: "insensitive" } }],
      },
      take: 20,
    }),
  );
  await time("  Kartice page 1", () =>
    prisma.card.findMany({
      where: { tenantId, isActive: true },
      include: {
        person: true,
        registeredBy: true,
        _count: { select: { orders: true } },
      },
      orderBy: { registeredAt: "desc" },
      take: 20,
    }),
  );
  await time("  Transakcije page 1", () =>
    prisma.creditTransaction.findMany({
      where: { tenantId },
      include: { person: true, performedBy: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  );

  console.log("\nBar terminal:");
  // Uzmi random UID iz baze
  const someCard = await prisma.card.findFirst({
    where: { tenantId, isActive: true },
    select: { uid: true },
  });
  if (someCard) {
    await time("  Card lookup by UID (indexed)", () =>
      prisma.card.findFirst({
        where: { tenantId, uid: someCard.uid },
        include: { person: { include: { creditBalance: true } } },
      }),
    );
  }
  await time("  listAvailableMenu (sve kategorije + stavke)", () =>
    prisma.menuCategory.findMany({
      where: { tenantId, isVisible: true },
      orderBy: { displayOrder: "asc" },
      include: {
        items: { where: { isAvailable: true }, orderBy: { displayOrder: "asc" } },
      },
    }),
  );

  console.log("\nIzveštaji:");
  await time("  getMonthlyReport — Svi (5000 osoba + agregacije)", () =>
    Promise.all([
      prisma.person.findMany({
        where: { tenantId, isActive: true },
        include: { creditBalance: true },
      }),
      prisma.creditTransaction.groupBy({
        by: ["personId", "type"],
        where: { tenantId, createdAt: { gte: startMonth } },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]),
  );

  console.log("\n───────────────────────────────────────────");
  console.log("🟢 < 100ms (odlično)   🟡 100-300ms (OK)   🔴 > 300ms (sporo)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
