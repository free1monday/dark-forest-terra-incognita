-- Stage 11 weapons
CREATE TABLE IF NOT EXISTS "Weapon" (
    "id" TEXT NOT NULL,
    "civilizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BUILDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readyAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "targetContactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Weapon_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Weapon_civilizationId_status_idx" ON "Weapon"("civilizationId", "status");
CREATE INDEX IF NOT EXISTS "Weapon_civilizationId_type_idx" ON "Weapon"("civilizationId", "type");

DO $$ BEGIN
 ALTER TABLE "Weapon" ADD CONSTRAINT "Weapon_civilizationId_fkey" FOREIGN KEY ("civilizationId") REFERENCES "Civilization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
