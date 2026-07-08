CREATE TABLE "OptionContract" (
    "id" TEXT NOT NULL,
    "optionTicker" TEXT NOT NULL,
    "underlyingTicker" TEXT NOT NULL,
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "strikePrice" DOUBLE PRECISION NOT NULL,
    "contractType" TEXT NOT NULL,
    "exerciseStyle" TEXT,
    "sharesPerContract" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "asOfDate" TIMESTAMP(3),
    "observedAt" TIMESTAMP(3),
    "providerTimestamp" TIMESTAMP(3),
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "revisionFlag" "RevisionFlag" NOT NULL DEFAULT 'UNKNOWN',
    "dataStatus" "DataStatus" NOT NULL DEFAULT 'PARTIAL',

    CONSTRAINT "OptionContract_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OptionContractBar" (
    "id" TEXT NOT NULL,
    "optionTicker" TEXT NOT NULL,
    "underlyingTicker" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "open" DOUBLE PRECISION,
    "high" DOUBLE PRECISION,
    "low" DOUBLE PRECISION,
    "close" DOUBLE PRECISION,
    "volume" BIGINT,
    "vwap" DOUBLE PRECISION,
    "transactions" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "observedAt" TIMESTAMP(3),
    "providerTimestamp" TIMESTAMP(3),
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "revisionFlag" "RevisionFlag" NOT NULL DEFAULT 'UNKNOWN',
    "dataStatus" "DataStatus" NOT NULL DEFAULT 'PARTIAL',

    CONSTRAINT "OptionContractBar_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OptionsStrikeSignal" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "strikePrice" DOUBLE PRECISION NOT NULL,
    "callVolume" DOUBLE PRECISION,
    "putVolume" DOUBLE PRECISION,
    "totalVolume" DOUBLE PRECISION,
    "openInterest" DOUBLE PRECISION,
    "impliedVolatility" DOUBLE PRECISION,
    "gamma" DOUBLE PRECISION,
    "gammaExposure" DOUBLE PRECISION,
    "gammaProxy" DOUBLE PRECISION,
    "magnetScore" DOUBLE PRECISION,
    "sourceQuality" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "observedAt" TIMESTAMP(3),
    "providerTimestamp" TIMESTAMP(3),
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "revisionFlag" "RevisionFlag" NOT NULL DEFAULT 'UNKNOWN',
    "dataStatus" "DataStatus" NOT NULL DEFAULT 'PARTIAL',

    CONSTRAINT "OptionsStrikeSignal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OptionsBattlefieldSnapshot" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mode" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "callWall" DOUBLE PRECISION,
    "putWall" DOUBLE PRECISION,
    "zeroGamma" DOUBLE PRECISION,
    "expectedMove" DOUBLE PRECISION,
    "pressureDirection" TEXT,
    "confidence" DOUBLE PRECISION,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "observedAt" TIMESTAMP(3),
    "providerTimestamp" TIMESTAMP(3),
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "revisionFlag" "RevisionFlag" NOT NULL DEFAULT 'UNKNOWN',
    "dataStatus" "DataStatus" NOT NULL DEFAULT 'PARTIAL',

    CONSTRAINT "OptionsBattlefieldSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OptionContract_optionTicker_key" ON "OptionContract"("optionTicker");
CREATE INDEX "OptionContract_underlyingTicker_expirationDate_strikePrice_idx" ON "OptionContract"("underlyingTicker", "expirationDate", "strikePrice");
CREATE INDEX "OptionContract_underlyingTicker_contractType_idx" ON "OptionContract"("underlyingTicker", "contractType");
CREATE INDEX "OptionContract_dataStatus_idx" ON "OptionContract"("dataStatus");

CREATE UNIQUE INDEX "OptionContractBar_optionTicker_date_provider_asOfDate_key" ON "OptionContractBar"("optionTicker", "date", "provider", "asOfDate");
CREATE INDEX "OptionContractBar_underlyingTicker_date_idx" ON "OptionContractBar"("underlyingTicker", "date");
CREATE INDEX "OptionContractBar_optionTicker_date_idx" ON "OptionContractBar"("optionTicker", "date");
CREATE INDEX "OptionContractBar_dataStatus_idx" ON "OptionContractBar"("dataStatus");

CREATE UNIQUE INDEX "OptionsStrikeSignal_ticker_date_expirationDate_strikePrice_mode_key" ON "OptionsStrikeSignal"("ticker", "date", "expirationDate", "strikePrice", "mode");
CREATE INDEX "OptionsStrikeSignal_ticker_date_idx" ON "OptionsStrikeSignal"("ticker", "date");
CREATE INDEX "OptionsStrikeSignal_ticker_expirationDate_idx" ON "OptionsStrikeSignal"("ticker", "expirationDate");
CREATE INDEX "OptionsStrikeSignal_mode_sourceQuality_idx" ON "OptionsStrikeSignal"("mode", "sourceQuality");
CREATE INDEX "OptionsStrikeSignal_dataStatus_idx" ON "OptionsStrikeSignal"("dataStatus");

CREATE UNIQUE INDEX "OptionsBattlefieldSnapshot_ticker_date_mode_provider_asOfDate_key" ON "OptionsBattlefieldSnapshot"("ticker", "date", "mode", "provider", "asOfDate");
CREATE INDEX "OptionsBattlefieldSnapshot_ticker_date_idx" ON "OptionsBattlefieldSnapshot"("ticker", "date");
CREATE INDEX "OptionsBattlefieldSnapshot_mode_idx" ON "OptionsBattlefieldSnapshot"("mode");
CREATE INDEX "OptionsBattlefieldSnapshot_dataStatus_idx" ON "OptionsBattlefieldSnapshot"("dataStatus");
