ALTER TABLE "Content"
ADD COLUMN "summary" TEXT,
ADD COLUMN "category" TEXT,
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "estimatedReadMinutes" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "contentBlocks" JSONB;

ALTER TABLE "ContentRevision"
ADD COLUMN "summary" TEXT,
ADD COLUMN "category" TEXT,
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "estimatedReadMinutes" INTEGER,
ADD COLUMN "contentBlocks" JSONB;
