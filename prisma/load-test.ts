/**
 * Load test seed — generiše realističnu količinu podataka za testiranje performansi.
 *
 * Cilj:
 *   5,000 osoba (4000 učenika + 1000 zaposlenih)
 *   3,000 kartica (dodeljenih prvim 3000 osoba)
 *   ~10,000 transakcija raspoređenih kroz zadnjih 90 dana:
 *     - ~30% TOPUP (uplate)
 *     - ~65% ORDER (porudžbine u baru, sa pravim Order+OrderItem zapisima)
 *     - ~5%  MANUAL_DEDUCT
 *
 * BRIŠE postojeće netest podatke (osim seed admin/konobar i seed osoba).
 * Pokretanje:
 *   npm run db:load-test
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

// ───── KONFIG ───────────────────────────────────────
const TENANT_SLUG = "dositej";
const TARGET_PEOPLE = 5000;
const TARGET_STUDENTS = 4000;
const TARGET_CARDS = 3000;
const TARGET_TRANSACTIONS = 10000;
const TRANSACTION_DAYS_BACK = 90;
const BATCH_SIZE = 500; // za bulk inserts

// ───── SRPSKA IMENA/PREZIMENA (za realizam) ─────────
const FIRST_NAMES = [
  "Marko", "Ana", "Petar", "Jelena", "Nikola", "Marija", "Luka", "Sara",
  "Stefan", "Milica", "Aleksandar", "Jovana", "Filip", "Tijana", "Đorđe", "Mina",
  "Vuk", "Anastasija", "Lazar", "Teodora", "Dimitrije", "Sofija", "Andrej", "Iva",
  "Ognjen", "Lana", "Mihailo", "Dunja", "Pavle", "Lena", "Vasilije", "Maša",
  "Bogdan", "Katarina", "Mateja", "Magdalena", "Ilija", "Hana", "Nemanja", "Ema",
  "Strahinja", "Petra", "Uroš", "Sofia", "Veljko", "Nina", "Damjan", "Mia",
  "Aleksa", "Dragana", "Boris", "Ivana", "Branko", "Snežana", "Goran", "Vesna",
];

const LAST_NAMES = [
  "Petrović", "Marković", "Jovanović", "Nikolić", "Đorđević", "Stojanović",
  "Pavlović", "Stanković", "Ilić", "Lukić", "Janković", "Popović", "Mitrović",
  "Tomić", "Vasić", "Milić", "Stevanović", "Ristić", "Maksimović", "Dimitrijević",
  "Vučić", "Cvetković", "Simić", "Aleksić", "Đurić", "Milošević", "Radojević",
  "Milutinović", "Pavković", "Vukoslavović", "Mihajlović", "Krstić", "Bogdanović",
  "Stamenković", "Antić", "Vasiljević", "Rajković", "Stojković", "Spasić", "Knežević",
];

const DEDUCT_REASONS = [
  "Ispravka greške konobara",
  "Pogrešno upisana porudžbina",
  "Vraćanje proizvoda",
  "Korekcija stanja",
  "Naplaćeno gotovinom",
];

const TOPUP_NOTES = [
  "Roditelj uplatio",
  "Mesečna uplata",
  "Roditelj uplatio za mart",
  "Bankovni prenos",
  "Uplata u kešu",
  "",
];

// ───── HELPER-i ─────────────────────────────────────
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rangeInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysBack: number): Date {
  const now = Date.now();
  const offset = Math.floor(Math.random() * daysBack * 24 * 60 * 60 * 1000);
  return new Date(now - offset);
}

function randomJmbg(): string | null {
  // 30% šanse da ima JMBG
  if (Math.random() > 0.3) return null;
  let s = "";
  for (let i = 0; i < 13; i++) s += rangeInt(0, 9);
  return s;
}

function randomPhone(): string | null {
  if (Math.random() > 0.5) return null;
  return `+38163${rangeInt(1000000, 9999999)}`;
}

function randomEmail(first: string, last: string): string | null {
  if (Math.random() > 0.6) return null;
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/š/g, "s")
      .replace(/đ/g, "dj")
      .replace(/č/g, "c")
      .replace(/ć/g, "c")
      .replace(/ž/g, "z");
  return `${norm(first)}.${norm(last)}${rangeInt(1, 999)}@example.com`;
}

function randomUid(): string {
  // 14-cifren hex, izgleda kao realan NFC UID
  let s = "";
  for (let i = 0; i < 14; i++) {
    s += "0123456789ABCDEF"[Math.floor(Math.random() * 16)];
  }
  return s;
}

// ───── GLAVNI TOK ───────────────────────────────────
async function main() {
  const tStart = Date.now();
  console.log("🚀 Load test seed pokrenut");
  console.log(
    `   Cilj: ${TARGET_PEOPLE} osoba, ${TARGET_CARDS} kartica, ${TARGET_TRANSACTIONS} transakcija\n`,
  );

  // ─── 1. Dohvati tenant + admin/bartender + menu items ───
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
  if (!tenant) throw new Error("Nema 'dositej' tenanta. Pokreni db:seed prvo.");

  const admin = await prisma.systemAccount.findFirst({
    where: { tenantId: tenant.id, role: "ADMIN" },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) throw new Error("Nema admin naloga.");

  const bartender = await prisma.systemAccount.findFirst({
    where: { tenantId: tenant.id, role: "BARTENDER" },
    orderBy: { createdAt: "asc" },
  });
  if (!bartender) throw new Error("Nema bartender naloga.");

  const menuItems = await prisma.menuItem.findMany({
    where: { tenantId: tenant.id, isAvailable: true },
    select: { id: true, creditPrice: true, name: true },
  });
  if (menuItems.length === 0) throw new Error("Nema menu stavki.");
  console.log(`✓ Tenant: ${tenant.name}, ${menuItems.length} stavki na meniju\n`);

  // ─── 2. WIPE ────────────────────────────────────────
  console.log("🧹 Brišem postojeće load test podatke...");
  // Brišemo redom: OrderItem → Order → CreditTransaction → Card → CreditBalance → Person
  // (osim seed-ovanih sa id prefiksom 'seed-')
  await prisma.$transaction([
    prisma.orderItem.deleteMany({}),
    prisma.order.deleteMany({}),
    prisma.creditTransaction.deleteMany({}),
    prisma.card.deleteMany({}),
    prisma.monthlyClose.deleteMany({}),
  ]);

  // Person & CreditBalance: brišemo one koji nisu seed
  await prisma.creditBalance.deleteMany({
    where: { person: { id: { not: { startsWith: "seed-" } } } },
  });
  await prisma.person.deleteMany({
    where: { id: { not: { startsWith: "seed-" } }, account: null },
  });
  console.log("✓ Wipe gotov\n");

  // ─── 3. GENERIŠI OSOBE ──────────────────────────────
  console.log(`👥 Kreiranje ${TARGET_PEOPLE} osoba...`);
  const t1 = Date.now();
  const peopleData: {
    id: string;
    tenantId: string;
    firstName: string;
    lastName: string;
    personType: "STUDENT" | "EMPLOYEE";
    jmbg: string | null;
    phone: string | null;
    email: string | null;
    createdAt: Date;
  }[] = [];

  for (let i = 0; i < TARGET_PEOPLE; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const personType = i < TARGET_STUDENTS ? "STUDENT" : "EMPLOYEE";
    peopleData.push({
      id: `lt-person-${i.toString().padStart(5, "0")}`,
      tenantId: tenant.id,
      firstName,
      lastName,
      personType,
      jmbg: randomJmbg(),
      phone: randomPhone(),
      email: randomEmail(firstName, lastName),
      // Datum kreiranja: raspoređeno kroz zadnjih 365 dana
      createdAt: randomDate(365),
    });
  }

  // Bulk insert u batch-evima
  for (let i = 0; i < peopleData.length; i += BATCH_SIZE) {
    const batch = peopleData.slice(i, i + BATCH_SIZE);
    await prisma.person.createMany({ data: batch });
  }
  console.log(`✓ ${peopleData.length} osoba kreirano za ${Date.now() - t1}ms\n`);

  // ─── 4. CREDIT BALANCES ─────────────────────────────
  console.log(`💰 Kreiranje CreditBalance zapisa...`);
  const t2 = Date.now();
  const balancesData = peopleData.map((p) => ({
    id: `lt-bal-${p.id.replace("lt-person-", "")}`,
    tenantId: tenant.id,
    personId: p.id,
    balance:
      p.personType === "STUDENT"
        ? rangeInt(0, 5000) // učenici: pozitivno stanje
        : rangeInt(-3000, 2000), // zaposleni: može u minus
  }));
  for (let i = 0; i < balancesData.length; i += BATCH_SIZE) {
    await prisma.creditBalance.createMany({
      data: balancesData.slice(i, i + BATCH_SIZE),
    });
  }
  console.log(`✓ ${balancesData.length} balansa za ${Date.now() - t2}ms\n`);

  // ─── 5. KARTICE ─────────────────────────────────────
  console.log(`💳 Kreiranje ${TARGET_CARDS} kartica...`);
  const t3 = Date.now();
  const cardsData: {
    id: string;
    tenantId: string;
    uid: string;
    personId: string;
    isActive: boolean;
    registeredAt: Date;
    registeredById: string;
  }[] = [];

  const uidSet = new Set<string>();
  for (let i = 0; i < TARGET_CARDS; i++) {
    let uid = randomUid();
    while (uidSet.has(uid)) uid = randomUid();
    uidSet.add(uid);

    cardsData.push({
      id: `lt-card-${i.toString().padStart(5, "0")}`,
      tenantId: tenant.id,
      uid,
      personId: peopleData[i].id,
      isActive: Math.random() > 0.05, // 95% aktivnih
      registeredAt: randomDate(365),
      registeredById: admin.id,
    });
  }
  for (let i = 0; i < cardsData.length; i += BATCH_SIZE) {
    await prisma.card.createMany({ data: cardsData.slice(i, i + BATCH_SIZE) });
  }
  console.log(`✓ ${cardsData.length} kartica za ${Date.now() - t3}ms\n`);

  // ─── 6. TRANSAKCIJE + ORDER-i ───────────────────────
  console.log(`📊 Kreiranje ~${TARGET_TRANSACTIONS} transakcija...`);
  const t4 = Date.now();

  type TxType = "TOPUP" | "ORDER" | "MANUAL_DEDUCT";
  const orders: {
    id: string;
    tenantId: string;
    cardId: string;
    customerId: string;
    bartenderId: string;
    totalCredits: number;
    createdAt: Date;
  }[] = [];
  const orderItems: {
    id: string;
    orderId: string;
    menuItemId: string;
    quantity: number;
    creditPriceAtTime: number;
  }[] = [];
  const transactions: {
    id: string;
    tenantId: string;
    personId: string;
    amount: number;
    balanceAfter: number;
    type: TxType;
    note: string | null;
    performedById: string;
    orderId: string | null;
    createdAt: Date;
  }[] = [];

  let orderCounter = 0;
  let itemCounter = 0;

  for (let i = 0; i < TARGET_TRANSACTIONS; i++) {
    const r = Math.random();
    const type: TxType = r < 0.3 ? "TOPUP" : r < 0.95 ? "ORDER" : "MANUAL_DEDUCT";

    const personIdx = rangeInt(0, peopleData.length - 1);
    const person = peopleData[personIdx];
    const txId = `lt-tx-${i.toString().padStart(6, "0")}`;
    const createdAt = randomDate(TRANSACTION_DAYS_BACK);

    if (type === "ORDER") {
      // Kartica ove osobe (ako ima)
      const card = cardsData[personIdx];
      if (!card) continue;

      // 1-3 stavke u porudžbini
      const itemCount = rangeInt(1, 3);
      let total = 0;
      const orderId = `lt-order-${orderCounter.toString().padStart(6, "0")}`;
      orderCounter++;

      const selectedItems = new Map<string, number>();
      for (let j = 0; j < itemCount; j++) {
        const m = pick(menuItems);
        const qty = rangeInt(1, 2);
        selectedItems.set(m.id, (selectedItems.get(m.id) ?? 0) + qty);
      }

      const noteParts: string[] = [];
      for (const [menuItemId, qty] of selectedItems) {
        const m = menuItems.find((mi) => mi.id === menuItemId)!;
        total += m.creditPrice * qty;
        orderItems.push({
          id: `lt-oi-${itemCounter.toString().padStart(7, "0")}`,
          orderId,
          menuItemId,
          quantity: qty,
          creditPriceAtTime: m.creditPrice,
        });
        itemCounter++;
        noteParts.push(`${m.name} × ${qty}`);
      }

      orders.push({
        id: orderId,
        tenantId: tenant.id,
        cardId: card.id,
        customerId: person.id,
        bartenderId: bartender.id,
        totalCredits: total,
        createdAt,
      });

      transactions.push({
        id: txId,
        tenantId: tenant.id,
        personId: person.id,
        amount: -total,
        balanceAfter: rangeInt(-3000, 5000), // sintetičko stanje
        type: "ORDER",
        note: noteParts.join(", "),
        performedById: bartender.id,
        orderId,
        createdAt,
      });
    } else if (type === "TOPUP") {
      const amount = pick([500, 1000, 2000, 3000, 5000]);
      transactions.push({
        id: txId,
        tenantId: tenant.id,
        personId: person.id,
        amount,
        balanceAfter: rangeInt(0, 8000),
        type: "TOPUP",
        note: pick(TOPUP_NOTES) || null,
        performedById: admin.id,
        orderId: null,
        createdAt,
      });
    } else {
      // MANUAL_DEDUCT
      const amount = rangeInt(50, 500);
      transactions.push({
        id: txId,
        tenantId: tenant.id,
        personId: person.id,
        amount: -amount,
        balanceAfter: rangeInt(-3000, 5000),
        type: "MANUAL_DEDUCT",
        note: pick(DEDUCT_REASONS),
        performedById: admin.id,
        orderId: null,
        createdAt,
      });
    }
  }

  console.log(
    `   Pripremljeno: ${orders.length} Order, ${orderItems.length} OrderItem, ${transactions.length} CreditTransaction`,
  );

  // Bulk inserts u batch-evima
  for (let i = 0; i < orders.length; i += BATCH_SIZE) {
    await prisma.order.createMany({ data: orders.slice(i, i + BATCH_SIZE) });
  }
  console.log(`   ✓ Order zapisi gotovi`);

  for (let i = 0; i < orderItems.length; i += BATCH_SIZE) {
    await prisma.orderItem.createMany({
      data: orderItems.slice(i, i + BATCH_SIZE),
    });
  }
  console.log(`   ✓ OrderItem zapisi gotovi`);

  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    await prisma.creditTransaction.createMany({
      data: transactions.slice(i, i + BATCH_SIZE),
    });
  }
  console.log(`   ✓ CreditTransaction zapisi gotovi`);

  console.log(`✓ Sve transakcije za ${Date.now() - t4}ms\n`);

  // ─── FINALNA STATISTIKA ─────────────────────────────
  const totalTime = Date.now() - tStart;
  console.log(`\n✅ Load test seed gotov za ${(totalTime / 1000).toFixed(1)}s`);
  console.log(`\nFinalno stanje u bazi (tenant ${TENANT_SLUG}):`);
  const [pc, cbc, cc, txc, oc, oic] = await Promise.all([
    prisma.person.count({ where: { tenantId: tenant.id } }),
    prisma.creditBalance.count({ where: { tenantId: tenant.id } }),
    prisma.card.count({ where: { tenantId: tenant.id } }),
    prisma.creditTransaction.count({ where: { tenantId: tenant.id } }),
    prisma.order.count({ where: { tenantId: tenant.id } }),
    prisma.orderItem.count(),
  ]);
  console.log(`   Osobe:           ${pc}`);
  console.log(`   CreditBalances:  ${cbc}`);
  console.log(`   Kartice:         ${cc}`);
  console.log(`   Transakcije:     ${txc}`);
  console.log(`   Porudžbine:      ${oc}`);
  console.log(`   OrderItems:      ${oic}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
