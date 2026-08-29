-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "premiumCredits" INTEGER NOT NULL DEFAULT 0,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "email", "id", "passwordHash", "premiumCredits") SELECT "createdAt", "email", "id", "passwordHash", "premiumCredits" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Civilization_prosperityScore_idx" ON "Civilization"("prosperityScore");

-- CreateIndex
CREATE INDEX "Civilization_level_idx" ON "Civilization"("level");

-- CreateIndex
CREATE INDEX "Civilization_isDestroyed_idx" ON "Civilization"("isDestroyed");
