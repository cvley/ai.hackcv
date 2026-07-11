-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleZh" TEXT,
    "summary" TEXT NOT NULL,
    "recommendation" TEXT,
    "url" TEXT NOT NULL,
    "permalink" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sources" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "selected" BOOLEAN NOT NULL DEFAULT true,
    "dailyDate" TEXT,
    "paperFields" JSONB,
    "projectFields" JSONB,
    "newsFields" JSONB,
    "attribution" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastFetch" TIMESTAMP(3),
    "fetchInterval" INTEGER NOT NULL DEFAULT 86400,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "siteName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "itemsPerDay" INTEGER NOT NULL DEFAULT 30,
    "autoSelectThreshold" INTEGER NOT NULL DEFAULT 55,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Item_url_key" ON "Item"("url");

-- CreateIndex
CREATE INDEX "Item_type_idx" ON "Item"("type");

-- CreateIndex
CREATE INDEX "Item_category_idx" ON "Item"("category");

-- CreateIndex
CREATE INDEX "Item_publishedAt_idx" ON "Item"("publishedAt");

-- CreateIndex
CREATE INDEX "Item_selected_idx" ON "Item"("selected");

-- CreateIndex
CREATE INDEX "Item_dailyDate_idx" ON "Item"("dailyDate");

-- CreateIndex
CREATE INDEX "Item_score_idx" ON "Item"("score");

-- CreateIndex
CREATE INDEX "Source_enabled_idx" ON "Source"("enabled");
