-- Partial unique index: UID je jedinstven SAMO među aktivnim karticama.
-- Deaktivirana kartica zadržava svoj UID (istorija) ali ne blokira ponovnu
-- registraciju iste fizičke kartice (zamena izgubljene).
--
-- Pokretanje: tsx prisma/apply-card-index.ts
-- (prisma db push ne podržava partial unique indekse deklarativno)

DROP INDEX IF EXISTS "card_active_uid_unique";

CREATE UNIQUE INDEX "card_active_uid_unique"
  ON "Card" ("tenantId", "uid")
  WHERE "isActive" = true;
