-- CreateEnum
CREATE TYPE "DataStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'STALE', 'PARTIAL', 'ENTITLEMENT_MISSING', 'PROVIDER_ERROR');

-- CreateEnum
CREATE TYPE "RevisionFlag" AS ENUM ('ORIGINAL', 'REVISED', 'CORRECTED', 'RESTATED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "NoteStatus" AS ENUM ('GENERATED', 'HUMAN_EDITED', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Ticker" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT,
    "industry" TEXT,
    "country" TEXT,
    "assetType" TEXT NOT NULL,
    "isEtf" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "asOfDate" TIMESTAMP(3),
    "observedAt" TIMESTAMP(3),
    "providerTimestamp" TIMESTAMP(3),
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'taxonomy',
    "provider" TEXT NOT NULL DEFAULT 'internal',
    "revisionFlag" "RevisionFlag" NOT NULL DEFAULT 'UNKNOWN',
    "dataStatus" "DataStatus" NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "Ticker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyPrice" (
    "id" TEXT NOT NULL,
    "tickerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "open" DOUBLE PRECISION,
    "high" DOUBLE PRECISION,
    "low" DOUBLE PRECISION,
    "close" DOUBLE PRECISION NOT NULL,
    "adjustedClose" DOUBLE PRECISION,
    "volume" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "providerTimestamp" TIMESTAMP(3),
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "revisionFlag" "RevisionFlag" NOT NULL DEFAULT 'UNKNOWN',
    "dataStatus" "DataStatus" NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "DailyPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThemeBasket" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "asOfDate" TIMESTAMP(3),
    "observedAt" TIMESTAMP(3),
    "providerTimestamp" TIMESTAMP(3),
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'taxonomy',
    "provider" TEXT NOT NULL DEFAULT 'internal',
    "revisionFlag" "RevisionFlag" NOT NULL DEFAULT 'UNKNOWN',
    "dataStatus" "DataStatus" NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "ThemeBasket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThemeBasketMember" (
    "id" TEXT NOT NULL,
    "basketId" TEXT NOT NULL,
    "tickerId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "rationale" TEXT,
    "asOfDate" TIMESTAMP(3),
    "observedAt" TIMESTAMP(3),
    "providerTimestamp" TIMESTAMP(3),
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'taxonomy',
    "provider" TEXT NOT NULL DEFAULT 'internal',
    "revisionFlag" "RevisionFlag" NOT NULL DEFAULT 'UNKNOWN',
    "dataStatus" "DataStatus" NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "ThemeBasketMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignalSnapshot" (
    "id" TEXT NOT NULL,
    "tickerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "return1d" DOUBLE PRECISION,
    "return5d" DOUBLE PRECISION,
    "return20d" DOUBLE PRECISION,
    "return60d" DOUBLE PRECISION,
    "relativeStrengthVsSpy20d" DOUBLE PRECISION,
    "relativeStrengthVsSpy60d" DOUBLE PRECISION,
    "volumeVs20dAvg" DOUBLE PRECISION,
    "realizedVol20d" DOUBLE PRECISION,
    "distanceFrom20dMa" DOUBLE PRECISION,
    "distanceFrom50dMa" DOUBLE PRECISION,
    "trendLabel" TEXT,
    "components" JSONB,
    "excludedUnavailableInputs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "providerTimestamp" TIMESTAMP(3),
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "revisionFlag" "RevisionFlag" NOT NULL DEFAULT 'UNKNOWN',
    "dataStatus" "DataStatus" NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "SignalSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositioningSnapshot" (
    "id" TEXT NOT NULL,
    "tickerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "optionsVolume" DOUBLE PRECISION,
    "openInterest" DOUBLE PRECISION,
    "putCallRatio" DOUBLE PRECISION,
    "impliedVolatility" DOUBLE PRECISION,
    "impliedVolPercentile" DOUBLE PRECISION,
    "shortInterest" DOUBLE PRECISION,
    "shortInterestChange" DOUBLE PRECISION,
    "shortVolume" DOUBLE PRECISION,
    "shortVolumeRatio" DOUBLE PRECISION,
    "positioningNotes" TEXT,
    "components" JSONB,
    "excludedUnavailableInputs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "providerTimestamp" TIMESTAMP(3),
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "revisionFlag" "RevisionFlag" NOT NULL DEFAULT 'UNKNOWN',
    "dataStatus" "DataStatus" NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "PositioningSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrowdingSnapshot" (
    "id" TEXT NOT NULL,
    "tickerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "crowdingScore" DOUBLE PRECISION,
    "crowdingLabel" TEXT,
    "momentumScore" DOUBLE PRECISION,
    "volumeScore" DOUBLE PRECISION,
    "optionsScore" DOUBLE PRECISION,
    "volatilityScore" DOUBLE PRECISION,
    "shortInterestScore" DOUBLE PRECISION,
    "catalystScore" DOUBLE PRECISION,
    "explanation" TEXT,
    "components" JSONB,
    "excludedUnavailableInputs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "providerTimestamp" TIMESTAMP(3),
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "revisionFlag" "RevisionFlag" NOT NULL DEFAULT 'UNKNOWN',
    "dataStatus" "DataStatus" NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "CrowdingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyNote" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "marketRegime" TEXT,
    "topRotations" JSONB,
    "crowdedLongs" JSONB,
    "earlyAccumulation" JSONB,
    "reversalRisks" JSONB,
    "pmQuestions" JSONB,
    "body" TEXT NOT NULL,
    "inputSnapshotIds" JSONB NOT NULL,
    "excludedUnavailableInputs" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "humanEditedAt" TIMESTAMP(3),
    "noteStatus" "NoteStatus" NOT NULL DEFAULT 'GENERATED',
    "sourceCoveragePercent" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "providerTimestamp" TIMESTAMP(3),
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "revisionFlag" "RevisionFlag" NOT NULL DEFAULT 'UNKNOWN',
    "dataStatus" "DataStatus" NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "DailyNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalystEvent" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "sourceName" TEXT,
    "url" TEXT,
    "summary" TEXT,
    "themeTags" TEXT[],
    "tickerTags" TEXT[],
    "materialityScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "providerTimestamp" TIMESTAMP(3),
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "revisionFlag" "RevisionFlag" NOT NULL DEFAULT 'UNKNOWN',
    "dataStatus" "DataStatus" NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "CatalystEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderRun" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "asOfDate" TIMESTAMP(3),
    "observedAt" TIMESTAMP(3),
    "providerTimestamp" TIMESTAMP(3),
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rowsIngested" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "revisionFlag" "RevisionFlag" NOT NULL DEFAULT 'UNKNOWN',
    "dataStatus" "DataStatus" NOT NULL,

    CONSTRAINT "ProviderRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationResult" (
    "id" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "lookbackStart" TIMESTAMP(3),
    "lookbackEnd" TIMESTAMP(3),
    "hitRate" DOUBLE PRECISION,
    "averageForwardReturn" DOUBLE PRECISION,
    "sampleSize" INTEGER NOT NULL,
    "coveragePercent" DOUBLE PRECISION NOT NULL,
    "caveats" TEXT,
    "resultRows" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "providerTimestamp" TIMESTAMP(3),
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "revisionFlag" "RevisionFlag" NOT NULL DEFAULT 'UNKNOWN',
    "dataStatus" "DataStatus" NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "ValidationResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticker_ticker_key" ON "Ticker"("ticker");

-- CreateIndex
CREATE INDEX "Ticker_ticker_idx" ON "Ticker"("ticker");

-- CreateIndex
CREATE INDEX "Ticker_dataStatus_idx" ON "Ticker"("dataStatus");

-- CreateIndex
CREATE INDEX "DailyPrice_date_idx" ON "DailyPrice"("date");

-- CreateIndex
CREATE INDEX "DailyPrice_asOfDate_idx" ON "DailyPrice"("asOfDate");

-- CreateIndex
CREATE INDEX "DailyPrice_provider_dataStatus_idx" ON "DailyPrice"("provider", "dataStatus");

-- CreateIndex
CREATE UNIQUE INDEX "DailyPrice_tickerId_date_provider_asOfDate_key" ON "DailyPrice"("tickerId", "date", "provider", "asOfDate");

-- CreateIndex
CREATE UNIQUE INDEX "ThemeBasket_slug_key" ON "ThemeBasket"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ThemeBasketMember_basketId_tickerId_key" ON "ThemeBasketMember"("basketId", "tickerId");

-- CreateIndex
CREATE INDEX "SignalSnapshot_date_idx" ON "SignalSnapshot"("date");

-- CreateIndex
CREATE INDEX "SignalSnapshot_dataStatus_idx" ON "SignalSnapshot"("dataStatus");

-- CreateIndex
CREATE UNIQUE INDEX "SignalSnapshot_tickerId_date_provider_asOfDate_key" ON "SignalSnapshot"("tickerId", "date", "provider", "asOfDate");

-- CreateIndex
CREATE INDEX "PositioningSnapshot_date_idx" ON "PositioningSnapshot"("date");

-- CreateIndex
CREATE INDEX "PositioningSnapshot_dataStatus_idx" ON "PositioningSnapshot"("dataStatus");

-- CreateIndex
CREATE UNIQUE INDEX "PositioningSnapshot_tickerId_date_provider_asOfDate_key" ON "PositioningSnapshot"("tickerId", "date", "provider", "asOfDate");

-- CreateIndex
CREATE INDEX "CrowdingSnapshot_date_idx" ON "CrowdingSnapshot"("date");

-- CreateIndex
CREATE INDEX "CrowdingSnapshot_dataStatus_idx" ON "CrowdingSnapshot"("dataStatus");

-- CreateIndex
CREATE UNIQUE INDEX "CrowdingSnapshot_tickerId_date_provider_asOfDate_key" ON "CrowdingSnapshot"("tickerId", "date", "provider", "asOfDate");

-- CreateIndex
CREATE INDEX "DailyNote_date_idx" ON "DailyNote"("date");

-- CreateIndex
CREATE INDEX "DailyNote_noteStatus_idx" ON "DailyNote"("noteStatus");

-- CreateIndex
CREATE INDEX "CatalystEvent_date_idx" ON "CatalystEvent"("date");

-- CreateIndex
CREATE INDEX "CatalystEvent_dataStatus_idx" ON "CatalystEvent"("dataStatus");

-- CreateIndex
CREATE INDEX "ProviderRun_provider_dataStatus_idx" ON "ProviderRun"("provider", "dataStatus");

-- CreateIndex
CREATE INDEX "ProviderRun_asOfDate_idx" ON "ProviderRun"("asOfDate");

-- CreateIndex
CREATE INDEX "ValidationResult_testName_asOfDate_idx" ON "ValidationResult"("testName", "asOfDate");

-- CreateIndex
CREATE INDEX "ValidationResult_dataStatus_idx" ON "ValidationResult"("dataStatus");

-- AddForeignKey
ALTER TABLE "DailyPrice" ADD CONSTRAINT "DailyPrice_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThemeBasketMember" ADD CONSTRAINT "ThemeBasketMember_basketId_fkey" FOREIGN KEY ("basketId") REFERENCES "ThemeBasket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThemeBasketMember" ADD CONSTRAINT "ThemeBasketMember_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalSnapshot" ADD CONSTRAINT "SignalSnapshot_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositioningSnapshot" ADD CONSTRAINT "PositioningSnapshot_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrowdingSnapshot" ADD CONSTRAINT "CrowdingSnapshot_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "Ticker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
