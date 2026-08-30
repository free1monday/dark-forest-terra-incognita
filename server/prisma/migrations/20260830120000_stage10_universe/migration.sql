-- Stage 10: species, politics, population, solar systems, planets

-- AlterTable
ALTER TABLE "Civilization" ADD COLUMN IF NOT EXISTS "species" TEXT NOT NULL DEFAULT 'HUMAN';
ALTER TABLE "Civilization" ADD COLUMN IF NOT EXISTS "politicalRegime" TEXT NOT NULL DEFAULT 'DEMOCRACY';
ALTER TABLE "Civilization" ADD COLUMN IF NOT EXISTS "governmentForm" TEXT NOT NULL DEFAULT 'REPUBLIC';
ALTER TABLE "Civilization" ADD COLUMN IF NOT EXISTS "population" BIGINT NOT NULL DEFAULT 1000000;
ALTER TABLE "Civilization" ADD COLUMN IF NOT EXISTS "colonies" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Civilization" ADD COLUMN IF NOT EXISTS "homeSolarSystemId" TEXT;
ALTER TABLE "Civilization" ADD COLUMN IF NOT EXISTS "homePlanetId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "SolarSystem" (
    "id" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "starClass" TEXT NOT NULL,
    "starTemperature" INTEGER NOT NULL DEFAULT 5500,
    "starLuminosity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "starMass" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "starAgeGyr" DOUBLE PRECISION NOT NULL DEFAULT 4.5,
    "starColor" TEXT NOT NULL DEFAULT '#fff4d6',
    "ownerCivilizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SolarSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Planet" (
    "id" TEXT NOT NULL,
    "solarSystemId" TEXT NOT NULL,
    "planetKey" TEXT NOT NULL,
    "indexInSystem" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "atmosphere" TEXT NOT NULL,
    "gravity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "moons" INTEGER NOT NULL DEFAULT 0,
    "cosmicDust" TEXT NOT NULL DEFAULT 'MEDIUM',
    "radiation" TEXT NOT NULL DEFAULT 'MODERATE',
    "temperatureDay" INTEGER NOT NULL DEFAULT 20,
    "temperatureNight" INTEGER NOT NULL DEFAULT 0,
    "resourcesJson" TEXT NOT NULL DEFAULT '{}',
    "orbitRadius" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "hue" INTEGER NOT NULL DEFAULT 200,
    "isHomeworld" BOOLEAN NOT NULL DEFAULT false,
    "colonized" BOOLEAN NOT NULL DEFAULT false,
    "ownerCivilizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Planet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Planet_solarSystemId_planetKey_key" ON "Planet"("solarSystemId", "planetKey");
CREATE INDEX IF NOT EXISTS "SolarSystem_ownerCivilizationId_idx" ON "SolarSystem"("ownerCivilizationId");
CREATE INDEX IF NOT EXISTS "SolarSystem_seed_idx" ON "SolarSystem"("seed");
CREATE INDEX IF NOT EXISTS "Planet_solarSystemId_idx" ON "Planet"("solarSystemId");
CREATE INDEX IF NOT EXISTS "Planet_ownerCivilizationId_idx" ON "Planet"("ownerCivilizationId");

DO $$ BEGIN
 ALTER TABLE "SolarSystem" ADD CONSTRAINT "SolarSystem_ownerCivilizationId_fkey" FOREIGN KEY ("ownerCivilizationId") REFERENCES "Civilization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "Planet" ADD CONSTRAINT "Planet_solarSystemId_fkey" FOREIGN KEY ("solarSystemId") REFERENCES "SolarSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "Planet" ADD CONSTRAINT "Planet_ownerCivilizationId_fkey" FOREIGN KEY ("ownerCivilizationId") REFERENCES "Civilization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
 ALTER TABLE "Civilization" ADD CONSTRAINT "Civilization_homeSolarSystemId_fkey" FOREIGN KEY ("homeSolarSystemId") REFERENCES "SolarSystem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
