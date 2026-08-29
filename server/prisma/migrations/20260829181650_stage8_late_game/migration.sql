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
    "isDestroyed" BOOLEAN NOT NULL DEFAULT false,
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
    "signalExposure" REAL NOT NULL DEFAULT 1.0,
    "evacuationActive" BOOLEAN NOT NULL DEFAULT false,
    "commJammedUntil" DATETIME,
    "physicsLaws" TEXT NOT NULL DEFAULT '[]',
    "isInterstellarTraveling" BOOLEAN NOT NULL DEFAULT false,
    "galaxyTravelFinishesAt" DATETIME,
    "galaxyTravelNonce" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Civilization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Civilization" ("aggression", "anomalyType", "backgroundRadiation", "commJammedUntil", "coordinatesX", "coordinatesY", "coordinatesZ", "createdAt", "darkMatterDensity", "diplomacyFocus", "evacuationActive", "eventProbability", "expansionFocus", "expeditionNonce", "galaxyName", "greatStructureName", "habitability", "has4DRiftAccess", "highEnergyMilliRem", "id", "isDestroyed", "lastTickAt", "level", "mainPlanetName", "mainPlanetType", "name", "prosperityScore", "radarQuality", "riskLevel", "scienceFocus", "secrecy", "sectorName", "seed", "signalExposure", "starType", "successfulExpeditions", "systemName", "totalHighEnergyMined", "updatedAt", "userId", "vacuumStability") SELECT "aggression", "anomalyType", "backgroundRadiation", "commJammedUntil", "coordinatesX", "coordinatesY", "coordinatesZ", "createdAt", "darkMatterDensity", "diplomacyFocus", "evacuationActive", "eventProbability", "expansionFocus", "expeditionNonce", "galaxyName", "greatStructureName", "habitability", "has4DRiftAccess", "highEnergyMilliRem", "id", "isDestroyed", "lastTickAt", "level", "mainPlanetName", "mainPlanetType", "name", "prosperityScore", "radarQuality", "riskLevel", "scienceFocus", "secrecy", "sectorName", "seed", "signalExposure", "starType", "successfulExpeditions", "systemName", "totalHighEnergyMined", "updatedAt", "userId", "vacuumStability" FROM "Civilization";
DROP TABLE "Civilization";
ALTER TABLE "new_Civilization" RENAME TO "Civilization";
CREATE UNIQUE INDEX "Civilization_userId_key" ON "Civilization"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
