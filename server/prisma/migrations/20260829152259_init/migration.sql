-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "premiumCredits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Civilization" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Civilization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResourceState" (
    "civilizationId" TEXT NOT NULL PRIMARY KEY,
    "highEnergy" INTEGER NOT NULL DEFAULT 40,
    "antimatter" INTEGER NOT NULL DEFAULT 0,
    "darkEnergy" INTEGER NOT NULL DEFAULT 0,
    "darkMatter" INTEGER NOT NULL DEFAULT 0,
    "fermions" INTEGER NOT NULL DEFAULT 0,
    "highEnergyCapacity" INTEGER NOT NULL DEFAULT 1000,
    "antimatterCapacity" INTEGER NOT NULL DEFAULT 100,
    "darkEnergyCapacity" INTEGER NOT NULL DEFAULT 100,
    "darkMatterCapacity" INTEGER NOT NULL DEFAULT 100,
    "fermionsCapacity" INTEGER NOT NULL DEFAULT 50,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ResourceState_civilizationId_fkey" FOREIGN KEY ("civilizationId") REFERENCES "Civilization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "civilizationId" TEXT NOT NULL,
    "buildingType" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Building_civilizationId_fkey" FOREIGN KEY ("civilizationId") REFERENCES "Civilization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expedition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "civilizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'terra_incognita',
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" DATETIME NOT NULL,
    "finishesAt" DATETIME NOT NULL,
    "result" TEXT,
    "seed" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Expedition_civilizationId_fkey" FOREIGN KEY ("civilizationId") REFERENCES "Civilization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JournalEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "civilizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL,
    "payload" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JournalEvent_civilizationId_fkey" FOREIGN KEY ("civilizationId") REFERENCES "Civilization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "mock" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Civilization_userId_key" ON "Civilization"("userId");

-- CreateIndex
CREATE INDEX "Building_civilizationId_idx" ON "Building"("civilizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Building_civilizationId_buildingType_key" ON "Building"("civilizationId", "buildingType");

-- CreateIndex
CREATE INDEX "Expedition_civilizationId_status_idx" ON "Expedition"("civilizationId", "status");

-- CreateIndex
CREATE INDEX "JournalEvent_civilizationId_createdAt_idx" ON "JournalEvent"("civilizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Purchase_userId_idx" ON "Purchase"("userId");
