-- CreateTable
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "civilizationId" TEXT NOT NULL,
    "artifactKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "effects" TEXT NOT NULL,
    "sourceExpeditionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Artifact_civilizationId_fkey" FOREIGN KEY ("civilizationId") REFERENCES "Civilization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiscoveredAnomaly" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "civilizationId" TEXT NOT NULL,
    "anomalyType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "effects" TEXT NOT NULL,
    "sectorSeed" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiscoveredAnomaly_civilizationId_fkey" FOREIGN KEY ("civilizationId") REFERENCES "Civilization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Civilization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "prosperityScore" INTEGER NOT NULL DEFAULT 100,
    "greatStructureName" TEXT NOT NULL,
    "galaxyName" TEXT NOT NULL,
    "sectorName" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "coordinatesX" INTEGER NOT NULL,
    "coordinatesY" INTEGER NOT NULL,
    "coordinatesZ" INTEGER NOT NULL,
    "starType" TEXT NOT NULL,
    "mainPlanetName" TEXT NOT NULL,
    "mainPlanetType" TEXT NOT NULL,
    "habitability" TEXT NOT NULL,
    "anomalyType" TEXT NOT NULL,
    "radarQuality" INTEGER NOT NULL,
    "backgroundRadiation" INTEGER NOT NULL DEFAULT 50,
    "vacuumStability" INTEGER NOT NULL DEFAULT 50,
    "darkMatterDensity" INTEGER NOT NULL DEFAULT 50,
    "eventProbability" REAL NOT NULL DEFAULT 1,
    "scienceFocus" INTEGER NOT NULL,
    "expansionFocus" INTEGER NOT NULL,
    "secrecy" INTEGER NOT NULL,
    "aggression" INTEGER NOT NULL,
    "diplomacyFocus" INTEGER NOT NULL,
    "riskLevel" INTEGER NOT NULL,
    "lastTickAt" DATETIME NOT NULL,
    "highEnergyMilliRem" INTEGER NOT NULL DEFAULT 0,
    "totalHighEnergyMined" INTEGER NOT NULL DEFAULT 0,
    "successfulExpeditions" INTEGER NOT NULL DEFAULT 0,
    "expeditionNonce" INTEGER NOT NULL DEFAULT 0,
    "has4DRiftAccess" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Civilization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Civilization" ("aggression", "anomalyType", "backgroundRadiation", "coordinatesX", "coordinatesY", "coordinatesZ", "createdAt", "darkMatterDensity", "diplomacyFocus", "eventProbability", "expansionFocus", "expeditionNonce", "galaxyName", "greatStructureName", "habitability", "highEnergyMilliRem", "id", "lastTickAt", "level", "mainPlanetName", "mainPlanetType", "name", "prosperityScore", "radarQuality", "riskLevel", "scienceFocus", "secrecy", "sectorName", "seed", "starType", "successfulExpeditions", "systemName", "totalHighEnergyMined", "updatedAt", "userId", "vacuumStability") SELECT "aggression", "anomalyType", "backgroundRadiation", "coordinatesX", "coordinatesY", "coordinatesZ", "createdAt", "darkMatterDensity", "diplomacyFocus", "eventProbability", "expansionFocus", "expeditionNonce", "galaxyName", "greatStructureName", "habitability", "highEnergyMilliRem", "id", "lastTickAt", "level", "mainPlanetName", "mainPlanetType", "name", "prosperityScore", "radarQuality", "riskLevel", "scienceFocus", "secrecy", "sectorName", "seed", "starType", "successfulExpeditions", "systemName", "totalHighEnergyMined", "updatedAt", "userId", "vacuumStability" FROM "Civilization";
DROP TABLE "Civilization";
ALTER TABLE "new_Civilization" RENAME TO "Civilization";
CREATE UNIQUE INDEX "Civilization_userId_key" ON "Civilization"("userId");
CREATE TABLE "new_Expedition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "civilizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'localScan',
    "expeditionType" TEXT NOT NULL DEFAULT 'localScan',
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" DATETIME NOT NULL,
    "finishesAt" DATETIME NOT NULL,
    "result" TEXT,
    "outcomeType" TEXT,
    "rewardData" TEXT,
    "seed" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Expedition_civilizationId_fkey" FOREIGN KEY ("civilizationId") REFERENCES "Civilization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Expedition" ("civilizationId", "createdAt", "finishesAt", "id", "result", "seed", "startedAt", "status", "type", "updatedAt") SELECT "civilizationId", "createdAt", "finishesAt", "id", "result", "seed", "startedAt", "status", "type", "updatedAt" FROM "Expedition";
DROP TABLE "Expedition";
ALTER TABLE "new_Expedition" RENAME TO "Expedition";
CREATE INDEX "Expedition_civilizationId_status_idx" ON "Expedition"("civilizationId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Artifact_civilizationId_idx" ON "Artifact"("civilizationId");

-- CreateIndex
CREATE INDEX "DiscoveredAnomaly_civilizationId_idx" ON "DiscoveredAnomaly"("civilizationId");
