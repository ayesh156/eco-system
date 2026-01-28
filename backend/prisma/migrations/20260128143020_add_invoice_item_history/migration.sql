-- CreateEnum
CREATE TYPE "ItemHistoryAction" AS ENUM ('ADDED', 'REMOVED', 'QTY_INCREASED', 'QTY_DECREASED', 'PRICE_CHANGED');

-- CreateTable
CREATE TABLE "invoice_item_history" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "action" "ItemHistoryAction" NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "oldQuantity" INTEGER,
    "newQuantity" INTEGER,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "amountChange" DOUBLE PRECISION NOT NULL,
    "changedById" TEXT,
    "changedByName" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "shopId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_item_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_item_history_invoiceId_idx" ON "invoice_item_history"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_item_history_shopId_idx" ON "invoice_item_history"("shopId");

-- CreateIndex
CREATE INDEX "invoice_item_history_createdAt_idx" ON "invoice_item_history"("createdAt");

-- CreateIndex
CREATE INDEX "invoice_item_history_action_idx" ON "invoice_item_history"("action");
