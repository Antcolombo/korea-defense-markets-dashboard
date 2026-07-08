DROP TABLE IF EXISTS "DailyNote";
DROP TYPE IF EXISTS "NoteStatus";

CREATE TABLE "AiScan" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB,
    "sourceSnapshot" JSONB NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiScan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiScan_ticker_mode_inputHash_key" ON "AiScan"("ticker", "mode", "inputHash");
CREATE INDEX "AiScan_ticker_mode_createdAt_idx" ON "AiScan"("ticker", "mode", "createdAt");
CREATE INDEX "AiScan_status_idx" ON "AiScan"("status");
