-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('REGULAR', 'WHOLESALE', 'DEALER', 'CORPORATE', 'VIP');

-- CreateEnum
CREATE TYPE "PaymentSource" AS ENUM ('INVOICE', 'CUSTOMER', 'CREDIT');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('GRN_IN', 'INVOICE_OUT', 'ADJUSTMENT', 'RETURN', 'DAMAGED', 'TRANSFER');

-- CreateEnum
CREATE TYPE "PriceChangeType" AS ENUM ('COST_UPDATE', 'SELLING_UPDATE', 'BOTH');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "customerType" "CustomerType" NOT NULL DEFAULT 'REGULAR',
ADD COLUMN     "nic" TEXT,
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "lastCostPrice" DOUBLE PRECISION,
ADD COLUMN     "lastGRNDate" TIMESTAMP(3),
ADD COLUMN     "lastGRNId" TEXT,
ADD COLUMN     "totalPurchased" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalSold" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "warrantyMonths" INTEGER;

-- CreateTable
CREATE TABLE "customer_payments" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "notes" TEXT,
    "source" "PaymentSource" NOT NULL DEFAULT 'INVOICE',
    "shopId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousStock" INTEGER NOT NULL,
    "newStock" INTEGER NOT NULL,
    "referenceId" TEXT,
    "referenceNumber" TEXT,
    "referenceType" TEXT,
    "unitPrice" DOUBLE PRECISION,
    "notes" TEXT,
    "createdBy" TEXT,
    "shopId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "changeType" "PriceChangeType" NOT NULL,
    "previousCostPrice" DOUBLE PRECISION,
    "newCostPrice" DOUBLE PRECISION,
    "previousSellingPrice" DOUBLE PRECISION,
    "newSellingPrice" DOUBLE PRECISION,
    "reason" TEXT,
    "referenceId" TEXT,
    "createdBy" TEXT,
    "shopId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_payments_customerId_idx" ON "customer_payments"("customerId");

-- CreateIndex
CREATE INDEX "customer_payments_invoiceId_idx" ON "customer_payments"("invoiceId");

-- CreateIndex
CREATE INDEX "customer_payments_shopId_idx" ON "customer_payments"("shopId");

-- CreateIndex
CREATE INDEX "stock_movements_productId_idx" ON "stock_movements"("productId");

-- CreateIndex
CREATE INDEX "stock_movements_shopId_idx" ON "stock_movements"("shopId");

-- CreateIndex
CREATE INDEX "stock_movements_createdAt_idx" ON "stock_movements"("createdAt");

-- CreateIndex
CREATE INDEX "price_history_productId_idx" ON "price_history"("productId");

-- CreateIndex
CREATE INDEX "price_history_shopId_idx" ON "price_history"("shopId");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_nic_idx" ON "customers"("nic");

-- CreateIndex
CREATE INDEX "products_serialNumber_idx" ON "products"("serialNumber");

-- AddForeignKey
ALTER TABLE "customer_payments" ADD CONSTRAINT "customer_payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
