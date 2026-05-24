/**
 * Resetuje bazu za demo: briše sve operativne podatke, ostavlja konfiguraciju
 * (tenant, naloge, karta pića, grupe), kreira 3 demo osobe (2 sa karticama, 1 bez).
 *
 * Pokretanje: tsx prisma/reset-for-demo.ts
 *
 * BEZBEDNOST: skript koristi DIRECT_URL iz .env, što je tvoja prava baza.
 * Pre pokretanja proveri da li si na pravoj bazi i da li si svestan da brišeš
 * sve osobe, kartice, transakcije, porudžbine, otpise, mesečna zatvaranja.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

const TENANT_SLUG = "dositej";
const BARTENDER_EMAIL = "konobar@dositej.rs";

async function main() {
  console.log("🧹 Resetovanje baze za demo...\n");

  const tenant = await prisma.tenant.findFirst({
    where: { slug: TENANT_SLUG },
    select: { id: true, name: true },
  });
  if (!tenant) {
    throw new Error(`Tenant '${TENANT_SLUG}' ne postoji. Pokreni seed prvo.`);
  }
  console.log(`✓ Tenant: ${tenant.name}`);

  const tenantId = tenant.id;

  // Bartender — treba nam kao "registeredBy" za demo kartice
  const bartender = await prisma.systemAccount.findUnique({
    where: { email: BARTENDER_EMAIL },
    select: { id: true, personId: true },
  });
  if (!bartender) {
    throw new Error(`Bartender nalog '${BARTENDER_EMAIL}' ne postoji.`);
  }

  // Persons koji su povezani sa SystemAccount-om — NE smemo da ih obrišemo
  // jer bi to oborilo FK na SystemAccount.personId. Ovo uključuje seed-ovanog konobara.
  const protectedPersonIds = await prisma.systemAccount
    .findMany({
      where: { tenantId, personId: { not: null } },
      select: { personId: true },
    })
    .then((rows) => rows.map((r) => r.personId!).filter(Boolean));

  console.log(
    `✓ Zaštićeno ${protectedPersonIds.length} osoba (linkovane sa nalozima)`,
  );

  // ───── BRISANJE U PRAVOM REDOSLEDU (FK constraints) ─────
  console.log("\n🗑️  Brisanje operativnih podataka...");

  // 1. StockMovement (referencira Order, MenuItem)
  const stockMovs = await prisma.stockMovement.deleteMany({
    where: { tenantId },
  });
  console.log(`  ✓ StockMovement: ${stockMovs.count}`);

  // 2. CreditTransaction (referencira Order, Person, SystemAccount)
  const creditTx = await prisma.creditTransaction.deleteMany({
    where: { tenantId },
  });
  console.log(`  ✓ CreditTransaction: ${creditTx.count}`);

  // 3. OrderItem (referencira Order, MenuItem)
  const orderItems = await prisma.orderItem.deleteMany({
    where: { order: { tenantId } },
  });
  console.log(`  ✓ OrderItem: ${orderItems.count}`);

  // 4. Order (referencira Card, Person, SystemAccount)
  const orders = await prisma.order.deleteMany({ where: { tenantId } });
  console.log(`  ✓ Order: ${orders.count}`);

  // 5. MonthlyClose
  const closes = await prisma.monthlyClose.deleteMany({ where: { tenantId } });
  console.log(`  ✓ MonthlyClose: ${closes.count}`);

  await prisma.card.updateMany({
    where: { tenantId, replacedById: { not: null } },
    data: { replacedById: null },
  });
  const cards = await prisma.card.deleteMany({ where: { tenantId } });
  console.log(`  ✓ Card: ${cards.count}`);

  // 7. CreditBalance
  const balances = await prisma.creditBalance.deleteMany({
    where: { tenantId },
  });
  console.log(`  ✓ CreditBalance: ${balances.count}`);

  // 8. Person (osim zaštićenih)
  const people = await prisma.person.deleteMany({
    where: {
      tenantId,
      id: { notIn: protectedPersonIds },
    },
  });
  console.log(`  ✓ Person: ${people.count}`);

  // ───── RESET STOCK ────────────────────────────────────
  // Vrati zalihe na uniformnu početnu vrednost da klijent ima sa čim da radi.
  console.log("\n📦 Resetovanje zaliha (trackStock=true stavke → 24 kom)...");
  const trackedItems = await prisma.menuItem.updateMany({
    where: { tenantId, trackStock: true, archivedAt: null },
    data: { stock: 24, isAvailable: true },
  });
  console.log(`  ✓ Reset stock-a na ${trackedItems.count} praćenih stavki`);

  // ───── DEMO OSOBE ─────────────────────────────────────
  console.log("\n👥 Kreiranje demo osoba...");

  // Marko Marković — učenik sa karticom DEMO001 i kreditom
  const marko = await prisma.person.create({
    data: {
      tenantId,
      firstName: "Marko",
      lastName: "Marković",
      personType: "STUDENT",
      note: "DEMO osoba — slobodno obriši kad uneseš prave učenike",
      creditBalance: { create: { tenantId, balance: 1500 } },
      cards: {
        create: {
          tenantId,
          uid: "DEMO001",
          isActive: true,
          registeredById: bartender.id,
        },
      },
    },
  });
  console.log(
    `  ✓ ${marko.firstName} ${marko.lastName} (kartica DEMO001, 1500 kredita)`,
  );

  // Jelena Jelić — zaposlena sa karticom DEMO002 i 0 kredita
  const jelena = await prisma.person.create({
    data: {
      tenantId,
      firstName: "Jelena",
      lastName: "Jelić",
      personType: "EMPLOYEE",
      note: "DEMO osoba — slobodno obriši",
      creditBalance: { create: { tenantId, balance: 0 } },
      cards: {
        create: {
          tenantId,
          uid: "DEMO002",
          isActive: true,
          registeredById: bartender.id,
        },
      },
    },
  });
  console.log(
    `  ✓ ${jelena.firstName} ${jelena.lastName} (kartica DEMO002, 0 kredita)`,
  );

  // Petar Petrović — učenik BEZ kartice (admin može da je doda kao test)
  const petar = await prisma.person.create({
    data: {
      tenantId,
      firstName: "Petar",
      lastName: "Petrović",
      personType: "STUDENT",
      note: "DEMO osoba bez kartice — probaj da mu registruješ karticu",
      creditBalance: { create: { tenantId, balance: 0 } },
    },
  });
  console.log(
    `  ✓ ${petar.firstName} ${petar.lastName} (BEZ kartice, 0 kredita)`,
  );

  console.log("\n✅ Reset gotov!\n");
  console.log("Klijent može da se uloguje i odmah ima sa čim da radi:");
  console.log("  • Karta pića sa svim kategorijama");
  console.log("  • 6 škola za dodelu");
  console.log("  • Praćene stavke imaju 24 kom na stanju");
  console.log("  • 3 demo osobe (2 sa karticama, 1 bez)");
  console.log(
    "\nBar terminal može da naplati pićem skenirajući DEMO001 ili DEMO002.\n",
  );
}

main()
  .catch((e) => {
    console.error("❌ Greška:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
