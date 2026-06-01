/**
 * Primenjuje partial unique index za aktivne kartice (UID jedinstven samo
 * među isActive=true). Prisma db push ne podržava partial indekse deklarativno
 * pa ih dodajemo raw SQL-om. Idempotentno (DROP IF EXISTS + CREATE).
 *
 * Pokretanje: tsx prisma/apply-card-index.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Primenjujem partial unique index za aktivne kartice...");

  await prisma.$executeRawUnsafe(
    `DROP INDEX IF EXISTS "card_active_uid_unique";`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX "card_active_uid_unique" ON "Card" ("tenantId", "uid") WHERE "isActive" = true;`,
  );

  console.log("✓ Index 'card_active_uid_unique' kreiran.");
}

main()
  .catch((e) => {
    console.error("❌ Greška:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
