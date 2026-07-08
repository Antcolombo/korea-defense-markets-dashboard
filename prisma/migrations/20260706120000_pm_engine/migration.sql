CREATE TABLE "FundamentalSnapshot" (
  "id" TEXT NOT NULL,
  "ticker" TEXT NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "fiscalPeriod" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "revenue" DOUBLE PRECISION,
  "grossProfit" DOUBLE PRECISION,
  "operatingIncome" DOUBLE PRECISION,
  "ebitda" DOUBLE PRECISION,
  "netIncome" DOUBLE PRECISION,
  "epsDiluted" DOUBLE PRECISION,
  "freeCashFlow" DOUBLE PRECISION,
  "cash" DOUBLE PRECISION,
  "debt" DOUBLE PRECISION,
  "sharesDiluted" DOUBLE PRECISION,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "asOfDate" TIMESTAMP(3) NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "providerTimestamp" TIMESTAMP(3),
  "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "revisionFlag" "RevisionFlag" NOT NULL DEFAULT 'UNKNOWN',
  "dataStatus" "DataStatus" NOT NULL DEFAULT 'PARTIAL',
  CONSTRAINT "FundamentalSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EstimateSnapshot" (
  "id" TEXT NOT NULL,
  "ticker" TEXT NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "fiscalPeriod" TEXT NOT NULL,
  "estimateDate" TIMESTAMP(3) NOT NULL,
  "revenueEstimate" DOUBLE PRECISION,
  "epsEstimate" DOUBLE PRECISION,
  "ebitdaEstimate" DOUBLE PRECISION,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "asOfDate" TIMESTAMP(3) NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "providerTimestamp" TIMESTAMP(3),
  "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "revisionFlag" "RevisionFlag" NOT NULL DEFAULT 'UNKNOWN',
  "dataStatus" "DataStatus" NOT NULL DEFAULT 'PARTIAL',
  CONSTRAINT "EstimateSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ValuationSnapshot" (
  "id" TEXT NOT NULL,
  "ticker" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "marketCap" DOUBLE PRECISION,
  "enterpriseValue" DOUBLE PRECISION,
  "peRatio" DOUBLE PRECISION,
  "evSales" DOUBLE PRECISION,
  "evEbitda" DOUBLE PRECISION,
  "fcfYield" DOUBLE PRECISION,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "asOfDate" TIMESTAMP(3) NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "providerTimestamp" TIMESTAMP(3),
  "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "revisionFlag" "RevisionFlag" NOT NULL DEFAULT 'UNKNOWN',
  "dataStatus" "DataStatus" NOT NULL DEFAULT 'PARTIAL',
  CONSTRAINT "ValuationSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FactorExposureSnapshot" (
  "id" TEXT NOT NULL,
  "ticker" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "exposures" JSONB NOT NULL,
  "beta" DOUBLE PRECISION,
  "residualVariance" DOUBLE PRECISION,
  "rSquared" DOUBLE PRECISION,
  "observations" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "asOfDate" TIMESTAMP(3) NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "providerTimestamp" TIMESTAMP(3),
  "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "revisionFlag" "RevisionFlag" NOT NULL DEFAULT 'UNKNOWN',
  "dataStatus" "DataStatus" NOT NULL DEFAULT 'PARTIAL',
  CONSTRAINT "FactorExposureSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RiskModelRun" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "factors" TEXT[],
  "factorCovariance" JSONB NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "asOfDate" TIMESTAMP(3) NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "providerTimestamp" TIMESTAMP(3),
  "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "revisionFlag" "RevisionFlag" NOT NULL DEFAULT 'UNKNOWN',
  "dataStatus" "DataStatus" NOT NULL DEFAULT 'PARTIAL',
  CONSTRAINT "RiskModelRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmDecisionOverlay" (
  "id" TEXT NOT NULL,
  "decisionSlug" TEXT NOT NULL,
  "ticker" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "pmReady" BOOLEAN NOT NULL DEFAULT false,
  "expectedValue" DOUBLE PRECISION,
  "costAdjustedEv" DOUBLE PRECISION,
  "suggestedSizePct" DOUBLE PRECISION,
  "activeCapReason" TEXT,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "asOfDate" TIMESTAMP(3) NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "providerTimestamp" TIMESTAMP(3),
  "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "revisionFlag" "RevisionFlag" NOT NULL DEFAULT 'UNKNOWN',
  "dataStatus" "DataStatus" NOT NULL DEFAULT 'PARTIAL',
  CONSTRAINT "PmDecisionOverlay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PortfolioOptimizationRun" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "nav" DOUBLE PRECISION NOT NULL,
  "grossExposure" DOUBLE PRECISION,
  "netExposure" DOUBLE PRECISION,
  "portfolioBeta" DOUBLE PRECISION,
  "costAdjustedEv" DOUBLE PRECISION,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "asOfDate" TIMESTAMP(3) NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "providerTimestamp" TIMESTAMP(3),
  "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "revisionFlag" "RevisionFlag" NOT NULL DEFAULT 'UNKNOWN',
  "dataStatus" "DataStatus" NOT NULL DEFAULT 'PARTIAL',
  CONSTRAINT "PortfolioOptimizationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PortfolioRiskSnapshot" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "annualizedRisk" DOUBLE PRECISION,
  "valueAtRisk95" DOUBLE PRECISION,
  "valueAtRisk99" DOUBLE PRECISION,
  "expectedShortfall" DOUBLE PRECISION,
  "liquidityDays" DOUBLE PRECISION,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "asOfDate" TIMESTAMP(3) NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "providerTimestamp" TIMESTAMP(3),
  "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "revisionFlag" "RevisionFlag" NOT NULL DEFAULT 'UNKNOWN',
  "dataStatus" "DataStatus" NOT NULL DEFAULT 'PARTIAL',
  CONSTRAINT "PortfolioRiskSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BacktestRun" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "lookbackStart" TIMESTAMP(3),
  "lookbackEnd" TIMESTAMP(3),
  "hitRate" DOUBLE PRECISION,
  "informationCoefficient" DOUBLE PRECISION,
  "averageForwardReturn" DOUBLE PRECISION,
  "sharpe" DOUBLE PRECISION,
  "maxDrawdown" DOUBLE PRECISION,
  "turnover" DOUBLE PRECISION,
  "capacity" DOUBLE PRECISION,
  "netReturn" DOUBLE PRECISION,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "asOfDate" TIMESTAMP(3) NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "providerTimestamp" TIMESTAMP(3),
  "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "revisionFlag" "RevisionFlag" NOT NULL DEFAULT 'UNKNOWN',
  "dataStatus" "DataStatus" NOT NULL DEFAULT 'PARTIAL',
  CONSTRAINT "BacktestRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FundamentalSnapshot_ticker_periodEnd_fiscalPeriod_provider_as_key" ON "FundamentalSnapshot"("ticker", "periodEnd", "fiscalPeriod", "provider", "asOfDate");
CREATE INDEX "FundamentalSnapshot_ticker_periodEnd_idx" ON "FundamentalSnapshot"("ticker", "periodEnd");
CREATE INDEX "FundamentalSnapshot_asOfDate_idx" ON "FundamentalSnapshot"("asOfDate");
CREATE INDEX "FundamentalSnapshot_dataStatus_idx" ON "FundamentalSnapshot"("dataStatus");

CREATE UNIQUE INDEX "EstimateSnapshot_ticker_periodEnd_fiscalPeriod_estimateDate_p_key" ON "EstimateSnapshot"("ticker", "periodEnd", "fiscalPeriod", "estimateDate", "provider", "asOfDate");
CREATE INDEX "EstimateSnapshot_ticker_periodEnd_idx" ON "EstimateSnapshot"("ticker", "periodEnd");
CREATE INDEX "EstimateSnapshot_estimateDate_idx" ON "EstimateSnapshot"("estimateDate");
CREATE INDEX "EstimateSnapshot_dataStatus_idx" ON "EstimateSnapshot"("dataStatus");

CREATE UNIQUE INDEX "ValuationSnapshot_ticker_date_provider_asOfDate_key" ON "ValuationSnapshot"("ticker", "date", "provider", "asOfDate");
CREATE INDEX "ValuationSnapshot_ticker_date_idx" ON "ValuationSnapshot"("ticker", "date");
CREATE INDEX "ValuationSnapshot_dataStatus_idx" ON "ValuationSnapshot"("dataStatus");

CREATE UNIQUE INDEX "FactorExposureSnapshot_ticker_date_provider_asOfDate_key" ON "FactorExposureSnapshot"("ticker", "date", "provider", "asOfDate");
CREATE INDEX "FactorExposureSnapshot_ticker_date_idx" ON "FactorExposureSnapshot"("ticker", "date");
CREATE INDEX "FactorExposureSnapshot_dataStatus_idx" ON "FactorExposureSnapshot"("dataStatus");

CREATE INDEX "RiskModelRun_name_date_idx" ON "RiskModelRun"("name", "date");
CREATE INDEX "RiskModelRun_dataStatus_idx" ON "RiskModelRun"("dataStatus");

CREATE UNIQUE INDEX "PmDecisionOverlay_decisionSlug_date_provider_asOfDate_key" ON "PmDecisionOverlay"("decisionSlug", "date", "provider", "asOfDate");
CREATE INDEX "PmDecisionOverlay_ticker_date_idx" ON "PmDecisionOverlay"("ticker", "date");
CREATE INDEX "PmDecisionOverlay_pmReady_idx" ON "PmDecisionOverlay"("pmReady");
CREATE INDEX "PmDecisionOverlay_dataStatus_idx" ON "PmDecisionOverlay"("dataStatus");

CREATE INDEX "PortfolioOptimizationRun_name_date_idx" ON "PortfolioOptimizationRun"("name", "date");
CREATE INDEX "PortfolioOptimizationRun_dataStatus_idx" ON "PortfolioOptimizationRun"("dataStatus");

CREATE INDEX "PortfolioRiskSnapshot_name_date_idx" ON "PortfolioRiskSnapshot"("name", "date");
CREATE INDEX "PortfolioRiskSnapshot_dataStatus_idx" ON "PortfolioRiskSnapshot"("dataStatus");

CREATE INDEX "BacktestRun_name_date_idx" ON "BacktestRun"("name", "date");
CREATE INDEX "BacktestRun_dataStatus_idx" ON "BacktestRun"("dataStatus");
