CREATE TABLE "InvestmentDecision" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'watch',
    "decision" TEXT NOT NULL DEFAULT 'watch',
    "marketBelief" TEXT NOT NULL DEFAULT '',
    "variantView" TEXT NOT NULL DEFAULT '',
    "evidenceJson" JSONB NOT NULL,
    "riskJson" JSONB NOT NULL,
    "invalidation" TEXT NOT NULL DEFAULT '',
    "timeHorizon" TEXT,
    "expectedReturn" DOUBLE PRECISION,
    "downside" DOUBLE PRECISION,
    "sourceSnapshotJson" JSONB,
    "outcomeReturn" DOUBLE PRECISION,
    "lesson" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "featuredRank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestmentDecision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvestmentDecision_slug_key" ON "InvestmentDecision"("slug");
CREATE INDEX "InvestmentDecision_ticker_idx" ON "InvestmentDecision"("ticker");
CREATE INDEX "InvestmentDecision_status_idx" ON "InvestmentDecision"("status");
CREATE INDEX "InvestmentDecision_decision_idx" ON "InvestmentDecision"("decision");
CREATE INDEX "InvestmentDecision_isPublic_featuredRank_idx" ON "InvestmentDecision"("isPublic", "featuredRank");
