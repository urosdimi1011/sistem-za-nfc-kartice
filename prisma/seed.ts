import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

const TENANT_SLUG = "dositej";
const SEED_ADMIN_EMAIL = "admin@dositej.rs";
const SEED_ADMIN_PASSWORD = "admin123";
const SEED_BARTENDER_EMAIL = "konobar@dositej.rs";
const SEED_BARTENDER_PASSWORD = "konobar123";

// Default tenant settings — koriste ih svi novi tenanti, mogu se menjati u UI-u
const DEFAULT_TENANT_SETTINGS = {
  allowStudentNegativeBalance: false,
  maxNegativeBalanceEmployee: null, // null = neograničeno
  defaultStudentInitialBalance: 0,
  defaultEmployeeInitialBalance: 0,
  requireJmbg: false,
  requireDeductNote: true,
  monthlyResetDay: 1,
  currency: "RSD",
  groupLabel: "Grupa",
  groupLabelPlural: "Grupe",
  requireGroup: false,
};

// Dositej-specifični override: koristi termin "Škola"
const DOSITEJ_TENANT_SETTINGS = {
  ...DEFAULT_TENANT_SETTINGS,
  groupLabel: "Škola",
  groupLabelPlural: "Škole",
};

// 6 škola u sklopu Akademije Dositej
const DOSITEJ_SCHOOLS = [
  { name: "Osnovna škola Dositej", shortName: "OŠ", displayOrder: 1 },
  { name: "Gimnazija Dositej", shortName: "Gimnazija", displayOrder: 2 },
  { name: "Ekonomska škola Dositej", shortName: "Ekonomska", displayOrder: 3 },
  { name: "Medicinska škola Dositej", shortName: "Medicinska", displayOrder: 4 },
  { name: "IT škola Dositej", shortName: "IT", displayOrder: 5 },
  { name: "Vrtić Dositej", shortName: "Vrtić", displayOrder: 6 },
];

