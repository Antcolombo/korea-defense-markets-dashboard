-- CreateTable
CREATE TABLE "StockPitch" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "shareToken" TEXT NOT NULL,
    "shareEnabled" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "StockPitch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockPitch_slug_key" ON "StockPitch"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "StockPitch_shareToken_key" ON "StockPitch"("shareToken");

-- CreateIndex
CREATE INDEX "StockPitch_ticker_idx" ON "StockPitch"("ticker");

-- CreateIndex
CREATE INDEX "StockPitch_status_idx" ON "StockPitch"("status");

-- CreateIndex
CREATE INDEX "StockPitch_shareEnabled_idx" ON "StockPitch"("shareEnabled");
