-- Baseline: full schema for PostgreSQL (SQLite history archived under prisma/migrations_sqlite_archive)
-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "premiumCredits" INTEGER NOT NULL DEFAULT 0,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Civilization" (
    "id" TEXT NOT NULL,
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
    "eventProbability" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "scienceFocus" INTEGER NOT NULL,
    "expansionFocus" INTEGER NOT NULL,
    "secrecy" INTEGER NOT NULL,
    "aggression" INTEGER NOT NULL,
    "diplomacyFocus" INTEGER NOT NULL,
    "riskLevel" INTEGER NOT NULL,
    "lastTickAt" TIMESTAMP(3) NOT NULL,
    "highEnergyMilliRem" INTEGER NOT NULL DEFAULT 0,
    "totalHighEnergyMined" INTEGER NOT NULL DEFAULT 0,
    "successfulExpeditions" INTEGER NOT NULL DEFAULT 0,
    "expeditionNonce" INTEGER NOT NULL DEFAULT 0,
    "has4DRiftAccess" BOOLEAN NOT NULL DEFAULT false,
    "signalExposure" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "evacuationActive" BOOLEAN NOT NULL DEFAULT false,
    "commJammedUntil" TIMESTAMP(3),
    "physicsLaws" TEXT NOT NULL DEFAULT '[]',
    "isInterstellarTraveling" BOOLEAN NOT NULL DEFAULT false,
    "galaxyTravelFinishesAt" TIMESTAMP(3),
    "galaxyTravelNonce" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Civilization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceState" (
    "civilizationId" TEXT NOT NULL,
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
    "capacityBonusHe" INTEGER NOT NULL DEFAULT 0,
    "capacityBonusFermions" INTEGER NOT NULL DEFAULT 0,
    "capacityBonusAll" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceState_pkey" PRIMARY KEY ("civilizationId")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "civilizationId" TEXT NOT NULL,
    "buildingType" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expedition" (
    "id" TEXT NOT NULL,
    "civilizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'localScan',
    "expeditionType" TEXT NOT NULL DEFAULT 'localScan',
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishesAt" TIMESTAMP(3) NOT NULL,
    "result" TEXT,
    "outcomeType" TEXT,
    "rewardData" TEXT,
    "seed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expedition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL,
    "civilizationId" TEXT NOT NULL,
    "artifactKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "effects" TEXT NOT NULL,
    "sourceExpeditionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveredAnomaly" (
    "id" TEXT NOT NULL,
    "civilizationId" TEXT NOT NULL,
    "anomalyType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "effects" TEXT NOT NULL,
    "sectorSeed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoveredAnomaly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "observerCivilizationId" TEXT NOT NULL,
    "targetCivilizationId" TEXT,
    "targetBotData" TEXT,
    "distance" DOUBLE PRECISION NOT NULL,
    "distanceAccuracy" DOUBLE PRECISION NOT NULL,
    "distanceNoise" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "levelMin" INTEGER NOT NULL,
    "levelMax" INTEGER NOT NULL,
    "levelAccuracy" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "signalType" TEXT NOT NULL,
    "coordinatesX" DOUBLE PRECISION NOT NULL,
    "coordinatesY" DOUBLE PRECISION NOT NULL,
    "coordinatesZ" DOUBLE PRECISION NOT NULL,
    "coordinatesAccuracy" DOUBLE PRECISION NOT NULL,
    "galaxyName" TEXT,
    "sectorName" TEXT,
    "systemName" TEXT,
    "isFalsePositive" BOOLEAN NOT NULL DEFAULT false,
    "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'detected',
    "sourceExpeditionId" TEXT,
    "targetStructures" TEXT,
    "isDestroyed" BOOLEAN NOT NULL DEFAULT false,
    "defenseStatus" TEXT,
    "reconLevel" INTEGER NOT NULL DEFAULT 0,
    "trueCoordinatesX" DOUBLE PRECISION,
    "trueCoordinatesY" DOUBLE PRECISION,
    "trueCoordinatesZ" DOUBLE PRECISION,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiplomaticThread" (
    "id" TEXT NOT NULL,
    "observerCivilizationId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "trust" INTEGER NOT NULL DEFAULT 50,
    "tension" INTEGER NOT NULL DEFAULT 0,
    "messageNonce" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiplomaticThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiplomaticMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderIsObserver" BOOLEAN NOT NULL,
    "cardType" TEXT NOT NULL,
    "textFlavor" TEXT NOT NULL DEFAULT '',
    "sentAt" TIMESTAMP(3) NOT NULL,
    "deliverAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_TRANSIT',
    "encrypted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiplomaticMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CombatAction" (
    "id" TEXT NOT NULL,
    "attackerCivilizationId" TEXT NOT NULL,
    "targetContactId" TEXT,
    "targetCivilizationId" TEXT,
    "attackType" TEXT NOT NULL,
    "targetCoordinatesX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetCoordinatesY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetCoordinatesZ" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PREPARING',
    "prepStartedAt" TIMESTAMP(3) NOT NULL,
    "prepFinishesAt" TIMESTAMP(3) NOT NULL,
    "transitFinishesAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "outcome" TEXT,
    "damageDealt" DOUBLE PRECISION,
    "damageTaken" DOUBLE PRECISION,
    "hitChance" DOUBLE PRECISION,
    "attackPower" DOUBLE PRECISION,
    "defensePower" DOUBLE PRECISION,
    "seedChannel" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CombatAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CombatReport" (
    "id" TEXT NOT NULL,
    "combatActionId" TEXT NOT NULL,
    "attackerCivilizationId" TEXT NOT NULL,
    "targetCivilizationId" TEXT,
    "attackType" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "hitChance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "attackPower" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "defensePower" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "damageDealt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "damageTaken" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "flavorText" TEXT NOT NULL DEFAULT '',
    "targetName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CombatReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEvent" (
    "id" TEXT NOT NULL,
    "civilizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL,
    "payload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "amountSpent" INTEGER NOT NULL DEFAULT 0,
    "mock" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Civilization_userId_key" ON "Civilization"("userId");

-- CreateIndex
CREATE INDEX "Civilization_prosperityScore_idx" ON "Civilization"("prosperityScore");

-- CreateIndex
CREATE INDEX "Civilization_level_idx" ON "Civilization"("level");

-- CreateIndex
CREATE INDEX "Civilization_isDestroyed_idx" ON "Civilization"("isDestroyed");

-- CreateIndex
CREATE INDEX "Building_civilizationId_idx" ON "Building"("civilizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Building_civilizationId_buildingType_key" ON "Building"("civilizationId", "buildingType");

-- CreateIndex
CREATE INDEX "Expedition_civilizationId_status_idx" ON "Expedition"("civilizationId", "status");

-- CreateIndex
CREATE INDEX "Artifact_civilizationId_idx" ON "Artifact"("civilizationId");

-- CreateIndex
CREATE INDEX "DiscoveredAnomaly_civilizationId_idx" ON "DiscoveredAnomaly"("civilizationId");

-- CreateIndex
CREATE INDEX "Contact_observerCivilizationId_status_idx" ON "Contact"("observerCivilizationId", "status");

-- CreateIndex
CREATE INDEX "Contact_targetCivilizationId_idx" ON "Contact"("targetCivilizationId");

-- CreateIndex
CREATE UNIQUE INDEX "DiplomaticThread_contactId_key" ON "DiplomaticThread"("contactId");

-- CreateIndex
CREATE INDEX "DiplomaticThread_observerCivilizationId_status_idx" ON "DiplomaticThread"("observerCivilizationId", "status");

-- CreateIndex
CREATE INDEX "DiplomaticMessage_threadId_deliverAt_idx" ON "DiplomaticMessage"("threadId", "deliverAt");

-- CreateIndex
CREATE INDEX "DiplomaticMessage_threadId_status_idx" ON "DiplomaticMessage"("threadId", "status");

-- CreateIndex
CREATE INDEX "CombatAction_attackerCivilizationId_status_idx" ON "CombatAction"("attackerCivilizationId", "status");

-- CreateIndex
CREATE INDEX "CombatAction_targetContactId_idx" ON "CombatAction"("targetContactId");

-- CreateIndex
CREATE INDEX "CombatReport_attackerCivilizationId_createdAt_idx" ON "CombatReport"("attackerCivilizationId", "createdAt");

-- CreateIndex
CREATE INDEX "CombatReport_combatActionId_idx" ON "CombatReport"("combatActionId");

-- CreateIndex
CREATE INDEX "JournalEvent_civilizationId_createdAt_idx" ON "JournalEvent"("civilizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Purchase_userId_idx" ON "Purchase"("userId");

-- CreateIndex
CREATE INDEX "Purchase_userId_createdAt_idx" ON "Purchase"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Civilization" ADD CONSTRAINT "Civilization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceState" ADD CONSTRAINT "ResourceState_civilizationId_fkey" FOREIGN KEY ("civilizationId") REFERENCES "Civilization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_civilizationId_fkey" FOREIGN KEY ("civilizationId") REFERENCES "Civilization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expedition" ADD CONSTRAINT "Expedition_civilizationId_fkey" FOREIGN KEY ("civilizationId") REFERENCES "Civilization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_civilizationId_fkey" FOREIGN KEY ("civilizationId") REFERENCES "Civilization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveredAnomaly" ADD CONSTRAINT "DiscoveredAnomaly_civilizationId_fkey" FOREIGN KEY ("civilizationId") REFERENCES "Civilization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_observerCivilizationId_fkey" FOREIGN KEY ("observerCivilizationId") REFERENCES "Civilization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_targetCivilizationId_fkey" FOREIGN KEY ("targetCivilizationId") REFERENCES "Civilization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiplomaticThread" ADD CONSTRAINT "DiplomaticThread_observerCivilizationId_fkey" FOREIGN KEY ("observerCivilizationId") REFERENCES "Civilization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiplomaticThread" ADD CONSTRAINT "DiplomaticThread_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiplomaticMessage" ADD CONSTRAINT "DiplomaticMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DiplomaticThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombatAction" ADD CONSTRAINT "CombatAction_attackerCivilizationId_fkey" FOREIGN KEY ("attackerCivilizationId") REFERENCES "Civilization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombatReport" ADD CONSTRAINT "CombatReport_combatActionId_fkey" FOREIGN KEY ("combatActionId") REFERENCES "CombatAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombatReport" ADD CONSTRAINT "CombatReport_attackerCivilizationId_fkey" FOREIGN KEY ("attackerCivilizationId") REFERENCES "Civilization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEvent" ADD CONSTRAINT "JournalEvent_civilizationId_fkey" FOREIGN KEY ("civilizationId") REFERENCES "Civilization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

┌─────────────────────────────────────────────────────────┐
│  Update available 5.22.0 -> 8.0.0-rc.12                 │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘
