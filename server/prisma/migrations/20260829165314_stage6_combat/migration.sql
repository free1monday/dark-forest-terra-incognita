-- CreateTable
CREATE TABLE "CombatAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attackerCivilizationId" TEXT NOT NULL,
    "targetContactId" TEXT,
    "targetCivilizationId" TEXT,
    "attackType" TEXT NOT NULL,
    "targetCoordinatesX" REAL NOT NULL DEFAULT 0,
    "targetCoordinatesY" REAL NOT NULL DEFAULT 0,
    "targetCoordinatesZ" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PREPARING',
    "prepStartedAt" DATETIME NOT NULL,
    "prepFinishesAt" DATETIME NOT NULL,
    "transitFinishesAt" DATETIME,
    "resolvedAt" DATETIME,
    "outcome" TEXT,
    "damageDealt" REAL,
    "damageTaken" REAL,
    "hitChance" REAL,
    "attackPower" REAL,
    "defensePower" REAL,
    "seedChannel" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CombatAction_attackerCivilizationId_fkey" FOREIGN KEY ("attackerCivilizationId") REFERENCES "Civilization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CombatReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "combatActionId" TEXT NOT NULL,
    "attackerCivilizationId" TEXT NOT NULL,
    "targetCivilizationId" TEXT,
    "attackType" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "hitChance" REAL NOT NULL DEFAULT 0,
    "attackPower" REAL NOT NULL DEFAULT 0,
    "defensePower" REAL NOT NULL DEFAULT 0,
    "damageDealt" REAL NOT NULL DEFAULT 0,
    "damageTaken" REAL NOT NULL DEFAULT 0,
    "flavorText" TEXT NOT NULL DEFAULT '',
    "targetName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CombatReport_combatActionId_fkey" FOREIGN KEY ("combatActionId") REFERENCES "CombatAction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CombatReport_attackerCivilizationId_fkey" FOREIGN KEY ("attackerCivilizationId") REFERENCES "Civilization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "signalExposure" REAL NOT NULL DEFAULT 1.0,
    "evacuationActive" BOOLEAN NOT NULL DEFAULT false,
    "commJammedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Civilization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Civilization" ("aggression", "anomalyType", "backgroundRadiation", "coordinatesX", "coordinatesY", "coordinatesZ", "createdAt", "darkMatterDensity", "diplomacyFocus", "eventProbability", "expansionFocus", "expeditionNonce", "galaxyName", "greatStructureName", "habitability", "has4DRiftAccess", "highEnergyMilliRem", "id", "lastTickAt", "level", "mainPlanetName", "mainPlanetType", "name", "prosperityScore", "radarQuality", "riskLevel", "scienceFocus", "secrecy", "sectorName", "seed", "signalExposure", "starType", "successfulExpeditions", "systemName", "totalHighEnergyMined", "updatedAt", "userId", "vacuumStability") SELECT "aggression", "anomalyType", "backgroundRadiation", "coordinatesX", "coordinatesY", "coordinatesZ", "createdAt", "darkMatterDensity", "diplomacyFocus", "eventProbability", "expansionFocus", "expeditionNonce", "galaxyName", "greatStructureName", "habitability", "has4DRiftAccess", "highEnergyMilliRem", "id", "lastTickAt", "level", "mainPlanetName", "mainPlanetType", "name", "prosperityScore", "radarQuality", "riskLevel", "scienceFocus", "secrecy", "sectorName", "seed", "signalExposure", "starType", "successfulExpeditions", "systemName", "totalHighEnergyMined", "updatedAt", "userId", "vacuumStability" FROM "Civilization";
DROP TABLE "Civilization";
ALTER TABLE "new_Civilization" RENAME TO "Civilization";
CREATE UNIQUE INDEX "Civilization_userId_key" ON "Civilization"("userId");
CREATE TABLE "new_Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "observerCivilizationId" TEXT NOT NULL,
    "targetCivilizationId" TEXT,
    "targetBotData" TEXT,
    "distance" REAL NOT NULL,
    "distanceAccuracy" REAL NOT NULL,
    "distanceNoise" REAL NOT NULL DEFAULT 0,
    "levelMin" INTEGER NOT NULL,
    "levelMax" INTEGER NOT NULL,
    "levelAccuracy" REAL NOT NULL,
    "confidence" REAL NOT NULL,
    "signalType" TEXT NOT NULL,
    "coordinatesX" REAL NOT NULL,
    "coordinatesY" REAL NOT NULL,
    "coordinatesZ" REAL NOT NULL,
    "coordinatesAccuracy" REAL NOT NULL,
    "galaxyName" TEXT,
    "sectorName" TEXT,
    "systemName" TEXT,
    "isFalsePositive" BOOLEAN NOT NULL DEFAULT false,
    "firstDetectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'detected',
    "sourceExpeditionId" TEXT,
    "targetStructures" TEXT,
    "isDestroyed" BOOLEAN NOT NULL DEFAULT false,
    "defenseStatus" TEXT,
    "reconLevel" INTEGER NOT NULL DEFAULT 0,
    "trueCoordinatesX" REAL,
    "trueCoordinatesY" REAL,
    "trueCoordinatesZ" REAL,
    CONSTRAINT "Contact_observerCivilizationId_fkey" FOREIGN KEY ("observerCivilizationId") REFERENCES "Civilization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Contact_targetCivilizationId_fkey" FOREIGN KEY ("targetCivilizationId") REFERENCES "Civilization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Contact" ("confidence", "coordinatesAccuracy", "coordinatesX", "coordinatesY", "coordinatesZ", "distance", "distanceAccuracy", "distanceNoise", "firstDetectedAt", "galaxyName", "id", "isFalsePositive", "lastUpdated", "levelAccuracy", "levelMax", "levelMin", "observerCivilizationId", "sectorName", "signalType", "sourceExpeditionId", "status", "systemName", "targetBotData", "targetCivilizationId") SELECT "confidence", "coordinatesAccuracy", "coordinatesX", "coordinatesY", "coordinatesZ", "distance", "distanceAccuracy", "distanceNoise", "firstDetectedAt", "galaxyName", "id", "isFalsePositive", "lastUpdated", "levelAccuracy", "levelMax", "levelMin", "observerCivilizationId", "sectorName", "signalType", "sourceExpeditionId", "status", "systemName", "targetBotData", "targetCivilizationId" FROM "Contact";
DROP TABLE "Contact";
ALTER TABLE "new_Contact" RENAME TO "Contact";
CREATE INDEX "Contact_observerCivilizationId_status_idx" ON "Contact"("observerCivilizationId", "status");
CREATE INDEX "Contact_targetCivilizationId_idx" ON "Contact"("targetCivilizationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CombatAction_attackerCivilizationId_status_idx" ON "CombatAction"("attackerCivilizationId", "status");

-- CreateIndex
CREATE INDEX "CombatAction_targetContactId_idx" ON "CombatAction"("targetContactId");

-- CreateIndex
CREATE INDEX "CombatReport_attackerCivilizationId_createdAt_idx" ON "CombatReport"("attackerCivilizationId", "createdAt");

-- CreateIndex
CREATE INDEX "CombatReport_combatActionId_idx" ON "CombatReport"("combatActionId");
