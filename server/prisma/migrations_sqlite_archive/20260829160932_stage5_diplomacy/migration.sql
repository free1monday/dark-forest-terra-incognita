-- CreateTable
CREATE TABLE "DiplomaticThread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "observerCivilizationId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "trust" INTEGER NOT NULL DEFAULT 50,
    "tension" INTEGER NOT NULL DEFAULT 0,
    "messageNonce" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DiplomaticThread_observerCivilizationId_fkey" FOREIGN KEY ("observerCivilizationId") REFERENCES "Civilization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiplomaticThread_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiplomaticMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "threadId" TEXT NOT NULL,
    "senderIsObserver" BOOLEAN NOT NULL,
    "cardType" TEXT NOT NULL,
    "textFlavor" TEXT NOT NULL DEFAULT '',
    "sentAt" DATETIME NOT NULL,
    "deliverAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_TRANSIT',
    "encrypted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiplomaticMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DiplomaticThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DiplomaticThread_contactId_key" ON "DiplomaticThread"("contactId");

-- CreateIndex
CREATE INDEX "DiplomaticThread_observerCivilizationId_status_idx" ON "DiplomaticThread"("observerCivilizationId", "status");

-- CreateIndex
CREATE INDEX "DiplomaticMessage_threadId_deliverAt_idx" ON "DiplomaticMessage"("threadId", "deliverAt");

-- CreateIndex
CREATE INDEX "DiplomaticMessage_threadId_status_idx" ON "DiplomaticMessage"("threadId", "status");