async function main() {
  console.log("🌱 Pokrećem seed...");

  // ───── TENANT ────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: TENANT_SLUG },
    update: {},
    create: {
      slug: TENANT_SLUG,
      name: "Privatna akademija Dositej",
      settings: DOSITEJ_TENANT_SETTINGS,
    },
  });
  console.log(`✓ Tenant: ${tenant.name} (${tenant.slug})`);

  const tenantId = tenant.id;

  // Idempotentno dopuni group* settings za postojeće tenante (ne gazi UI promene)
  const currentSettings =
    (tenant.settings as Record<string, unknown> | null) ?? {};
  const mergedSettings = {
    ...DOSITEJ_TENANT_SETTINGS,
    ...currentSettings,
    // forsiraj nove ključeve ako fale
    groupLabel:
      (currentSettings.groupLabel as string | undefined) ??
      DOSITEJ_TENANT_SETTINGS.groupLabel,
    groupLabelPlural:
      (currentSettings.groupLabelPlural as string | undefined) ??
      DOSITEJ_TENANT_SETTINGS.groupLabelPlural,
    requireGroup:
      (currentSettings.requireGroup as boolean | undefined) ??
      DOSITEJ_TENANT_SETTINGS.requireGroup,
  };
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { settings: mergedSettings },
  });

  // ───── ŠKOLE (Group) ─────────────────────────────────
  for (const s of DOSITEJ_SCHOOLS) {
    const seedId = `seed-group-${s.displayOrder}`;
    await prisma.group.upsert({
      where: { id: seedId },
      update: {},
      create: {
        id: seedId,
        tenantId,
        name: s.name,
        shortName: s.shortName,
        displayOrder: s.displayOrder,
      },
    });
  }
  console.log(`✓ ${DOSITEJ_SCHOOLS.length} škola`);

  // ───── ADMIN ─────────────────────────────────────────
  const adminHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 10);
  const admin = await prisma.systemAccount.upsert({
    where: { email: SEED_ADMIN_EMAIL },
    update: {},
    create: {
      tenantId,
      email: SEED_ADMIN_EMAIL,
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });
  console.log(`✓ Admin: ${admin.email}`);

  // ───── KONOBAR (Person + SystemAccount) ──────────────
  const bartenderPerson = await prisma.person.upsert({
    where: { id: "seed-bartender-person" },
    update: {},
    create: {
      id: "seed-bartender-person",
      tenantId,
      firstName: "Marko",
      lastName: "Marković",
      personType: "EMPLOYEE",
      creditBalance: { create: { tenantId, balance: 0 } },
    },
  });

  const bartenderHash = await bcrypt.hash(SEED_BARTENDER_PASSWORD, 10);
  const bartender = await prisma.systemAccount.upsert({
    where: { email: SEED_BARTENDER_EMAIL },
    update: {},
    create: {
      tenantId,
      email: SEED_BARTENDER_EMAIL,
      passwordHash: bartenderHash,
      role: "BARTENDER",
      personId: bartenderPerson.id,
    },
  });
  console.log(`✓ Konobar: ${bartender.email}`);

  // ───── TEST OSOBE ────────────────────────────────────
  const testPeople = [
    { firstName: "Petar", lastName: "Petrović", personType: "STUDENT" as const, balance: 2000 },
    { firstName: "Ana", lastName: "Anić", personType: "STUDENT" as const, balance: 500 },
    { firstName: "Luka", lastName: "Lukić", personType: "STUDENT" as const, balance: 0 },
    { firstName: "Jelena", lastName: "Jelić", personType: "EMPLOYEE" as const, balance: 0 },
    { firstName: "Nikola", lastName: "Nikolić", personType: "EMPLOYEE" as const, balance: -1500 },
  ];

  for (const p of testPeople) {
    const seedId = `seed-${p.firstName.toLowerCase()}`;
    await prisma.person.upsert({
      where: { id: seedId },
      update: {},
      create: {
        id: seedId,
        tenantId,
        firstName: p.firstName,
        lastName: p.lastName,
        personType: p.personType,
        creditBalance: { create: { tenantId, balance: p.balance } },
      },
    });
  }
  console.log(`✓ ${testPeople.length} test osoba`);

  // ───── KARTA PIĆA ────────────────────────────────────
  const categories = [
    {
      name: "Topli napici",
      icon: "Coffee",
      color: "orange",
      displayOrder: 1,
      items: [
        { name: "Espresso", creditPrice: 120, icon: "Coffee" },
        { name: "Macchiato", creditPrice: 140, icon: "Coffee" },
        { name: "Cappuccino", creditPrice: 180, icon: "Coffee" },
        { name: "Čaj", creditPrice: 100, icon: null },
        { name: "Topla čokolada", creditPrice: 200, icon: null },
      ],
    },
    {
      name: "Hladni napici",
      icon: "CupSoda",
      color: "blue",
      displayOrder: 2,
      items: [
        { name: "Coca Cola", creditPrice: 180, icon: "CupSoda" },
        { name: "Fanta", creditPrice: 180, icon: "CupSoda" },
        { name: "Voda 0.5L", creditPrice: 100, icon: "GlassWater" },
        { name: "Sok od jabuke", creditPrice: 200, icon: "CupSoda" },
        { name: "Limunada", creditPrice: 220, icon: "CupSoda" },
      ],
    },
    {
      name: "Hrana",
      icon: "Sandwich",
      color: "emerald",
      displayOrder: 3,
      items: [
        { name: "Pljeskavica", creditPrice: 450, icon: null },
        { name: "Sendvič šunka-sir", creditPrice: 300, icon: "Sandwich" },
        { name: "Tost", creditPrice: 250, icon: "Sandwich" },
        { name: "Krompir", creditPrice: 200, icon: null },
      ],
    },
    {
      name: "Slatkiši",
      icon: "Cookie",
      color: "pink",
      displayOrder: 4,
      items: [
        { name: "Plazma", creditPrice: 80, icon: "Cookie" },
        { name: "Snickers", creditPrice: 150, icon: "Cookie" },
        { name: "Kroasan", creditPrice: 180, icon: "Croissant" },
      ],
    },
  ];

  for (const cat of categories) {
    const seedCatId = `seed-cat-${cat.displayOrder}`;
    await prisma.menuCategory.upsert({
      where: { id: seedCatId },
      update: {},
      create: {
        id: seedCatId,
        tenantId,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        displayOrder: cat.displayOrder,
        items: {
          create: cat.items.map((item, i) => ({
            id: `seed-item-${cat.displayOrder}-${i}`,
            tenantId,
            name: item.name,
            creditPrice: item.creditPrice,
            icon: item.icon,
            displayOrder: i,
          })),
        },
      },
    });
  }
  console.log(
    `✓ ${categories.length} kategorija, ${categories.reduce((s, c) => s + c.items.length, 0)} stavki`,
  );

  console.log("\n✅ Seed gotov!\n");
  console.log("Login kredencijali:");
  console.log(`  Admin:   ${SEED_ADMIN_EMAIL} / ${SEED_ADMIN_PASSWORD}`);
  console.log(`  Konobar: ${SEED_BARTENDER_EMAIL} / ${SEED_BARTENDER_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
