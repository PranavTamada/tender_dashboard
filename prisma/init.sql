-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('KEYWORD', 'DEPARTMENT');

-- CreateEnum
CREATE TYPE "TenderStatus" AS ENUM ('OPEN', 'CLOSING_SOON', 'CLOSED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Tender" (
    "id" TEXT NOT NULL,
    "portal" TEXT NOT NULL DEFAULT 'infralens',
    "level" TEXT,
    "sourceTenderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "organization" TEXT,
    "department" TEXT,
    "sector" TEXT,
    "workType" TEXT,
    "state" TEXT,
    "city" TEXT,
    "publishedDate" TIMESTAMP(3),
    "closingDate" TIMESTAMP(3),
    "estimatedValue" DECIMAL(20,2),
    "valueBand" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "url" TEXT,
    "status" "TenderStatus" NOT NULL DEFAULT 'UNKNOWN',
    "matchType" "MatchType" NOT NULL,
    "matchedKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visited" BOOLEAN NOT NULL DEFAULT false,
    "visitedAt" TIMESTAMP(3),
    "dedupeHash" TEXT NOT NULL,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeletedTender" (
    "dedupeHash" TEXT NOT NULL,
    "title" TEXT,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletedTender_pkey" PRIMARY KEY ("dedupeHash")
);

-- CreateTable
CREATE TABLE "CollectorRun" (
    "id" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "usedFallback" BOOLEAN NOT NULL DEFAULT false,
    "fetched" INTEGER NOT NULL DEFAULT 0,
    "matched" INTEGER NOT NULL DEFAULT 0,
    "inserted" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectorRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tender_dedupeHash_key" ON "Tender"("dedupeHash");

-- CreateIndex
CREATE INDEX "Tender_portal_idx" ON "Tender"("portal");

-- CreateIndex
CREATE INDEX "Tender_matchType_idx" ON "Tender"("matchType");

-- CreateIndex
CREATE INDEX "Tender_department_idx" ON "Tender"("department");

-- CreateIndex
CREATE INDEX "Tender_sector_idx" ON "Tender"("sector");

-- CreateIndex
CREATE INDEX "Tender_state_idx" ON "Tender"("state");

-- CreateIndex
CREATE INDEX "Tender_closingDate_idx" ON "Tender"("closingDate");

-- CreateIndex
CREATE INDEX "Tender_status_idx" ON "Tender"("status");

-- CreateIndex
CREATE INDEX "Tender_visited_idx" ON "Tender"("visited");

-- CreateIndex
CREATE INDEX "CollectorRun_startedAt_idx" ON "CollectorRun"("startedAt");

