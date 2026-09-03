-- Stage 12 tutorial flag
ALTER TABLE "Civilization" ADD COLUMN IF NOT EXISTS "tutorialCompleted" BOOLEAN NOT NULL DEFAULT false;
